import { useEffect, useId, useRef, useState } from 'react';
import { fmtCompact } from '../lib/util.js';

export function Card({ title, sub, actions, children, flush, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={'card' + (flush ? ' card--flush' : '')} {...rest}>
      {(title || actions) && (
        <header className="card__head">
          <div className="grow">
            {title && <h2 className="card__title">{title}</h2>}
            {sub && <p className="card__sub">{sub}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function StatTile({ label, value, foot, hero }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className={hero ? 'hero' : 'stat__value'}>{value}</span>
      {foot && <span className="stat__foot">{foot}</span>}
    </div>
  );
}

export function Meter({ label, valueText, value, max, color, foot }) {
  const p = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter">
      <div className="meter__top">
        <span className="grow small" style={{ fontWeight: 500 }}>
          {label}
        </span>
        <span className="small tnum" style={{ fontWeight: 600 }}>
          {valueText}
        </span>
      </div>
      <div
        className="meter__track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(p)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="meter__fill" style={{ width: p + '%', background: color }} />
      </div>
      {foot && <span className="small muted">{foot}</span>}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

export function TextField({ label, hint, value, onChange, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function NumberField({ label, hint, value, onChange, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value == null ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        {...rest}
      />
    </Field>
  );
}

export function TextArea({ label, hint, value, onChange, rows = 4, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="chipbar" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, labelledBy }) {
  const ref = useRef(null);
  const headingId = useId();

  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    if (node) {
      const focusable = node.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || node).focus();
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(
          node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled && el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (prev && prev.focus) prev.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || headingId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="row row--between" style={{ marginBottom: 'var(--sp-3)' }}>
          <h2 id={headingId} className="card__title">
            {title}
          </h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two-step destructive action — no browser confirm() dialogs. */
export function ConfirmButton({ children, onConfirm, label = 'Confirm?', className = 'btn btn--sm btn--danger' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? label : children}
    </button>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="toast">
      <span>{toast.msg}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.run();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Badge({ children, tone }) {
  return <span className={'badge' + (tone ? ' badge--' + tone : '')}>{children}</span>;
}

export function Callout({ icon, children, tone }) {
  return (
    <div className={'callout' + (tone ? ' callout--' + tone : '')}>
      {icon && (
        <span aria-hidden="true" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
          {icon}
        </span>
      )}
      <div className="grow">{children}</div>
    </div>
  );
}

/**
 * A chart card with a built-in table view twin — every value in a chart is also
 * reachable as text, so nothing is gated behind a tooltip.
 */
export function ChartCard({ title, sub, children, table, defaultTable = false, actions }) {
  const [showTable, setShowTable] = useState(defaultTable);
  return (
    <Card
      title={title}
      sub={sub}
      actions={
        <div className="row row--nowrap">
          {actions}
          {table && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? 'Show chart' : 'Show data'}
            </button>
          )}
        </div>
      }
    >
      {showTable && table ? <div className="scroll-x">{table}</div> : children}
    </Card>
  );
}

export function CompactNumber({ value }) {
  return <>{fmtCompact(value)}</>;
}
