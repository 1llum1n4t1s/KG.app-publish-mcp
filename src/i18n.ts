/**
 * 人が読む固定文言（CLI の出力・起動時の診断・Google 認証のブラウザー画面）を 9 言語で出す。
 *
 * 対象外（英語のまま）: MCP ツールの名前・説明・入力スキーマ、AI に返すエラー文、
 * `locale` / `language` 引数（ストアの掲載言語であり UI 言語ではない）、識別子・コマンド・パス・OS や外部 API の原文。
 *
 * CLI の判定順: APP_PUBLISH_MCP_LANGUAGE → LC_ALL → LC_MESSAGES → LANG（空・C・POSIX は読み飛ばす）
 *   → Intl の既定ロケール → 英語。
 * Web 画面（OAuth コールバック）の判定順: Accept-Language（q 値つきの最良一致）→ 英語。
 * 辞書は `locales/<タグ>.json`。キーが無ければ英語、英語にも無ければキーそのものを返す。
 */
import ja from './locales/ja.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };
import zhCN from './locales/zh-CN.json' with { type: 'json' };
import zhTW from './locales/zh-TW.json' with { type: 'json' };
import ko from './locales/ko.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import ptBR from './locales/pt-BR.json' with { type: 'json' };

export const LANGUAGES = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'es', 'fr', 'de', 'pt-BR'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Dictionary = Record<string, string>;

export const DICTIONARIES: Record<Language, Dictionary> = {
  ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW, ko, es, fr, de, 'pt-BR': ptBR,
};

/** 空文字・C・POSIX（C.UTF-8 を含む）は言語の判定材料にならない。 */
function isNeutral(value: string | undefined): boolean {
  if (value === undefined) return true;
  const base = value.trim().split(/[.@]/)[0].toLowerCase();
  return base === '' || base === 'c' || base === 'posix';
}

/**
 * 言語タグ（ja、ja_JP.UTF-8、zh-Hant-TW、pt_BR など）を対応言語へ照合する。未対応・空なら undefined。
 * zh-Hans・zh-CN・zh-SG は zh-CN、zh-Hant・zh-TW・zh-HK・zh-MO は zh-TW、
 * pt（pt-BR 以外の pt-* を含む）は pt-BR、それ以外は主言語で照合する。
 */
export function matchLanguageTag(value: string): Language | undefined {
  const base = value.trim().split(/[.@]/)[0].toLowerCase();
  if (!base) return undefined;
  const [primary, ...rest] = base.split(/[_-]/);
  switch (primary) {
    case 'ja': return 'ja';
    case 'en': return 'en';
    case 'ko': return 'ko';
    case 'es': return 'es';
    case 'fr': return 'fr';
    case 'de': return 'de';
    case 'pt': return 'pt-BR';
    case 'zh':
      // 文字体系（hans / hant）を地域より優先し、どちらも無い zh は簡体字とする。
      if (rest.includes('hant')) return 'zh-TW';
      if (rest.includes('hans')) return 'zh-CN';
      if (rest.some(tag => ['tw', 'hk', 'mo'].includes(tag))) return 'zh-TW';
      return 'zh-CN';
    default: return undefined;
  }
}

/** CLI・起動診断の言語。呼び出しごとに判定する（テストで環境変数を切り替えられるようにするため）。 */
export function detectCliLanguage(
  env: NodeJS.ProcessEnv = process.env,
  intlLocale: () => string | undefined = defaultIntlLocale,
): Language {
  for (const name of ['APP_PUBLISH_MCP_LANGUAGE', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const value = env[name];
    if (isNeutral(value)) continue;
    return matchLanguageTag(value!) ?? 'en';
  }
  const locale = intlLocale();
  return (locale && matchLanguageTag(locale)) || 'en';
}

function defaultIntlLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/** Accept-Language から q 値の高い順に最初に一致した言語を返す。一致しなければ英語。 */
export function detectWebLanguage(acceptLanguage: string | undefined): Language {
  if (!acceptLanguage) return 'en';
  const candidates = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter(c => c.tag && c.tag !== '*' && c.weight > 0)
    // q 値の降順、同値は記載順。
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const candidate of candidates) {
    const language = matchLanguageTag(candidate.tag);
    if (language) return language;
  }
  return 'en';
}

export type Translator = (key: string, params?: Record<string, string | number>) => string;

/** `{name}` 形式のプレースホルダーを置換する。未指定のプレースホルダーはそのまま残す。 */
export function translate(language: Language, key: string, params?: Record<string, string | number>): string {
  const template = DICTIONARIES[language][key] ?? DICTIONARIES.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole);
}

export function createTranslator(language: Language): Translator {
  return (key, params) => translate(language, key, params);
}

/** CLI 向け: 呼び出し時点の環境から言語を決めて翻訳する。 */
export const tCli: Translator = (key, params) => translate(detectCliLanguage(), key, params);
