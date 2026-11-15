// 外部通信の遮断ガード（Bun の --preload 専用）。
// パッケージ実行検証（scripts/verify-packaged-bun.mjs）で、実際の Apple / Google へ
// 通信しないことを保証するために使う。フィクスチャ側の差し替えが漏れても、
// ここで通信そのものを拒否して「通信できてしまった」状態を検知する。
import net from 'node:net';

// 想定外のランタイム（Node など）で黙って通ってしまうことを防ぐ。
if (!process.versions.bun) throw new Error('network-guard requires the Bun runtime');

const refuse = () => { throw new Error('Unexpected network access'); };

// http / https / net / tls はいずれも最終的に net.Socket#connect を通るため、
// ここを差し替えると TCP 接続を伴う標準モジュール経由の通信をまとめて拒否できる。
net.Socket.prototype.connect = refuse;

// fetch は Bun では net を経由しないため、グローバルの fetch を差し替える。
globalThis.fetch = refuse;

// Bun 固有の TCP クライアント API。
Bun.connect = refuse;

// 限界（Bun 1.4.4 で実測）:
// - Bun.fetch と globalThis.Bun 自体は writable / configurable ともに false で、差し替えられない。
//   したがって `Bun.fetch(...)` や `import { fetch } from 'bun'` による通信はこのガードでは遮断できない。
// - Bun は `node-fetch` を組み込みの fetch 実装（Bun.fetch 相当）へ差し替えるため、node-fetch 経由の通信も
//   遮断できない。依存ツリーでは googleapis-common 配下の gaxios 7.x が node-fetch を使い、
//   その auth なしの分岐（apirequest.js）がこれに当たる。製品の Google client は常に auth を渡すので
//   gaxios 8.x（globalThis.fetch）を通り遮断されるが、依存の挙動が変われば素通りし得る。
//   Bun.plugin による node-fetch の差し替えも Bun 1.4.4 では効かなかった。
// - 製品コード（Apple は globalThis.fetch、Google は auth 付きの gaxios 8.x）が通る経路は遮断済みで、
//   実通信の有無は検証側のローカルリスナー受信ゼロでも確認する。
// - Bun.udpSocket（UDP）と WebSocket も遮断しない。使い始めたら別途ガードを足すこと。
