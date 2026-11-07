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
            ["GITHUB_EVENT_NAME"] = "push", ["GITHUB_REPOSITORY_ID"] = "1", ["GITHUB_REPOSITORY_OWNER_ID"] = "2", ["RUNNER_ENVIRONMENT"] = "self-hosted",
            ["GITHUB_RUN_ID"] = "3", ["GITHUB_RUN_ATTEMPT"] = "4", ["GITHUB_ACTIONS"] = "true", ["RUNNER_TEMP"] = root,
            ["NODE_AUTH_TOKEN"] = "fixture-registry-token"
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
                    Check(url == Publisher.Registry + "@fixture%2fpackage/1.2.3", "Unexpected version confirmation endpoint");
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
                    return Response(HttpStatusCode.OK, new JsonObject { ["dist"] = new JsonObject { ["integrity"] = Mode == "confirmation" ? "wrong" : Publication.Integrity, ["attestations"] = ReplaceAttestation ? Attestation?.DeepClone() : Provenance() } }.ToJsonString());
                }
                Check(request.Method == HttpMethod.Put && url == Publisher.Registry + "@fixture%2fpackage", "Unexpected publication endpoint");
                Check(token == "fixture-registry-token", "Registry upload bearer");
                Puts++;
                var metadata = JsonNode.Parse(await request.Content.ReadAsStringAsync(ct));
                var attachment = metadata["_attachments"]["@fixture/package-1.2.3.tgz"];
                Check(Convert.FromBase64String(Publisher.Text(attachment["data"])).SequenceEqual(Publication.Bytes), "Uploaded tarball differs from verified snapshot");
                Check(((JsonObject)metadata["_attachments"]).Count == 1, "Token publication attached provenance");
                if (Mode == "put-lost") throw new HttpRequestException("fixture-secret-must-not-leak");
                return Response(Mode == "put-reject" ? HttpStatusCode.Forbidden : HttpStatusCode.Created, "{}");
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
            Check(Publisher.Text(publication.Metadata["versions"]["1.2.3"]["dist"]["integrity"]) == Integrity(file), "npm integrity");
            foreach (var shape in new[] { "array", "object" })
            {
                var item = new JsonObject { ["filename"] = Path.GetFileName(file), ["integrity"] = Integrity(file) };
                JsonNode packed = shape == "array" ? (JsonNode)new JsonArray(item) : new JsonObject { ["@fixture/package"] = item };
                var packFile = Path.Combine(root, "pack-" + shape + ".json"); File.WriteAllText(packFile, packed.ToJsonString());
                Check(Publisher.Prepare(null, null, packFile, env).Digest == publication.Digest, "Pack result shape " + shape);
                Check(Publisher.Prepare(null, "sha512-ignored", packFile, env).Digest == publication.Digest, "Prepare pack result integrity precedence " + shape);
            }
            Fails(() => Publisher.Prepare(file, "sha512-wrong", null, env), "integrity mismatch");
            foreach (var item in new[] { ("duplicate", manifest, true, "package/package.json"), ("missing", manifest, false, "other.json"), ("private", manifest.Replace("\"description\"", "\"private\":true,\"description\""), false, "package/package.json"), ("extensions", manifest.Replace("\"description\"", "\"packageExtensions\":{},\"description\""), false, "package/package.json"), ("version", manifest.Replace("1.2.3", "01.2.3"), false, "package/package.json") })
            {
                var invalid = Archive(root, item.Item1, item.Item2, item.Item3, item.Item4);
                Fails(() => Publisher.Prepare(invalid, Integrity(invalid), null, env), item.Item1 == "duplicate" ? "Duplicate" : item.Item1 == "version" ? "Invalid package" : "public npm");
            }
            var wrongContext = new Dictionary<string, string>(env); wrongContext["GITHUB_REF_NAME"] = "release/9.9.9";
            Fails(() => Publisher.Prepare(file, Integrity(file), null, wrongContext), "Release branch");

            foreach (var mode in new[] { "success", "existing", "conflict", "unknown", "redirect", "invalid-json", "empty-lookup", "null-lookup", "timeout", "put-reject", "put-lost", "confirmation" })
            {
                publication = Publisher.Prepare(file, Integrity(file), null, env);
                var handler = new RegistryHandler { Publication = publication, Mode = mode };
                using (var client = new HttpClient(handler) { Timeout = mode == "timeout" ? TimeSpan.FromMilliseconds(25) : TimeSpan.FromSeconds(5) })
                {
                    if (new[] { "success", "existing" }.Contains(mode))
                    {
                        var result = Publisher.Run(file, Integrity(file), null, false, env, client, true);
                        Check(result == (mode == "existing" ? "Already published identical archive: " : "Published verified archive with token authentication: ") + "@fixture/package@1.2.3", "Publish result");
                        Check(handler.Gets == (mode == "existing" ? 1 : 2) && handler.Calls == (mode == "existing" ? 1 : 3) && handler.Puts == (mode == "existing" ? 0 : 1), "Publication did not verify the registry or repeated PUT");
                    }
                    else Fails(() => Publisher.Run(file, Integrity(file), null, false, env, client, true), new Dictionary<string, string> { ["conflict"] = "different archive", ["unknown"] = "HTTP 503", ["redirect"] = "HTTP 302", ["invalid-json"] = "invalid JSON", ["empty-lookup"] = "no document", ["null-lookup"] = "invalid JSON", ["timeout"] = "response unknown", ["put-reject"] = "HTTP 403", ["put-lost"] = "response unknown", ["confirmation"] = "confirmation failed" }[mode]);
                    Check(handler.Puts <= 1, "Ambiguous PUT was retried");
                    if (new[] { "existing", "conflict", "unknown", "redirect", "invalid-json", "empty-lookup", "null-lookup", "timeout" }.Contains(mode)) Check(handler.Calls == 1, "Lookup failure/duplicate continued to upload");
                }
            }
            // self-hosted token publication has no provenance; old signed versions remain compatible.
            foreach (var shape in new JsonNode[] { null, new JsonObject(), JsonValue.Create("invalid"), new JsonObject { ["url"] = "https://unexpected.invalid/", ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } } })
            {
                publication = Publisher.Prepare(file, Integrity(file), null, env);
                var handler = new RegistryHandler { Publication = publication, Existing = true, ReplaceAttestation = true, Attestation = shape };
                using (var client = new HttpClient(handler))
                {
                    if (shape == null) Check(Publisher.Run(file, Integrity(file), null, false, env, client, true).StartsWith("Already published"), "Unsigned existing version rejected");
                    else Fails(() => Publisher.Run(file, Integrity(file), null, false, env, client, true), "provenance confirmation failed");
                }
                Check(handler.Puts == 0 && handler.Calls == 1, "Existing version triggered upload");
            }
            foreach (var suffix in new[] { "@fixture/package@1.2.3", "@fixture%2Fpackage@1.2.3", "%40fixture%2fpackage%401.2.3" })
                Check(Publisher.HasProvenance(new JsonObject { ["dist"] = new JsonObject { ["attestations"] = new JsonObject { ["url"] = Publisher.Registry + "-/npm/v1/attestations/" + suffix, ["provenance"] = new JsonObject { ["predicateType"] = "https://slsa.dev/provenance/v1" } } } }, "@fixture/package", "1.2.3"), "Scoped attestation URL encoding");
            foreach (var token in new[] { "", " ", "fixture\r\nsecret" })
            {
                var context = new Dictionary<string, string>(env); context["NODE_AUTH_TOKEN"] = token;
                var handler = new RegistryHandler { Publication = publication };
                using (var client = new HttpClient(handler)) Fails(() => Publisher.Run(file, Integrity(file), null, false, context, client, true), "NODE_AUTH_TOKEN or NPM_TOKEN is required");
                Check(handler.Calls == 0, "Missing token used network");
            }
            var fallback = new Dictionary<string, string>(env); fallback.Remove("NODE_AUTH_TOKEN"); fallback["NPM_TOKEN"] = "fixture-registry-token";
            var fallbackHandler = new RegistryHandler { Publication = Publisher.Prepare(file, Integrity(file), null, env) };
            using (var client = new HttpClient(fallbackHandler)) Publisher.Run(file, Integrity(file), null, false, fallback, client, true);
            Check(fallbackHandler.Puts == 1, "NPM_TOKEN fallback failed");
            var changed = Archive(root, "mutated", manifest);
            publication = Publisher.Prepare(changed, Integrity(changed), null, env);
            File.AppendAllText(changed, "changed");
            var mutationHandler = new RegistryHandler { Publication = publication };
            using (var client = new HttpClient(mutationHandler)) Fails(() => Publisher.Publish(publication, env, client, true).GetAwaiter().GetResult(), "Archive changed");
            Check(mutationHandler.Puts == 0, "Changed archive uploaded");
            var offline = new RegistryHandler { Publication = publication };
            using (var client = new HttpClient(offline)) Fails(() => Publisher.Publish(publication, env, client, false).GetAwaiter().GetResult(), "Linux Actions");
            Check(offline.Calls == 0, "Unsupported runner used network");
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
