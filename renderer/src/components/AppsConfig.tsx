import { useState } from 'react';
import type { AppsConfig, MatchingRule } from '../types';
import { Card, Field, TextInput, Toggle, Button, Badge, EmptyState } from '../ui';

interface Props {
  apps: AppsConfig;
  onChange: (next: AppsConfig) => void;
}

const LIST_FIELDS: { key: keyof AppsConfig[string]; label: string }[] = [
  { key: 'floating', label: 'Floating' },
  { key: 'ignore', label: 'Ignore' },
  { key: 'manage', label: 'Manage' }
];

function AppEntry({ name, entry, onChange, onRemove }: { name: string; entry: AppsConfig[string]; onChange: (e: AppsConfig[string]) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [newRule, setNewRule] = useState('');
  const setList = (key: string, rules: MatchingRule[]) => onChange({ ...entry, [key]: rules });
  const addRule = (key: string) => {
    if (!newRule.trim() || !(key === 'floating' || key === 'ignore' || key === 'manage')) return;
    const list = (entry[key as 'floating'] as MatchingRule[]) ?? [];
    setList(key, [...list, { kind: 'Exe', id: newRule.trim() }]);
    setNewRule('');
  };

  return (
    <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button variant="subtle" onClick={() => setOpen(!open)}>
          <span className={open ? 'chevron open' : 'chevron'}>▶</span>
        </Button>
        <span className="title" style={{ fontFamily: 'var(--mono)' }}>{name}</span>
        <Badge tone="blue">{entry.identifiers ? 'ASC v2' : 'classic'}</Badge>
        <Button variant="subtle" onClick={onRemove}>✕</Button>
      </div>
      {open && (
        <div className="card-body split" style={{ display: 'grid', gap: 12, background: 'var(--bg-soft)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
          <div className="form-grid tight">
            {LIST_FIELDS.map((f) => {
              const rules = (entry[f.key as keyof AppsConfig[string]] as MatchingRule[] | undefined) ?? [];
              return (
                <Field key={String(f.key)} label={f.label}>
                  {rules.map((r, i) => (
                    <div key={i} className="rule-row" style={{ gridTemplateColumns: '70px 1fr 30px' }}>
                      <select className="input" value={r.kind} onChange={(e) => setList(String(f.key), rules.map((x, idx) => (idx === i ? { ...x, kind: e.target.value as MatchingRule['kind'] } : x)))}>
                        <option>Exe</option>
                        <option>Class</option>
                        <option>Title</option>
                        <option>Path</option>
                      </select>
                      <input className="input mono" value={r.id} onChange={(e) => setList(String(f.key), rules.map((x, idx) => (idx === i ? { ...x, id: e.target.value } : x)))} />
                      <Button variant="subtle" onClick={() => setList(String(f.key), rules.filter((_, idx) => idx !== i))}>✕</Button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <TextInput placeholder="add rule…" mono value={newRule} onChange={setNewRule} />
                    <Button onClick={() => addRule(String(f.key))} disabled={!newRule.trim()}>+</Button>
                  </div>
                </Field>
              );
            })}
          </div>
          <div className="form-grid tight">
            <Field label="Tray & multi-window">
              <Toggle checked={!!entry.tray_and_multi_window} onChange={(b) => onChange({ ...entry, tray_and_multi_window: b })} />
            </Field>
            <Field label="Layered window">
              <Toggle checked={!!entry.layered} onChange={(b) => onChange({ ...entry, layered: b })} />
            </Field>
            <Field label="Object name change">
              <Toggle checked={!!entry.object_name_change} onChange={(b) => onChange({ ...entry, object_name_change: b })} />
            </Field>
            <Field label="Slow application">
              <Toggle checked={!!entry.slow_application} onChange={(b) => onChange({ ...entry, slow_application: b })} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppsConfigTab({ apps, onChange }: Props) {
  const [name, setName] = useState('');
  const entries = Object.entries(apps ?? {});
  const add = () => {
    const key = name.trim();
    if (!key) return;
    onChange({ ...apps, [key]: { floating: [], ignore: [], manage: [] } });
    setName('');
  };
  const remove = (k: string) => {
    const next = { ...apps };
    delete next[k];
    onChange(next);
  };

  return (
    <div className="stack">
      <Card
        title="App-specific configuration"
        subtitle="Per-application workspace and rule overrides (applications.json)."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <TextInput value={name} onChange={setName} placeholder="app name, e.g. UnrealEditor" mono />
            <Button onClick={add} disabled={!name.trim()}>Add app</Button>
          </div>
        }
      >
        {entries.length === 0 ? (
          <EmptyState title="No app-specific entries" hint="Add workstation overrides per app here, mirroring the ASC editor." />
        ) : (
          entries.map(([k, e]) => (
            <AppEntry key={k} name={k} entry={e} onChange={(next) => onChange({ ...apps, [k]: next })} onRemove={() => remove(k)} />
          ))
        )}
      </Card>
    </div>
  );
}