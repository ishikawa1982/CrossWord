// 単語データ：クライアント・サーバ共通の単語＋カギのソース
import type { Genre, Language, WordEntry } from './types.js';
import jaWords from './data/words.ja.json';
import enWords from './data/words.en.json';

const WORDS: Record<Language, WordEntry[]> = {
  ja: jaWords as WordEntry[],
  en: enWords as WordEntry[],
};

/**
 * 指定言語・ジャンルの単語リストを返す。
 * - genre 未指定または 'random' の場合は全件
 * - 日本語以外はジャンルを無視して全件（英語データにジャンルは無い）
 * - 該当ジャンルが少なすぎる場合は全件にフォールバック
 */
export function getWords(language: Language, genre?: Genre): WordEntry[] {
  const all = WORDS[language] ?? WORDS.en;
  if (!genre || genre === 'random' || language !== 'ja') return all;
  const filtered = all.filter((w) => w.genre === genre);
  return filtered.length >= 4 ? filtered : all;
}
