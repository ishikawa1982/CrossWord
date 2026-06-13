import { useState } from 'react';
import type { Language } from '@crossword/shared';

interface Props {
  onCreate: (name: string, language: Language) => void;
  onJoin: (code: string, name: string) => void;
  error: string | null;
  connected: boolean;
}

export function Home({ onCreate, onJoin, error, connected }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Language>('ja');

  return (
    <div className="screen home">
      <h1>対戦型クロスワード</h1>
      <p className="tagline">最大4人で早押し対戦。マスを自分の色で塗りつぶそう！</p>
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
    </div>
  );
}
