import { useState } from 'react';
import type { KomorebiConfig } from '../types';
import { Card, Button } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  save: () => Promise<void>;
}

export default function RawJson({ config, onChange, save }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<KomorebiConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetText = () => setText(JSON.stringify(config, null, 2));

  const parse = () => {
    try {
      const obj = JSON.parse(text);
      setParsed(obj);
      setError(null);
      onChange(obj);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const applyAndSave = async () => {
    if (parsed) {
      onChange(parsed);
      await save();
    }
  };

  return (
    <div className="stack">
      <Card
        title="Raw configuration"
        subtitle="Full komorebi.json as JSON text. Anything the forms don't cover, you can control here."
        actions={
          <>
            <Button variant="ghost" onClick={resetText}>Load current</Button>
            <Button variant="ghost" onClick={parse}>Parse</Button>
            <Button onClick={applyAndSave} disabled={!parsed}>Parse & save</Button>
          </>
        }
      >
        <textarea
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{\n  "animation": {...}\n}'}
          spellCheck={false}
        />
        {error && <div className="console err" style={{ marginTop: 10 }}>JSON error: {error}</div>}
        {!error && parsed && (
          <div className="console ok" style={{ marginTop: 10 }}>
            Valid JSON · {Object.keys(parsed).length} top-level keys · save to persist
          </div>
        )}
      </Card>
    </div>
  );
}