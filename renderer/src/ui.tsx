import { ReactNode, useEffect, useRef, useState } from 'react';

export function Card({
  title,
  subtitle,
  children,
  actions,
  className,
  collapsible,
  collapsed,
  onToggle
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const isCollapsed = !!(collapsible && collapsed);
  return (
    <section className={`card${className ? ` ${className}` : ''}${isCollapsed ? ' is-collapsed' : ''}`}>
      <header className="card-head">
        <div className={`card-head-main${collapsible ? ' clickable' : ''}`} onClick={collapsible ? onToggle : undefined}>
          {collapsible && (
            <button
              type="button"
              className="chevron-btn"
              aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              aria-expanded={!isCollapsed}
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
            >
              <span className={isCollapsed ? 'chevron' : 'chevron open'}>›</span>
            </button>
          )}
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      {!isCollapsed && children && <div className="card-body">{children}</div>}
    </section>
  );
}

export function Field({ label, hint, children, grow }: { label: ReactNode; hint?: ReactNode; children: ReactNode; grow?: boolean }) {
  return (
    <label className={grow ? 'field grow' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export const enumOptions = (option: string | Record<string, unknown>) =>
  typeof option === 'string' ? option : String(option || '');

export function fromOptions(opts: (string | Record<string, unknown>)[], current?: string | null) {
  const c = current ?? '';
  const hit = opts.find((o) => {
    const v = enumOptions(o);
    return v === c;
  });
  return hit ? c : '';
}

export function TextInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={mono ? 'input mono' : 'input'} />;
}

export function NumberInput({ value, onChange, disabled }: { value: number | string | undefined; onChange: (v: string) => void; disabled?: boolean }) {
  return <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="input" disabled={disabled} />;
}

function toPickerHex(v?: string): string {
  if (!v) return '#000000';
  const hex = v.replace(/^0[xX]/, '').replace(/^#/, '');
  return hex.length >= 6 && /^[0-9a-fA-F]{6}/.test(hex) ? '#' + hex.slice(0, 6).toLowerCase() : '#000000';
}

export function ColorInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <span className="color-field">
      <input type="color" value={toPickerHex(value)} onChange={(e) => onChange('#' + e.target.value.replace(/^#/, '').toUpperCase())} className="color-swatch" title="Pick a colour" />
      <input
        type="text"
        className="color-hex"
        value={value ?? ''}
        placeholder="#RRGGBB"
        spellCheck={false}
        title="Hex colour — type by hand or use the swatch"
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

export function SelectInput({ value, onChange, options, empty }: { value: string; onChange: (v: string) => void; options: (string | Record<string, unknown>)[]; empty?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map((o) => {
        const v = enumOptions(o);
        return (
          <option key={v} value={v}>
            {v}
          </option>
        );
      })}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={checked ? 'toggle on' : 'toggle'}>
      <span className="knob" />
      {label && <span className="toggle-label">{label}</span>}
    </button>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'subtle' | 'plain';

export function Button({ children, onClick, variant = 'primary', disabled, title }: { children: ReactNode; onClick?: () => void; variant?: BtnVariant; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className={`btn ${variant}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'blue' | 'green' | 'amber' | 'red' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p>{title}</p>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function Padding4({ label, value, onChange }: { label?: string; value: Record<string, number> | undefined; onChange: (v: Record<string, number>) => void }) {
  const set = (axis: string, raw: string) => {
    const next = { top: value?.top ?? 0, bottom: value?.bottom ?? 0, left: value?.left ?? 0, right: value?.right ?? 0 };
    const n = raw === '' ? 0 : Number(raw);
    if (Number.isFinite(n)) {
      next[axis as keyof typeof next] = n;
      onChange(next);
    }
  };
  const axis = ['top', 'bottom', 'left', 'right'] as const;
  return (
    <div className="padding4">
      {label && <span className="padding4-label">{label}</span>}
      {axis.map((a) => (
        <input key={a} type="number" className="input" value={value?.[a] ?? 0} onChange={(e) => set(a, e.target.value)} title={a} />
      ))}
    </div>
  );
}

export interface ToastMsg {
  id: number;
  kind: 'ok' | 'err' | 'info';
  text: string;
}

export function ToastStack({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <button key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  );
}

export function useBusy(): [boolean, (p: Promise<unknown>) => Promise<void>] {
  const [busy, setBusy] = useState(false);
  const run = async (p: Promise<unknown>) => {
    setBusy(true);
    try {
      await p;
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}

export function useInlineEdit<T>(value: T, commit: (v: T) => void) {
  const [local, setLocal] = useState<string>(String(value ?? ''));
  const ref = useRef<T>(value);
  useEffect(() => {
    if (ref.current !== value) {
      ref.current = value;
      setLocal(String(value ?? ''));
    }
  }, [value]);
  const apply = () => {
    if (local !== String(ref.current ?? '')) commit(local as unknown as T);
  };
  return { local, setLocal, apply };
}

export const now = () => new Date().toLocaleTimeString();