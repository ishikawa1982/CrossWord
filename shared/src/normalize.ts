// 解答の正規化：言語差・表記ゆれを吸収して比較・配置できる正準形にする
import type { Language } from './types.js';

const SMALL_TO_LARGE: Record<string, string> = {
  ァ: 'ア', ィ: 'イ', ゥ: 'ウ', ェ: 'エ', ォ: 'オ',
  ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ッ: 'ツ', ヮ: 'ワ',
};

/** ひらがな→カタカナ変換 */
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/** 1文字を正準化（小書き仮名は大書きに統一） */
export function normalizeChar(ch: string, lang: Language): string {
  if (lang === 'en') return ch.toUpperCase();
  const kata = toKatakana(ch);
  return SMALL_TO_LARGE[kata] ?? kata;
}

/** 解答全体を正準化し、マスに対応する文字配列を返す */
export function normalizeWord(word: string, lang: Language): string[] {
  let cleaned: string;
  if (lang === 'en') {
    cleaned = word.toUpperCase().replace(/[^A-Z]/g, '');
  } else {
    // 全角化はせず、かなのみ抽出（長音符ーも許可）
    const kata = toKatakana(word);
    cleaned = kata.replace(/[^゠-ヿー]/g, '');
  }
  return Array.from(cleaned).map((c) => normalizeChar(c, lang));
}

/** 文字列比較用に1本の文字列へ */
export function normalizeForCompare(word: string, lang: Language): string {
  return normalizeWord(word, lang).join('');
}

/**
 * 入力欄用フィルタ：許可文字のみを残す（スマホ・PCのIME差を吸収して統一）。
 * - ja: カタカナのみ（ひらがなは自動でカタカナに変換、長音符ーも許可）
 * - en: 英大文字のみ（小文字は大文字化）
 */
export function filterInput(raw: string, lang: Language): string {
  if (lang === 'en') return raw.toUpperCase().replace(/[^A-Z]/g, '');
  // ひらがな→カタカナに変換し、カタカナ・ブロック（長音符ーを含む）以外を除去
  const kata = toKatakana(raw);
  return Array.from(kata)
    .filter((ch) => /[゠-ヿ]/.test(ch))
    .join('');
}
