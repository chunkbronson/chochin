import { useEffect, useState } from 'react';
import type { KomorebiConfig, MatchingRule } from '../types';
import { RULE_FIELDS, KINDS, STRATEGIES } from '../types';
import { Card, TextInput, Button, Badge, EmptyState } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  capture: () => Promise<{ ok: boolean; exe: string | null; title: string | null }>;
  applyToSection: (fieldKey: string, exe: string, title: string | null) => void;
  t: (msg: string, kind?: 'ok' | 'err' | 'info') => void;
}

const SIMPLE_KINDS = KINDS.filter((k) => k !== 'Composite');

type Pending = {
  fieldKey: string;
  phase: 'countdown' | 'captured';
  secondsLeft: number;
  captured: { exe: string; title: string | null } | null;
} | null;

function ruleHeader(rule: MatchingRule): string {
  if (rule.kind === 'Composite') {
    const subs = rule.rules ?? [];
    const exe = subs.find((s) => s.kind === 'Exe');
    if (exe?.id) return exe.id;
    return subs[0]?.id ?? '(empty composite)';
  }
  return rule.id ?? '(unnamed)';
}

function RuleRow({ rule, onChange, onRemove }: { rule: MatchingRule; onChange: (patch: Partial<MatchingRule>) => void; onRemove?: () => void }) {
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
      {onRemove && (
        <Button variant="subtle" title="Remove rule" onClick={onRemove}>
          ✕
        </Button>
      )}
    </div>
  );
}

function RuleGroup({
  title,
  hint,
  fieldKey,
  rules,
  onChange,
  pending,
  onStartCapture,
  onCancelCapture,
  onApplyCapture,
  busy
}: {
  title: string;
  hint: string;
  fieldKey: string;
  rules: MatchingRule[] | undefined;
  onChange: (r: MatchingRule[]) => void;
  pending: Pending;
  onStartCapture: () => void;
  onCancelCapture: () => void;
  onApplyCapture: () => void;
  busy: boolean;
}) {
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

  const isPending = pending?.fieldKey === fieldKey;
  const isCaptured = isPending && pending?.phase === 'captured';

  return (
    <div className="rule-group">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <Badge>{list.length}</Badge>
        <span className="rule-hint">{hint}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isPending && pending?.phase === 'countdown' && (
            <span className="mono faint" style={{ fontSize: 12 }}>
              {busy ? 'Capturing…' : `Capture in ${pending.secondsLeft}s`}
            </span>
          )}
          {isCaptured && (
            <Button variant="ghost" onClick={onCancelCapture} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button
            variant="subtle"
            onClick={isCaptured ? onApplyCapture : onStartCapture}
            disabled={busy}
            title={
              isCaptured && pending?.captured
                ? `Add rule for ${pending.captured.title || pending.captured.exe} to ${title}`
                : 'Click, then focus the window you want within 5 seconds'
            }
          >
            {isCaptured && pending?.captured
              ? `Apply to ${pending.captured.title || pending.captured.exe}`
              : 'Capture'}
          </Button>
        </div>
      </div>
      {list.length === 0 && <EmptyState title="No rules" hint="Windows matching this rule set will be unaffected." />}
      {list.map((r, i) => (
        <div key={i} className="rule-block">
          <div className="rule-block-header">
            <Badge>{r.kind === 'Composite' ? 'Composite' : r.kind}</Badge>
            <span className="rule-block-title">{ruleHeader(r)}</span>
            <Button variant="subtle" title="Remove rule" onClick={() => remove(i)}>
              ✕
            </Button>
          </div>
          <div className="rule-block-body">
            <RuleRow rule={r} onChange={(patch) => update(i, patch)} />
            {r.kind === 'Composite' && (
              <div className="rule-composite">
                {(r.rules ?? []).map((s, j) => (
                  <RuleRow key={j} rule={s} onChange={(patch) => updateSub(i, j, patch)} onRemove={() => removeSub(i, j)} />
                ))}
                <AddRuleRow onAdd={(s) => addSub(i, s)} compact placeholder="Add sub-rule…" />
              </div>
            )}
          </div>
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

export default function RuleEditor({ config, onChange, capture, applyToSection, t }: Props) {
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pending || pending.phase !== 'countdown') return;
    if (pending.secondsLeft <= 0) {
      setBusy(true);
      void capture()
        .then((res) => {
          const exe = res.exe;
          if (res.ok && exe) {
            setPending((p) => (p ? { ...p, phase: 'captured', captured: { exe, title: res.title } } : p));
          } else {
            t('No focused window detected - try again', 'err');
            setPending(null);
          }
        })
        .finally(() => setBusy(false));
      return;
    }
    const id = setTimeout(() => setPending((p) => (p ? { ...p, secondsLeft: p.secondsLeft - 1 } : p)), 1000);
    return () => clearTimeout(id);
  }, [pending, capture, t]);

  const startCapture = (fieldKey: string) => {
    setPending({ fieldKey, phase: 'countdown', secondsLeft: 5, captured: null });
  };

  const cancelCapture = () => {
    setPending(null);
  };

  const applyCapture = () => {
    if (!pending?.captured || busy) return;
    applyToSection(pending.fieldKey, pending.captured.exe, pending.captured.title);
    setPending(null);
  };

  return (
    <div className="stack">
      {RULE_FIELDS.map((f) => (
        <Card key={f.key as string} title={f.label}>
          <RuleGroup
            title={''}
            hint={f.hint}
            fieldKey={f.key as string}
            rules={config[f.key] as unknown as MatchingRule[] | undefined}
            onChange={(rules) => onChange({ ...config, [f.key]: rules })}
            pending={pending}
            onStartCapture={() => startCapture(f.key as string)}
            onCancelCapture={cancelCapture}
            onApplyCapture={applyCapture}
            busy={busy}
          />
        </Card>
      ))}
    </div>
  );
}