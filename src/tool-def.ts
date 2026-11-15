import type { z } from 'zod';

/**
 * Apple / Google 共通の MCP ツール定義。
 * 違いは handler が受け取るプラットフォーム client の型だけなので、型引数 C で表す。
 * 登録・JSON 整形・エラー変換は src/index.ts の共通処理が担い、各 tools.ts は宣言だけを持つ。
 */
export interface ToolDef<C> {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  handler: (client: C, args: any) => Promise<any>;
}
