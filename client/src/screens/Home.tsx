import { useState } from 'react';
import type { Language } from '@crossword/shared';
import type { SoloDifficulty } from '../useSoloGame.js';

interface Props {
  onCreate: (name: string, language: Language) => void;
  onJoin: (code: string, name: string) => void;
  onSolo: (language: Language, difficulty: SoloDifficulty) => void;
  error: string | null;
  connected: boolean;
}

export function Home({ onCreate, onJoin, onSolo, error, connected }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Language>('ja');
  const [soloLanguage, setSoloLanguage] = useState<Language>('ja');
  const [soloDifficulty, setSoloDifficulty] = useState<SoloDifficulty>('normal');

  return (
    <div className="screen home">
      <h1>クロスワード</h1>
      <p className="tagline">一人でじっくり、みんなで早押し対戦。マスを埋めて遊ぼう！</p>

      <div className="card">
        <h2>一人で遊ぶ</h2>
        <p className="hint">自動生成された盤面を一人で解きます。サーバ接続は不要です。</p>
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
        <button className="primary" onClick={() => onSolo(soloLanguage, soloDifficulty)}>
          一人用をはじめる
        </button>
      </div>

      <h2 className="section-label">オンライン対戦</h2>
      {!connected && (
        <div className="server-warn">
          ⚠ サーバに接続中… 接続できない場合はサーバが起動していない可能性があります。
        </div>
      )}

      <label className="field">
        ニックネーム
        <input
          value={name}
          maxLength={16}
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
          ルームコード
          <input
            value={code}
            placeholder="例: ABC123"
            maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
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

      <footer className="app-footer">v{__APP_VERSION__}</footer>
    </div>
  );
}
