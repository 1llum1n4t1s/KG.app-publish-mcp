using System;
using System.Collections.Generic;
using System.Formats.Tar;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

namespace Kagayoi.Npm
{
    // 非loopback通信は自前proxyでHTTP/CONNECTとも403にする。例外だけのproxyは使わない。
    public sealed class LoopbackNetworkGuard : IWebProxy, IDisposable
    {
        private readonly IWebProxy previous;
        private readonly TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
        private readonly CancellationTokenSource stop = new CancellationTokenSource();
        private readonly Uri proxy;
        private readonly Task server;
        private int received;
        public ICredentials Credentials { get; set; }
        public bool IsBypassed(Uri destination) => destination.IsLoopback;
        public Uri GetProxy(Uri destination) => destination.IsLoopback ? destination : proxy;
        public LoopbackNetworkGuard()
        {
            previous = HttpClient.DefaultProxy;
            listener.Start();
            proxy = new Uri("http://127.0.0.1:" + ((IPEndPoint)listener.LocalEndpoint).Port);
            server = Task.Run(async () =>
            {
                while (!stop.IsCancellationRequested)
                {
                    try
                    {
                        using (var socket = await listener.AcceptTcpClientAsync(stop.Token))
                        using (var stream = socket.GetStream())
                        using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(stop.Token))
                        {
                            deadline.CancelAfter(TimeSpan.FromSeconds(3));
                            var bytes = new byte[8192];
                            await stream.ReadAsync(bytes.AsMemory(), deadline.Token);
                            Interlocked.Increment(ref received);
                            var response = Encoding.ASCII.GetBytes("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            await stream.WriteAsync(response.AsMemory(), deadline.Token);
                        }
                    }
                    catch (OperationCanceledException) { }
                    catch (ObjectDisposedException) when (stop.IsCancellationRequested) { }
                    catch (SocketException) when (stop.IsCancellationRequested) { }
                    catch (IOException) { }
                }
            });
            HttpClient.DefaultProxy = this;
        }
        public string Verify()
        {
            using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) })
            {
                using (var response = client.GetAsync("http://npm-fixture-network-guard.invalid/").GetAwaiter().GetResult())
                    if (response.StatusCode != HttpStatusCode.Forbidden) throw new Exception("HTTP network guard did not reject the probe");
                var rejected = false;
                try { using (var response = client.GetAsync("https://npm-fixture-network-guard.invalid/").GetAwaiter().GetResult()) { } }
                catch (HttpRequestException) { rejected = true; }
                if (!rejected || Volatile.Read(ref received) != 2) throw new Exception("CONNECT network guard did not receive and reject the probe");
            }
            return "Network guard: HTTP/CONNECT negative probes received and rejected; loopback bypass enabled";
        }
        public void Dispose()
        {
            HttpClient.DefaultProxy = previous;
            stop.Cancel(); listener.Stop();
            if (!server.Wait(TimeSpan.FromSeconds(5))) throw new Exception("Network guard did not stop");
            stop.Dispose();
        }
    }

    // 実資格情報・外部ネットワーク・実cosignを使わず、公開境界を通す契約試験。
    public static class ContractTests
    {
        private static int assertions;
        private static void Check(bool value, string message) { assertions++; if (!value) throw new Exception(message); }
        private static void Fails(Action action, string fragment)
        {
            try { action(); } catch (Exception error) { Check(error.Message.Contains(fragment, StringComparison.Ordinal), "Unexpected failure: " + error.Message); return; }
            throw new Exception("Expected failure: " + fragment);
        }
        private static Dictionary<string, string> Context(string root) => new Dictionary<string, string>
        {
            ["GITHUB_SERVER_URL"] = "https://github.com", ["GITHUB_REPOSITORY"] = "fixture/package", ["GITHUB_WORKFLOW_REF"] = "fixture/package/.github/workflows/publish.yml@refs/heads/release/1.2.3",
            ["GITHUB_REF"] = "refs/heads/release/1.2.3", ["GITHUB_REF_NAME"] = "release/1.2.3", ["GITHUB_SHA"] = new string('a', 40),
            ["GITHUB_EVENT_NAME"] = "push", ["GITHUB_REPOSITORY_ID"] = "1", ["GITHUB_REPOSITORY_OWNER_ID"] = "2", ["RUNNER_ENVIRONMENT"] = "github-hosted",
            ["GITHUB_RUN_ID"] = "3", ["GITHUB_RUN_ATTEMPT"] = "4", ["GITHUB_ACTIONS"] = "true", ["RUNNER_TEMP"] = root,
            ["ACTIONS_ID_TOKEN_REQUEST_URL"] = "https://fixture.actions.githubusercontent.com/idtoken?api-version=1", ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"] = "fixture-request-token"
        };
        private static string Archive(string root, string filename, string manifest, bool duplicate = false, string entryName = "package/package.json")
        {
            var file = Path.Combine(root, filename + ".tgz");
            using (var output = File.Create(file))
            using (var gzip = new GZipStream(output, CompressionLevel.SmallestSize))
            using (var writer = new TarWriter(gzip))
                for (var i = 0; i < (duplicate ? 2 : 1); i++)
                    using (var content = new MemoryStream(Encoding.UTF8.GetBytes(manifest)))
                        writer.WriteEntry(new PaxTarEntry(TarEntryType.RegularFile, entryName) { DataStream = content });
            return file;
        }
        private static string Integrity(string file) => "sha512-" + Convert.ToBase64String(SHA512.HashData(File.ReadAllBytes(file)));
        private static string Bundle(Publication publication, bool wrongSubject = false)
        {
            var statement = publication.Statement.DeepClone();
            if (wrongSubject) statement["subject"][0]["digest"]["sha512"] = "wrong";
            return new JsonObject { ["mediaType"] = "application/vnd.dev.sigstore.bundle.v0.3+json", ["dsseEnvelope"] = new JsonObject { ["payload"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(statement.ToJsonString())) } }.ToJsonString();
        }
        private sealed class Signer : ISigner
        {
            public int Calls;
            public string Mode = "success";
            public Task<string> Sign(Publication publication, IDictionary<string, string> env)
            {
                Calls++;
                if (Mode == "fail") throw new InvalidOperationException("fixture signer failed");
                if (Mode == "mutate") File.AppendAllText(publication.PackageFile, "changed");
                return Task.FromResult(Bundle(publication, Mode == "subject"));
            }
        }
        private sealed class RegistryHandler : HttpMessageHandler
        {
            public Publication Publication;
            public int Gets, Puts, Calls;
            public string Mode = "success";
            public bool Existing, ReplaceAttestation;
            public JsonNode Attestation;
            public readonly List<string> Methods = new List<string>();
            private static JsonNode Provenance() => new JsonObject
            {
                ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/@fixture%2fpackage@1.2.3",
                ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" }
            };
            private static HttpResponseMessage Response(HttpStatusCode status, string body) => new HttpResponseMessage(status) { Content = new StringContent(body) };
            protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            {
                Calls++; Methods.Add(request.Method.Method);
                var url = request.RequestUri.AbsoluteUri;
                var token = request.Headers.Authorization?.Parameter ?? "";
                if (request.Method == HttpMethod.Get && request.RequestUri.Host == "registry.npmjs.org")
                {
                    Gets++;
                    Check(token == "", "Registry lookup leaked bearer token");
                    if (Gets == 1)
                    {
                        if (Mode == "existing" || Mode == "conflict" || Existing) return Response(HttpStatusCode.OK, new JsonObject { ["dist"] = new JsonObject { ["integrity"] = Mode == "conflict" ? "wrong" : Publication.Integrity, ["attestations"] = ReplaceAttestation ? Attestation?.DeepClone() : Provenance() } }.ToJsonString());
                        if (Mode == "unknown") return Response(HttpStatusCode.ServiceUnavailable, "{}");
                        if (Mode == "redirect") return new HttpResponseMessage(HttpStatusCode.Found) { Headers = { Location = new Uri("https://unexpected.invalid/") } };
                        if (Mode == "invalid-json") return Response(HttpStatusCode.OK, "invalid");
                        if (Mode == "empty-lookup") return Response(HttpStatusCode.OK, "");
                        if (Mode == "null-lookup") return Response(HttpStatusCode.OK, "null");
                        if (Mode == "timeout") { await Task.Delay(Timeout.Infinite, ct); }
                        return Response(HttpStatusCode.NotFound, "{}");
                    }
                    return Response(HttpStatusCode.OK, new JsonObject { ["dist"] = new JsonObject { ["integrity"] = Publication.Integrity, ["attestations"] = Mode == "confirmation" ? null : ReplaceAttestation ? Attestation?.DeepClone() : Provenance() } }.ToJsonString());
                }
                if (request.RequestUri.Host.EndsWith(".actions.githubusercontent.com", StringComparison.Ordinal))
                {
                    Check(token == "fixture-request-token" && request.Method == HttpMethod.Get, "OIDC request authentication");
                    Check(request.RequestUri.Query.Contains("audience=npm%3Aregistry.npmjs.org", StringComparison.OrdinalIgnoreCase), "OIDC audience");
                    return Response(HttpStatusCode.OK, Mode == "oidc-empty" ? "{}" : "{\"value\":\"fixture-identity\"}");
                }
                if (request.Method == HttpMethod.Post)
                {
                    Check(url == Publisher.Registry + "-/npm/v1/oidc/token/exchange/package/@fixture%2fpackage", "OIDC exchange endpoint");
                    Check(token == "fixture-identity", "OIDC exchange bearer");
                    return Response(HttpStatusCode.OK, Mode == "exchange-empty" ? "{}" : "{\"token\":\"fixture-registry-token\"}");
                }
                Check(request.Method == HttpMethod.Put && url == Publisher.Registry + "@fixture%2fpackage", "Unexpected publication endpoint");
                Check(token == "fixture-registry-token", "Registry upload bearer");
                Puts++;
                var metadata = JsonNode.Parse(await request.Content.ReadAsStringAsync(ct));
                var attachment = metadata["_attachments"]["@fixture/package-1.2.3.tgz"];
                Check(Convert.FromBase64String(Publisher.Text(attachment["data"])).SequenceEqual(Publication.Bytes), "Uploaded tarball differs from verified snapshot");
                Check(metadata["_attachments"]["@fixture/package-1.2.3.sigstore"] != null, "Missing provenance attachment");
                if (Mode == "put-lost") throw new HttpRequestException("fixture-secret-must-not-leak");
                return Response(Mode == "put-reject" ? HttpStatusCode.Forbidden : HttpStatusCode.Created, "{}");
            }
        }
        private sealed class Commands : ICommandRunner
        {
            public readonly List<string[]> Calls = new List<string[]>();
            public int FailAt;
            public int Run(string executable, params string[] arguments)
            {
                Calls.Add(arguments);
                if (Calls.Count == FailAt) return 9;
                if (arguments[0] == "attest-blob")
                {
                    var statement = File.ReadAllText(arguments[Array.IndexOf(arguments, "--statement") + 1]);
                    var bundle = new JsonObject { ["mediaType"] = "application/vnd.dev.sigstore.bundle.v0.3+json", ["dsseEnvelope"] = new JsonObject { ["payload"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(statement)) } };
                    File.WriteAllText(arguments[Array.IndexOf(arguments, "--bundle") + 1], bundle.ToJsonString());
                }
                return 0;
            }
        }
        private sealed class DownloadHandler : HttpMessageHandler
        {
            public readonly byte[] Binary = Encoding.UTF8.GetBytes("fixture cosign binary");
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            {
                Check(request.Headers.Authorization == null, "Download leaked bearer token");
                Check(request.RequestUri.AbsoluteUri == NativeSigner.ReleaseUrl || request.RequestUri.AbsoluteUri == NativeSigner.ReleaseUrl + ".sigstore.json", "Unpinned cosign URL");
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(request.RequestUri.AbsoluteUri.EndsWith(".json", StringComparison.Ordinal) ? Encoding.UTF8.GetBytes("{}") : Binary) });
            }
        }

        public static string Run(string workDirectory)
        {
            assertions = 0;
            var root = Path.GetFullPath(workDirectory);
            Directory.CreateDirectory(root);
            var env = Context(root);
            const string manifest = "{\"name\":\"@fixture/package\",\"version\":\"1.2.3\",\"description\":\"fixture 日本語\",\"patchedDependencies\":{\"x\":\"patch\"}}";
            var file = Archive(root, "valid", manifest);
            var publication = Publisher.Prepare(file, Integrity(file), null, env);
            Check(publication.Metadata["versions"]["1.2.3"]["patchedDependencies"] == null, "patchedDependencies retained");
            Check(Publisher.Text(publication.Statement["subject"][0]["name"]) == "pkg:npm/%40fixture/package@1.2.3", "Scoped package purl");
            Check(Publisher.Text(publication.Statement["predicate"]["buildDefinition"]["externalParameters"]["workflow"]["path"]) == ".github/workflows/publish.yml", "Workflow path");
            Check(Publisher.Text(publication.Metadata["versions"]["1.2.3"]["dist"]["integrity"]) == Integrity(file), "npm integrity");
            foreach (var shape in new[] { "array", "object" })
            {
                var item = new JsonObject { ["filename"] = Path.GetFileName(file), ["integrity"] = Integrity(file) };
                JsonNode packed = shape == "array" ? (JsonNode)new JsonArray(item) : new JsonObject { ["@fixture/package"] = item };
                var packFile = Path.Combine(root, "pack-" + shape + ".json"); File.WriteAllText(packFile, packed.ToJsonString());
                Check(Publisher.Prepare(null, null, packFile, env).Digest == publication.Digest, "Pack result shape " + shape);
            }
            Fails(() => Publisher.Prepare(file, "sha512-wrong", null, env), "integrity mismatch");
            foreach (var item in new[] { ("duplicate", manifest, true, "package/package.json"), ("missing", manifest, false, "other.json"), ("private", manifest.Replace("\"description\"", "\"private\":true,\"description\""), false, "package/package.json"), ("extensions", manifest.Replace("\"description\"", "\"packageExtensions\":{},\"description\""), false, "package/package.json"), ("version", manifest.Replace("1.2.3", "01.2.3"), false, "package/package.json") })
            {
                var invalid = Archive(root, item.Item1, item.Item2, item.Item3, item.Item4);
                Fails(() => Publisher.Prepare(invalid, Integrity(invalid), null, env), item.Item1 == "duplicate" ? "Duplicate" : item.Item1 == "version" ? "Invalid package" : "public npm");
            }
            var wrongContext = new Dictionary<string, string>(env); wrongContext["GITHUB_REF_NAME"] = "release/9.9.9";
            Fails(() => Publisher.Prepare(file, Integrity(file), null, wrongContext), "Release branch");
            wrongContext = new Dictionary<string, string>(env); wrongContext["GITHUB_WORKFLOW_REF"] = "other/repo/.github/workflows/publish.yml@main";
            Fails(() => Publisher.Prepare(file, Integrity(file), null, wrongContext), "workflow identity");

            foreach (var mode in new[] { "success", "existing", "conflict", "unknown", "redirect", "invalid-json", "empty-lookup", "null-lookup", "timeout", "oidc-empty", "exchange-empty", "put-reject", "put-lost", "confirmation", "subject", "fail" })
            {
                publication = Publisher.Prepare(file, Integrity(file), null, env);
                var handler = new RegistryHandler { Publication = publication, Mode = mode };
                using (var client = new HttpClient(handler) { Timeout = mode == "timeout" ? TimeSpan.FromMilliseconds(25) : TimeSpan.FromSeconds(5) })
                {
                    var signer = new Signer { Mode = mode };
                    if (mode == "success" || mode == "existing") Check(Publisher.Run(file, Integrity(file), null, false, env, client, signer, true).Contains("archive", StringComparison.Ordinal), "Publish result");
                    else Fails(() => Publisher.Run(file, Integrity(file), null, false, env, client, signer, true), new Dictionary<string, string> { ["conflict"] = "different archive", ["unknown"] = "HTTP 503", ["redirect"] = "HTTP 302", ["invalid-json"] = "invalid JSON", ["empty-lookup"] = "no document", ["null-lookup"] = "invalid JSON", ["timeout"] = "response unknown", ["oidc-empty"] = "no identity token", ["exchange-empty"] = "no token", ["put-reject"] = "HTTP 403", ["put-lost"] = "response unknown", ["confirmation"] = "confirmation failed", ["subject"] = "subject mismatch", ["fail"] = "signer failed" }[mode]);
                    Check(handler.Puts <= 1, "Ambiguous PUT was retried");
                    if (new[] { "existing", "conflict", "unknown", "redirect", "invalid-json", "empty-lookup", "null-lookup", "timeout" }.Contains(mode)) Check(handler.Calls == 1 && signer.Calls == 0, "Lookup failure/duplicate continued to credentials or signing");
                    if (mode == "subject" || mode == "fail") Check(handler.Puts == 0, "Signing failure uploaded package");
                    if (mode == "put-lost" || mode == "put-reject") Check(handler.Gets == 1, "Rejected/unknown PUT incorrectly confirmed");
                }
            }
            foreach (var url in new[] { "http://fixture.actions.githubusercontent.com/token", "https://actions.githubusercontent.com.attacker.invalid/token", "https://registry.npmjs.org/token" })
            {
                var context = new Dictionary<string, string>(env); context["ACTIONS_ID_TOKEN_REQUEST_URL"] = url;
                var handler = new RegistryHandler { Publication = publication };
                using (var client = new HttpClient(handler)) Fails(() => Publisher.Publish(publication, context, client, new Signer(), true).GetAwaiter().GetResult(), "Unexpected GitHub OIDC");
                Check(handler.Calls == 1, "Unexpected OIDC host received request");
            }
            // PUT後の確認に失敗した版を再実行しても、未確認provenanceで成功扱いにしない。
            foreach (var shape in new JsonNode[]
            {
                null, new JsonObject(), JsonValue.Create("invalid"), JsonValue.Create(true), new JsonArray(),
                new JsonObject { ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/fixture", ["publish"] = new JsonObject { ["predicateType"] = "https://github.com/npm/attestation/tree/main/specs/publish/v0.1" } },
                new JsonObject { ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/fixture", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v0.2" } },
                new JsonObject { ["url"] = "https://unexpected.invalid/-/npm/v1/attestations/fixture", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } },
                new JsonObject { ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } },
                new JsonObject { ["url"] = "https://registry.npmjs.org/other", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } },
                new JsonObject { ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/@other%2fpackage@1.2.3", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } },
                new JsonObject { ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/@fixture%2fpackage@9.9.9", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } },
                new JsonObject { ["url"] = "https://registry.npmjs.org/-/npm/v1/attestations/@fixture%252fpackage@1.2.3", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } }
            })
            {
                foreach (var existing in new[] { false, true })
                {
                    publication = Publisher.Prepare(file, Integrity(file), null, env);
                    var handler = new RegistryHandler { Publication = publication, Existing = existing, ReplaceAttestation = true, Attestation = shape };
                    var signer = new Signer();
                    using (var client = new HttpClient(handler)) Fails(() => Publisher.Run(file, Integrity(file), null, false, env, client, signer, true), "provenance confirmation failed");
                    Check(handler.Puts == (existing ? 0 : 1), "Missing provenance triggered another upload");
                    Check(signer.Calls == (existing ? 0 : 1), "Existing version triggered credential/signing workflow");
                    if (existing) Check(handler.Calls == 1, "Existing version used credentials or extra requests");
                }
            }
            foreach (var suffix in new[] { "@fixture/package@1.2.3", "@fixture%2Fpackage@1.2.3", "%40fixture%2fpackage%401.2.3" })
                Check(Publisher.HasProvenance(new JsonObject { ["dist"] = new JsonObject { ["attestations"] = new JsonObject { ["url"] = Publisher.Registry + "-/npm/v1/attestations/" + suffix, ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } } } }, "@fixture/package", "1.2.3"), "Scoped attestation URL encoding");
            var changed = Archive(root, "mutated", manifest);
            publication = Publisher.Prepare(changed, Integrity(changed), null, env);
            var mutationHandler = new RegistryHandler { Publication = publication };
            using (var client = new HttpClient(mutationHandler)) Fails(() => Publisher.Publish(publication, env, client, new Signer { Mode = "mutate" }, true).GetAwaiter().GetResult(), "Archive changed");
            Check(mutationHandler.Puts == 0, "Changed archive uploaded");
            var offline = new RegistryHandler { Publication = publication };
            using (var client = new HttpClient(offline)) Fails(() => Publisher.Publish(publication, env, client, new Signer(), false).GetAwaiter().GetResult(), "GitHub-hosted Linux");
            Check(offline.Calls == 0, "Unsupported runner used network");

            publication = Publisher.Prepare(file, Integrity(file), null, env);
            for (var failAt = 0; failAt <= 3; failAt++)
            {
                var downloader = new DownloadHandler(); var commands = new Commands { FailAt = failAt };
                using (var client = new HttpClient(downloader))
                {
                    var signer = new NativeSigner(client, commands, Convert.ToHexString(SHA256.HashData(downloader.Binary)));
                    if (failAt == 0) Check(Publisher.Text(JsonNode.Parse(signer.Sign(publication, env).GetAwaiter().GetResult())["mediaType"]) != "", "Native bundle");
                    else Fails(() => signer.Sign(publication, env).GetAwaiter().GetResult(), failAt == 1 ? "release signature" : failAt == 2 ? "signing failed" : "identity/digest");
                    Check(commands.Calls.Count == (failAt == 0 ? 3 : failAt), "cosign failure continued to next phase");
                    Check(commands.Calls[0].Contains("https://accounts.google.com") && commands.Calls[0].Contains("keyless@projectsigstore.iam.gserviceaccount.com"), "Release signature identity");
                    if (failAt == 0) Check(commands.Calls[2].Contains(publication.Digest) && commands.Calls[2].Contains("https://github.com/" + env["GITHUB_WORKFLOW_REF"]) && commands.Calls[2].Contains("https://token.actions.githubusercontent.com"), "Provenance identity/digest arguments");
                }
            }
            using (var client = new HttpClient(new DownloadHandler()))
            {
                var commands = new Commands();
                Fails(() => new NativeSigner(client, commands).Sign(publication, env).GetAwaiter().GetResult(), "checksum mismatch");
                Check(commands.Calls.Count == 0, "Unverified cosign executed");
            }
            VerifyRedirectBoundary();
            return "npm publisher contracts passed: " + assertions + " assertions";
        }

        private static void VerifyRedirectBoundary()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
            try
            {
                var endpoint = (IPEndPoint)listener.LocalEndpoint;
                var server = Task.Run(async () =>
                {
                    using (var socket = await listener.AcceptTcpClientAsync())
                    using (var stream = socket.GetStream())
                    {
                        var buffer = new byte[8192]; await stream.ReadAsync(buffer, 0, buffer.Length);
                        var response = Encoding.ASCII.GetBytes("HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1:" + endpoint.Port + "/redirected\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        await stream.WriteAsync(response, 0, response.Length);
                    }
                });
                using (var client = Publisher.CreateRegistryClient())
                {
                    Check(client.Timeout == TimeSpan.FromMinutes(3), "Registry timeout");
                    client.Timeout = TimeSpan.FromSeconds(3);
                    Fails(() => Publisher.Send(client, "GET", "http://127.0.0.1:" + endpoint.Port + "/", "fixture-token").GetAwaiter().GetResult(), "HTTP 302");
                }
                Check(server.Wait(TimeSpan.FromSeconds(5)), "Local redirect fixture did not finish");
                Check(!listener.Pending(), "Bearer request followed redirect");
            }
            finally { listener.Stop(); }
        }
    }
}
