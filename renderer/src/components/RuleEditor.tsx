import { useState } from 'react';
import type { KomorebiConfig, MatchingRule } from '../types';
import { RULE_FIELDS, KINDS, STRATEGIES } from '../types';
import { Card, TextInput, Button, Badge, EmptyState } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  focusedExe: string | null;
  focusedTitle: string | null;
  onFloatApp: (exe: string, title: string | null) => void;
}

const SIMPLE_KINDS = KINDS.filter((k) => k !== 'Composite');

function RuleRow({ rule, onChange, onRemove }: { rule: MatchingRule; onChange: (patch: Partial<MatchingRule>) => void; onRemove: () => void }) {
  return (
    <div className={`rule-row${rule.kind === 'Composite' ? ' comp' : ''}`}>
      <select className="input" value={rule.kind} onChange={(e) => onChange({ kind: e.target.value as MatchingRule['kind'] })}>
        {KINDS.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      {rule.kind === 'Composite' ? (
        <span className="mono faint" style={{ fontSize: 12 }}>
          matches ALL of: {rule.rules?.map((s) => `${s.kind} "${s.id}"`).join(' + ') || '(empty composite)'}
        </span>
      ) : (
        <>
          <input
            type="text"
            className="input mono"
            value={rule.id ?? ''}
            placeholder="e.g. p4v.exe, UnrealEditor"
            onChange={(e) => onChange({ id: e.target.value })}
          />
          <select
            className="input"
            value={rule.matching_strategy ?? 'Equals'}
            onChange={(e) => onChange({ matching_strategy: e.target.value as MatchingRule['matching_strategy'] })}
          >
            {STRATEGIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </>
      )}
      <Button variant="subtle" title="Remove rule" onClick={onRemove}>
        ✕
      </Button>
    </div>
  );
}

function RuleGroup({ title, hint, rules, onChange }: { title: string; hint: string; rules: MatchingRule[] | undefined; onChange: (r: MatchingRule[]) => void }) {
  const list = rules ?? [];
  const update = (i: number, patch: Partial<MatchingRule>) => {
    const next = list.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const updateSub = (i: number, j: number, patch: Partial<MatchingRule>) => {
    const next = list.map((r, idx) => {
      if (idx !== i || r.kind !== 'Composite') return r;
      const sub = (r.rules ?? []).map((s, jdx) => (jdx === j ? { ...s, ...patch } : s));
      return { ...r, rules: sub };
    });
    onChange(next);
  };
  const removeSub = (i: number, j: number) => {
    const next = list.map((r, idx) => {
      if (idx !== i || r.kind !== 'Composite') return r;
      return { ...r, rules: (r.rules ?? []).filter((_, jdx) => jdx !== j) };
    });
    onChange(next);
  };
  const addSub = (i: number, r: MatchingRule) => {
    const next = list.map((rule, idx) => {
      if (idx !== i || rule.kind !== 'Composite') return rule;
      return { ...rule, rules: [...(rule.rules ?? []), { ...r, matching_strategy: r.matching_strategy ?? 'Equals' }] };
    });
    onChange(next);
  };

  return (
    <div className="rule-group">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <Badge>{list.length}</Badge>
        <span className="rule-hint">{hint}</span>
      </div>
      {list.length === 0 && <EmptyState title="No rules" hint="Windows matching this rule set will be unaffected." />}
      {list.map((r, i) => (
        <div key={i}>
          <RuleRow rule={r} onChange={(patch) => update(i, patch)} onRemove={() => remove(i)} />
          {r.kind === 'Composite' && (
            <div className="rule-composite">
              {(r.rules ?? []).map((s, j) => (
                <RuleRow key={j} rule={s} onChange={(patch) => updateSub(i, j, patch)} onRemove={() => removeSub(i, j)} />
              ))}
              <AddRuleRow onAdd={(s) => addSub(i, s)} compact placeholder="Add sub-rule…" />
            </div>
          )}
        </div>
      ))}
      <AddRuleRow onAdd={(r) => onChange([...list, r])} />
    </div>
  );
}

function AddRuleRow({ onAdd, compact, placeholder }: { onAdd: (r: MatchingRule) => void; compact?: boolean; placeholder?: string }) {
  const [kind, setKind] = useState<string>('Exe');
  const [id, setId] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('Equals');
  const add = () => {
    if (!id.trim()) return;
    onAdd({ kind: kind as MatchingRule['kind'], id: id.trim(), matching_strategy: strategy as MatchingRule['matching_strategy'] });
    setId('');
  };
  return (
    <div className={compact ? 'rule-add compact' : 'rule-add'}>
      <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
        {SIMPLE_KINDS.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <TextInput value={id} onChange={setId} placeholder={placeholder ?? 'Add rule id / exe / class / title…'} mono />
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

export default function RuleEditor({ config, onChange, focusedExe, focusedTitle, onFloatApp }: Props) {
  const exe = focusedExe;
  const title = focusedTitle;
  return (
    <div className="stack">
      <Card
        title="Quick actions"
        subtitle="Apply a rule to the window that currently has focus."
        actions={
          <Button
            onClick={() => exe && onFloatApp(exe, title)}
            disabled={!exe}
            title={exe ? `Float ${exe} by exe + title` : 'No focused window detected'}
          >
            Float focused app: {exe ?? '—'}
          </Button>
        }
      >
        <p className="faint" style={{ margin: 0 }}>
          Adds a <span className="mono">floating_applications</span> composite rule matching the focused app's{' '}
          <span className="mono">exe</span> and its current window <span className="mono">title</span> (both must match), so only
          that window floats - perfect for dialogs like Unreal's "Open Asset" while the main editor stays managed.
          {title && (
            <>
              {' '}
              Focused title: <span className="mono">{title}</span>
            </>
          )}
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