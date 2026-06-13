// 単語データ：クライアント・サーバ共通の単語＋カギのソース
import type { Language, WordEntry } from './types.js';
import jaWords from './data/words.ja.json';
import enWords from './data/words.en.json';

const WORDS: Record<Language, WordEntry[]> = {
  ja: jaWords as WordEntry[],
  en: enWords as WordEntry[],
};

/** 指定言語の単語リストを返す（未対応言語は英語にフォールバック） */
export function getWords(language: Language): WordEntry[] {
  return WORDS[language] ?? WORDS.en;
}
