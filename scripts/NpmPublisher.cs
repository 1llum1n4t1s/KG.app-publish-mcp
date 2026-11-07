using System;
using System.Collections.Generic;
using System.Formats.Tar;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
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
                return Run(packageFile, expectedIntegrity, packResultPath, prepareOnly, env, client, OperatingSystem.IsLinux());
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
        internal static string Run(string packageFile, string expectedIntegrity, string packResultPath, bool prepareOnly, IDictionary<string, string> env, HttpClient client, bool isLinux)
        {
            var publication = Prepare(packageFile, expectedIntegrity, packResultPath, env);
            if (prepareOnly) return new JsonObject { ["Metadata"] = publication.Metadata.DeepClone() }.ToJsonString();
            return Publish(publication, env, client, isLinux).GetAwaiter().GetResult();
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
            return new Publication { PackageFile = packageFile, Bytes = bytes, Integrity = integrity, Digest = digest, Name = name, Version = version, Metadata = metadata };
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

        internal static async Task<string> Publish(Publication publication, IDictionary<string, string> env, HttpClient client, bool isLinux)
        {
            Require(isLinux && Value(env, "GITHUB_ACTIONS") == "true", "Publication requires a Linux Actions runner.");
            var token = Value(env, "NODE_AUTH_TOKEN");
            if (string.IsNullOrWhiteSpace(token)) token = Value(env, "NPM_TOKEN");
            Require(!string.IsNullOrWhiteSpace(token) && !token.Any(char.IsWhiteSpace), "NODE_AUTH_TOKEN or NPM_TOKEN is required.");
            var escapedName = publication.Name.Replace("/", "%2f");
            var versionUrl = Registry + escapedName + "/" + publication.Version;
            var existing = await Send(client, "GET", versionUrl, "", allowMissing: true).ConfigureAwait(false);
            if (existing != null)
            {
                Require(Text(existing["dist"]?["integrity"]) == publication.Integrity, "Published version has different archive integrity.");
                Require(existing["dist"]?["attestations"] == null || HasProvenance(existing, publication.Name, publication.Version), "Published npm archive/provenance confirmation failed.");
                return "Already published identical archive: " + publication.Name + "@" + publication.Version;
            }
            Require(Convert.ToHexString(SHA512.HashData(File.ReadAllBytes(publication.PackageFile))).ToLowerInvariant() == publication.Digest, "Archive changed after verification.");
            await Send(client, "PUT", Registry + escapedName, token, publication.Metadata).ConfigureAwait(false);
            var published = await Send(client, "GET", versionUrl, "").ConfigureAwait(false);
            Require(Text(published?["dist"]?["integrity"]) == publication.Integrity && (published?["dist"]?["attestations"] == null || HasProvenance(published, publication.Name, publication.Version)), "Published npm archive/provenance confirmation failed.");
            return "Published verified archive with token authentication: " + publication.Name + "@" + publication.Version;
        }
    }

    internal sealed class Publication
    {
        public string PackageFile, Name, Version, Integrity, Digest;
        public byte[] Bytes;
        public JsonObject Metadata;
    }
}
