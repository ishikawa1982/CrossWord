import { useEffect, useState } from 'react';
import type { Language } from '@crossword/shared';
import type { SoloDifficulty } from '../useSoloGame.js';
import logoUrl from '../assets/logo.png';

const NAME_KEY = 'crossword.nickname';
// ルームコードはひらがな（濁点・半濁点を含む）。U+3041〜U+3096 のひらがな1文字を許可する
const HIRAGANA_RE = /^[ぁ-ゖ]$/;

interface Props {
  onCreate: (name: string, language: Language) => void;
  onJoin: (code: string, name: string) => void;
  onSolo: (language: Language, difficulty: SoloDifficulty) => void;
  error: string | null;
  connected: boolean;
}

export function Home({ onCreate, onJoin, onSolo, error, connected }: Props) {
  // ニックネームは localStorage から復元し、変更のたびに保存する
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Language>('ja');
  const [soloOpen, setSoloOpen] = useState(false);
  const [soloLanguage, setSoloLanguage] = useState<Language>('ja');
  const [soloDifficulty, setSoloDifficulty] = useState<SoloDifficulty>('normal');

  useEffect(() => {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  }, [name]);

  // 入力をひらがな（濁点・半濁点を含む）に絞り、最大4文字に
  const onCodeChange = (raw: string) => {
    const filtered = Array.from(raw).filter((ch) => HIRAGANA_RE.test(ch)).slice(0, 4).join('');
    setCode(filtered);
  };

  return (
    <div className="screen home">
      <h1 className="home-title">
        <img src={logoUrl} alt="みんなのクロスワードパズル VS" className="home-logo" />
      </h1>
      <p className="tagline">最大4人で早押し対戦。マスを自分の色で塗りつぶそう！</p>

      {!connected && (
        <div className="server-warn">
          ⚠ サーバに接続中… 接続できない場合はサーバが起動していない可能性があります。
        </div>
      )}

      <label className="field">
        ニックネーム（4文字まで）
        <input
          value={name}
          maxLength={4}
          placeholder="あなたの名前"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="card">
        <h2>新しい部屋を作る</h2>
        <label className="field">
          言語
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="ja">日本語（かな）</option>
            <option value="en">英語</option>
          </select>
        </label>
        <button className="primary" disabled={!name.trim()} onClick={() => onCreate(name, language)}>
          部屋を作成
        </button>
      </div>

      <div className="card">
        <h2>部屋に参加する</h2>
        <label className="field">
          ルームコード（ひらがな4文字）
          <input
            value={code}
            placeholder="例: さくらねこ"
            maxLength={4}
            onChange={(e) => onCodeChange(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={!name.trim() || code.length < 4}
          onClick={() => onJoin(code, name)}
        >
          参加する
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="solo-section">
        <button className="solo-toggle" onClick={() => setSoloOpen((o) => !o)}>
          一人で遊ぶ <span className="solo-chevron">{soloOpen ? '▲' : '▼'}</span>
        </button>
        {soloOpen && (
          <div className="solo-panel">
            <div className="solo-options">
              <label className="field">
                言語
                <select
                  value={soloLanguage}
                  onChange={(e) => setSoloLanguage(e.target.value as Language)}
                >
                  <option value="ja">日本語（かな）</option>
                  <option value="en">英語</option>
                </select>
              </label>
              <label className="field">
                難易度
                <select
                  value={soloDifficulty}
                  onChange={(e) => setSoloDifficulty(e.target.value as SoloDifficulty)}
                >
                  <option value="easy">かんたん（6語）</option>
                  <option value="normal">ふつう（10語）</option>
                  <option value="hard">むずかしい（14語）</option>
                </select>
              </label>
            </div>
            <button className="ghost solo-start" onClick={() => onSolo(soloLanguage, soloDifficulty)}>
              はじめる
            </button>
          </div>
        )}
      </div>

      <footer className="app-footer">v{__APP_VERSION__}</footer>
    </div>
  );
}
