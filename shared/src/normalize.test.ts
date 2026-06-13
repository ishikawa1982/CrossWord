import { describe, expect, it } from 'vitest';
import { filterInput } from './normalize.js';

describe('filterInput', () => {
  it('日本語：ひらがなはカタカナに変換される', () => {
    expect(filterInput('さくら', 'ja')).toBe('サクラ');
  });
  it('日本語：カタカナはそのまま、長音符も許可', () => {
    expect(filterInput('コーヒー', 'ja')).toBe('コーヒー');
  });
  it('日本語：英数字・記号・漢字・スペースは除去される', () => {
    expect(filterInput('サA1 ・くら漢', 'ja')).toBe('サ・クラ');
  });
  it('日本語：小書き仮名は残す（比較時に正規化されるため）', () => {
    expect(filterInput('きゃく', 'ja')).toBe('キャク');
  });
  it('英語：小文字は大文字化し、英字以外は除去', () => {
    expect(filterInput('Cat-12 ねこ', 'en')).toBe('CAT');
  });
});
