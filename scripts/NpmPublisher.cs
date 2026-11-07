using System;
using System.Collections.Generic;
using System.Formats.Tar;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Kagayoi.Npm
{
    // 公開処理はPowerShell同梱の.NETだけを使う。Node/npmや.NET SDKは不要。
    public static class Publisher
    {
        internal const string Registry = "https://registry.npmjs.org/";
        internal static string Value(IDictionary<string, string> env, string key) => env.TryGetValue(key, out var value) ? value : "";
        internal static string Text(JsonNode node) => node is JsonValue value && value.TryGetValue<string>(out var text) ? text : "";
        internal static void Require(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }

        public static string Run(string packageFile, string expectedIntegrity, string packResultPath, bool prepareOnly)
        {
            var env = Environment.GetEnvironmentVariables().Cast<System.Collections.DictionaryEntry>()
                .ToDictionary(entry => (string)entry.Key, entry => (string)entry.Value, StringComparer.Ordinal);
            using (var client = CreateRegistryClient())
            using (var download = new HttpClient())
                return Run(packageFile, expectedIntegrity, packResultPath, prepareOnly, env, client, new NativeSigner(download, new ProcessRunner()), OperatingSystem.IsLinux());
        }

        internal static HttpClient CreateRegistryClient() => new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromMinutes(3) };

        // registryのprovenance掲載情報を確認する。bundle署名の暗号検証とは別の境界。
        // npm/cli#9048 および npm/pacote/lib/registry.js のattestations構造に従う。
        internal static bool HasProvenance(JsonNode document, string name, string version)
        {
            if (!(document is JsonObject root && root["dist"] is JsonObject dist &&
                dist["attestations"] is JsonObject attestations && attestations["provenance"] is JsonObject provenance &&
                Text(provenance["predicateType"]) == "https://slsa.dev/provenance/v1")) return false;
            Uri url;
            return Uri.TryCreate(Text(attestations["url"]), UriKind.Absolute, out url) && url.Scheme == "https" &&
                url.Host.Equals("registry.npmjs.org", StringComparison.OrdinalIgnoreCase) && url.IsDefaultPort &&
                string.IsNullOrEmpty(url.UserInfo) && string.IsNullOrEmpty(url.Query) && string.IsNullOrEmpty(url.Fragment) &&
                Uri.UnescapeDataString(url.AbsolutePath) == "/-/npm/v1/attestations/" + name + "@" + version;
        }

        // 実入口と契約試験は同じ読込み・検証・公開経路を使い、外部境界だけを注入する。
        internal static string Run(string packageFile, string expectedIntegrity, string packResultPath, bool prepareOnly, IDictionary<string, string> env, HttpClient client, ISigner signer, bool isLinux)
        {
            var publication = Prepare(packageFile, expectedIntegrity, packResultPath, env);
            if (prepareOnly) return new JsonObject { ["Metadata"] = publication.Metadata.DeepClone(), ["Statement"] = publication.Statement.DeepClone() }.ToJsonString();
            return Publish(publication, env, client, signer, isLinux).GetAwaiter().GetResult();
        }

        internal static Publication Prepare(string packageFile, string expectedIntegrity, string packResultPath, IDictionary<string, string> env)
        {
            if (!string.IsNullOrEmpty(packResultPath))
            {
                var packed = JsonNode.Parse(File.ReadAllText(packResultPath));
                var items = packed is JsonArray array ? array.ToArray() : packed is JsonObject map ? map.Select(pair => pair.Value).ToArray() : Array.Empty<JsonNode>();
                Require(items.Length == 1, "Expected exactly one verified npm pack result.");
                packageFile = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(packResultPath)), Text(items[0]?["filename"]));
                expectedIntegrity = Text(items[0]?["integrity"]);
            }
            Require(!string.IsNullOrEmpty(packageFile) && !string.IsNullOrEmpty(expectedIntegrity), "PackageFile and ExpectedIntegrity are required.");
            var bytes = File.ReadAllBytes(Path.GetFullPath(packageFile));
            var sha512 = SHA512.HashData(bytes);
            var integrity = "sha512-" + Convert.ToBase64String(sha512);
            Require(integrity == expectedIntegrity, "Verified archive integrity mismatch.");
            var digest = Convert.ToHexString(sha512).ToLowerInvariant();
            JsonObject manifest = null;
            using (var memory = new MemoryStream(bytes, false))
            using (var gzip = new GZipStream(memory, CompressionMode.Decompress))
            using (var reader = new TarReader(gzip))
            {
                TarEntry entry;
                while ((entry = reader.GetNextEntry()) != null)
                {
                    if (entry.Name != "package/package.json") continue;
                    Require(manifest == null, "Duplicate package manifest in archive.");
                    Require(entry.DataStream != null, "Package manifest is not a regular file.");
                    using (var text = new StreamReader(entry.DataStream, Encoding.UTF8, true, 1024, true))
                        manifest = JsonNode.Parse(text.ReadToEnd()) as JsonObject;
                    Require(manifest != null, "Archive manifest must be an object.");
                }
            }
            Require(manifest != null && (manifest["private"] == null || manifest["private"].ToJsonString() == "false") && !manifest.ContainsKey("packageExtensions"), "Archive is not a public npm package.");
            var name = Text(manifest["name"]);
            var version = Text(manifest["version"]);
            Require(Regex.IsMatch(name, @"^(@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$") && Regex.IsMatch(version, @"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$"), "Invalid package name or release version.");
            var refName = Value(env, "GITHUB_REF_NAME");
            Require(!refName.StartsWith("release/", StringComparison.OrdinalIgnoreCase) || refName == "release/" + version, "Release branch and archive version differ.");
            foreach (var key in new[] { "GITHUB_SERVER_URL", "GITHUB_REPOSITORY", "GITHUB_WORKFLOW_REF", "GITHUB_REF", "GITHUB_SHA", "GITHUB_EVENT_NAME", "GITHUB_REPOSITORY_ID", "GITHUB_REPOSITORY_OWNER_ID", "RUNNER_ENVIRONMENT", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT" })
                Require(!string.IsNullOrEmpty(Value(env, key)), "Missing GitHub provenance context: " + key);
            Require(Value(env, "GITHUB_SERVER_URL") == "https://github.com", "Only github.com hosted provenance is supported.");
            var repo = Value(env, "GITHUB_REPOSITORY");
            var identity = Value(env, "GITHUB_WORKFLOW_REF");
            Require(identity.StartsWith(repo + "/", StringComparison.Ordinal), "Invalid workflow identity.");
            var relativeRef = identity.Substring(repo.Length + 1);
            var separator = relativeRef.IndexOf('@');
            Require(separator > 0 && separator < relativeRef.Length - 1, "Invalid workflow identity.");
            var statement = new JsonObject
            {
                ["_type"] = "https://in-toto.io/Statement/v1",
                ["subject"] = new JsonArray(new JsonObject { ["name"] = "pkg:npm/" + name.Replace("@", "%40") + "@" + version, ["digest"] = new JsonObject { ["sha512"] = digest } }),
                ["predicateType"] = "https://slsa.dev/provenance/v1",
                ["predicate"] = new JsonObject
                {
                    ["buildDefinition"] = new JsonObject
                    {
                        ["buildType"] = "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
                        ["externalParameters"] = new JsonObject { ["workflow"] = new JsonObject { ["ref"] = relativeRef.Substring(separator + 1), ["repository"] = "https://github.com/" + repo, ["path"] = relativeRef.Substring(0, separator) } },
                        ["internalParameters"] = new JsonObject { ["github"] = new JsonObject { ["event_name"] = Value(env, "GITHUB_EVENT_NAME"), ["repository_id"] = Value(env, "GITHUB_REPOSITORY_ID"), ["repository_owner_id"] = Value(env, "GITHUB_REPOSITORY_OWNER_ID") } },
                        ["resolvedDependencies"] = new JsonArray(new JsonObject { ["uri"] = "git+https://github.com/" + repo + "@" + Value(env, "GITHUB_REF"), ["digest"] = new JsonObject { ["gitCommit"] = Value(env, "GITHUB_SHA") } })
                    },
                    ["runDetails"] = new JsonObject
                    {
                        ["builder"] = new JsonObject { ["id"] = "https://github.com/actions/runner/" + Value(env, "RUNNER_ENVIRONMENT") },
                        ["metadata"] = new JsonObject { ["invocationId"] = "https://github.com/" + repo + "/actions/runs/" + Value(env, "GITHUB_RUN_ID") + "/attempts/" + Value(env, "GITHUB_RUN_ATTEMPT") }
                    }
                }
            };
            var tarballName = name + "-" + version + ".tgz";
            manifest["_id"] = name + "@" + version;
            manifest.Remove("patchedDependencies");
            manifest["dist"] = new JsonObject { ["integrity"] = integrity, ["shasum"] = Convert.ToHexString(SHA1.HashData(bytes)).ToLowerInvariant(), ["tarball"] = Registry + name + "/-/" + tarballName };
            var metadata = new JsonObject
            {
                ["_id"] = name, ["name"] = name, ["description"] = manifest["description"]?.DeepClone(), ["access"] = "public",
                ["dist-tags"] = new JsonObject { ["latest"] = version }, ["versions"] = new JsonObject { [version] = manifest },
                ["_attachments"] = new JsonObject { [tarballName] = new JsonObject { ["content_type"] = "application/octet-stream", ["data"] = Convert.ToBase64String(bytes), ["length"] = bytes.Length } }
            };
            return new Publication { PackageFile = packageFile, Bytes = bytes, Integrity = integrity, Digest = digest, Name = name, Version = version, Statement = statement, Metadata = metadata };
        }

        internal static async Task<JsonNode> Send(HttpClient client, string method, string url, string token, JsonNode body = null, bool allowMissing = false)
        {
            using (var request = new HttpRequestMessage(new HttpMethod(method), url))
            {
                if (!string.IsNullOrEmpty(token)) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                if (body != null) request.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
                HttpResponseMessage response;
                try { response = await client.SendAsync(request).ConfigureAwait(false); }
                catch { throw new InvalidOperationException("Native npm request failed (" + method + "); response unknown. Inspect registry before retrying."); }
                using (response)
                {
                    if (allowMissing && response.StatusCode == HttpStatusCode.NotFound) return null;
                    Require(response.IsSuccessStatusCode, "Native npm request rejected (" + method + " HTTP " + (int)response.StatusCode + ").");
                    var text = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    if (string.IsNullOrEmpty(text))
                    {
                        Require(!allowMissing, "Native npm version lookup returned no document.");
                        return null;
                    }
                    try
                    {
                        var value = JsonNode.Parse(text);
                        Require(!allowMissing || value != null, "Native npm version lookup returned no document.");
                        return value;
                    }
                    catch { throw new InvalidOperationException("Native npm response contained invalid JSON (" + method + ")."); }
                }
            }
        }

        internal static async Task<string> Publish(Publication publication, IDictionary<string, string> env, HttpClient client, ISigner signer, bool isLinux)
        {
            Require(isLinux && Value(env, "GITHUB_ACTIONS") == "true" && Value(env, "RUNNER_ENVIRONMENT") == "github-hosted", "Publication requires a GitHub-hosted Linux Actions runner.");
            var escapedName = publication.Name.Replace("/", "%2f");
            var versionUrl = Registry + escapedName + "/" + publication.Version;
            var existing = await Send(client, "GET", versionUrl, "", allowMissing: true).ConfigureAwait(false);
            if (existing != null)
            {
                Require(Text(existing["dist"]?["integrity"]) == publication.Integrity, "Published version has different archive integrity.");
                Require(HasProvenance(existing, publication.Name, publication.Version), "Published npm archive/provenance confirmation failed.");
                return "Already published identical archive: " + publication.Name + "@" + publication.Version;
            }
            Require(!string.IsNullOrEmpty(Value(env, "ACTIONS_ID_TOKEN_REQUEST_URL")) && !string.IsNullOrEmpty(Value(env, "ACTIONS_ID_TOKEN_REQUEST_TOKEN")), "GitHub id-token: write is required.");
            Uri oidc;
            Require(Uri.TryCreate(Value(env, "ACTIONS_ID_TOKEN_REQUEST_URL"), UriKind.Absolute, out oidc) && oidc.Scheme == "https" && oidc.Host.EndsWith(".actions.githubusercontent.com", StringComparison.OrdinalIgnoreCase), "Unexpected GitHub OIDC endpoint.");
            var builder = new UriBuilder(oidc) { Query = oidc.Query.TrimStart('?') + "&audience=npm%3Aregistry.npmjs.org" };
            var identity = await Send(client, "GET", builder.Uri.AbsoluteUri, Value(env, "ACTIONS_ID_TOKEN_REQUEST_TOKEN")).ConfigureAwait(false);
            Require(!string.IsNullOrEmpty(Text(identity?["value"])), "GitHub OIDC returned no identity token.");
            var exchange = await Send(client, "POST", Registry + "-/npm/v1/oidc/token/exchange/package/" + escapedName, Text(identity["value"])).ConfigureAwait(false);
            Require(!string.IsNullOrEmpty(Text(exchange?["token"])), "npm OIDC exchange returned no token.");
            var bundleText = await signer.Sign(publication, env).ConfigureAwait(false);
            var bundle = JsonNode.Parse(bundleText);
            var signed = JsonNode.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(Text(bundle?["dsseEnvelope"]?["payload"]))));
            var subjects = signed?["subject"] as JsonArray;
            Require(subjects != null && subjects.Count == 1 && Text(subjects[0]?["name"]) == Text(publication.Statement["subject"]?[0]?["name"]) && Text(subjects[0]?["digest"]?["sha512"]) == publication.Digest, "Signed npm provenance subject mismatch.");
            publication.Metadata["_attachments"][publication.Name + "-" + publication.Version + ".sigstore"] = new JsonObject { ["content_type"] = Text(bundle["mediaType"]), ["data"] = bundleText, ["length"] = bundleText.Length };
            Require(Convert.ToHexString(SHA512.HashData(File.ReadAllBytes(publication.PackageFile))).ToLowerInvariant() == publication.Digest, "Archive changed after verification.");
            await Send(client, "PUT", Registry + escapedName, Text(exchange["token"]), publication.Metadata).ConfigureAwait(false);
            var published = await Send(client, "GET", versionUrl, "").ConfigureAwait(false);
            Require(Text(published?["dist"]?["integrity"]) == publication.Integrity && HasProvenance(published, publication.Name, publication.Version), "Published npm archive/provenance confirmation failed.");
            return "Published verified archive with GitHub OIDC and provenance: " + publication.Name + "@" + publication.Version;
        }
    }

    internal sealed class Publication
    {
        public string PackageFile, Name, Version, Integrity, Digest;
        public byte[] Bytes;
        public JsonObject Statement, Metadata;
    }
    internal interface ISigner { Task<string> Sign(Publication publication, IDictionary<string, string> env); }
    internal interface ICommandRunner { int Run(string executable, params string[] arguments); }
    internal sealed class ProcessRunner : ICommandRunner
    {
        public int Run(string executable, params string[] arguments)
        {
            var info = new ProcessStartInfo(executable) { UseShellExecute = false };
            foreach (var argument in arguments) info.ArgumentList.Add(argument);
            using (var process = Process.Start(info)) { process.WaitForExit(); return process.ExitCode; }
        }
    }
    internal sealed class NativeSigner : ISigner
    {
        internal const string CosignSha256 = "10DAB2FD2170B5AA0D5C0673A9A2793304960220B314F6A873BF39C2F08287AA";
        internal const string ReleaseUrl = "https://github.com/sigstore/cosign/releases/download/v3.0.4/cosign-linux-amd64";
        private readonly HttpClient download;
        private readonly ICommandRunner runner;
        private readonly string expectedSha256;
        internal NativeSigner(HttpClient download, ICommandRunner runner) : this(download, runner, CosignSha256) { }
        internal NativeSigner(HttpClient download, ICommandRunner runner, string expectedSha256) { this.download = download; this.runner = runner; this.expectedSha256 = expectedSha256; }
        public async Task<string> Sign(Publication publication, IDictionary<string, string> env)
        {
            Publisher.Require(!string.IsNullOrEmpty(Publisher.Value(env, "RUNNER_TEMP")), "RUNNER_TEMP is required.");
            var work = Path.Combine(Publisher.Value(env, "RUNNER_TEMP"), "native-npm-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(work);
            try
            {
                var cosign = Path.Combine(work, "cosign");
                var bytes = await download.GetByteArrayAsync(ReleaseUrl).ConfigureAwait(false);
                Publisher.Require(Convert.ToHexString(SHA256.HashData(bytes)) == expectedSha256, "cosign checksum mismatch.");
                File.WriteAllBytes(cosign, bytes);
                if (OperatingSystem.IsLinux()) File.SetUnixFileMode(cosign, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
                var releaseBundle = Path.Combine(work, "cosign.sigstore.json");
                File.WriteAllBytes(releaseBundle, await download.GetByteArrayAsync(ReleaseUrl + ".sigstore.json").ConfigureAwait(false));
                Publisher.Require(runner.Run(cosign, "verify-blob", cosign, "--bundle", releaseBundle, "--certificate-identity", "keyless@projectsigstore.iam.gserviceaccount.com", "--certificate-oidc-issuer", "https://accounts.google.com") == 0, "cosign release signature verification failed.");
                var statement = Path.Combine(work, "statement.json");
                var bundle = Path.Combine(work, "provenance.sigstore.json");
                File.WriteAllText(statement, publication.Statement.ToJsonString(), new UTF8Encoding(false));
                Publisher.Require(runner.Run(cosign, "attest-blob", "--yes", "--statement", statement, "--bundle", bundle) == 0, "npm provenance signing failed.");
                Publisher.Require(runner.Run(cosign, "verify-blob-attestation", "--bundle", bundle, "--digest", publication.Digest, "--digestAlg", "sha512", "--type", "https://slsa.dev/provenance/v1", "--certificate-identity", "https://github.com/" + Publisher.Value(env, "GITHUB_WORKFLOW_REF"), "--certificate-oidc-issuer", "https://token.actions.githubusercontent.com") == 0, "npm provenance identity/digest verification failed.");
                return File.ReadAllText(bundle);
            }
            finally { if (OperatingSystem.IsLinux()) Directory.Delete(work, true); }
        }
    }
}
