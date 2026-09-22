import { useState } from 'react';
import type { KomorebiConfig, MatchingRule, KomorebiState } from '../types';
import { RULE_FIELDS, KINDS, STRATEGIES } from '../types';
import { Card, TextInput, Button, Badge, EmptyState } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  state?: KomorebiState;
  onFloatApp: (exe: string) => void;
}

function RuleGroup({ title, hint, rules, onChange }: { title: string; hint: string; rules: MatchingRule[] | undefined; onChange: (r: MatchingRule[]) => void }) {
  const list = rules ?? [];
  const update = (i: number, patch: Partial<MatchingRule>) => {
    const next = list.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div className="rule-group">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <Badge>{list.length}</Badge>
        <span className="rule-hint">{hint}</span>
      </div>
      {list.length === 0 && <EmptyState title="No rules" hint="Windows matching this rule set will be unaffected." />}
      {list.map((r, i) => (
        <div key={i} className="rule-row">
          <select
            className="input"
            value={r.kind}
            onChange={(e) => update(i, { kind: e.target.value as MatchingRule['kind'] })}
          >
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input
            type="text"
            className="input mono"
            value={r.id}
            placeholder="e.g. p4v.exe, UnrealEditor"
            onChange={(e) => update(i, { id: e.target.value })}
          />
          <select
            className="input"
            value={r.matching_strategy ?? 'Equals'}
            onChange={(e) => update(i, { matching_strategy: e.target.value as MatchingRule['matching_strategy'] })}
          >
            {STRATEGIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Button variant="subtle" title="Remove rule" onClick={() => remove(i)}>
            ✕
          </Button>
        </div>
      ))}
      <AddRuleRow onAdd={(r) => onChange([...list, r])} />
    </div>
  );
}

function AddRuleRow({ onAdd }: { onAdd: (r: MatchingRule) => void }) {
  const [kind, setKind] = useState<string>('Exe');
  const [id, setId] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('Equals');
  const add = () => {
    if (!id.trim()) return;
    onAdd({ kind: kind as MatchingRule['kind'], id: id.trim(), matching_strategy: strategy as MatchingRule['matching_strategy'] });
    setId('');
  };
  return (
    <div className="rule-add">
      <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
        {KINDS.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <TextInput value={id} onChange={setId} placeholder="Add rule id / exe / class / title…" mono />
      <select className="input" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
        {STRATEGIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <Button onClick={add} disabled={!id.trim()}>
        Add
      </Button>
    </div>
  );
}

function focusedExe(state?: KomorebiState): string | null {
  const monitors = state?.monitors?.elements ?? [];
  for (const m of monitors) {
    // find the focused workspace on a focused monitor; fall back to first window found
    for (let w = (m.workspaces?.elements ?? []).length - 1; w >= 0; w--) {
      const ws = m.workspaces?.elements?.[w];
      for (const c of ws?.containers?.elements ?? []) {
        for (const win of c.windows?.elements ?? []) {
          if (win.exe) return win.exe.replace(/\.exe$/i, '') + '.exe';
        }
      }
    }
  }
  return null;
}

export default function RuleEditor({ config, onChange, state, onFloatApp }: Props) {
  const exe = focusedExe(state);
  return (
    <div className="stack">
      <Card
        title="Quick actions"
        subtitle="Apply a rule to the window that currently has focus."
        actions={
          <Button onClick={() => exe && onFloatApp(exe)} disabled={!exe} title={exe ?? 'No focused window detected'}>
            Float focused app: {exe ?? '—'}
          </Button>
        }
      >
        <p className="faint" style={{ margin: 0 }}>
          Adds a <span className="mono">floating_applications</span> rule so the focused app always floats. Works great for dialogs like Unreal's "Open Asset".
        </p>
      </Card>

      {RULE_FIELDS.map((f) => (
        <Card key={f.key} title={f.label}>
          <RuleGroup
            title={''}
            hint={f.hint}
            rules={config[f.key] as unknown as MatchingRule[] | undefined}
            onChange={(rules) => onChange({ ...config, [f.key]: rules })}
          />
        </Card>
      ))}
    </div>
  );
}