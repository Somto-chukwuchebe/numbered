import { useId } from 'react';
import { SWATCHES, swatchById } from '../lib/palette.js';
import { makeCategory, makeHabit, makeGoal } from '../lib/store.js';
import { addDays, daysBetween, fmtMedium, isValidKey, clamp } from '../lib/util.js';
import { ConfirmButton, Field } from './ui.jsx';

/* ---------------- period ---------------- */

export function PeriodEditor({ config, onChange, isDark }) {
  const startId = useId();
  const lenId = useId();
  const endId = useId();
  const end = addDays(config.startDate, Math.max(0, config.lengthDays - 1));

  const setStart = (v) => {
    if (!isValidKey(v)) return;
    onChange({ startDate: v });
  };
  const setLength = (v) => {
    const n = clamp(Math.round(Number(v) || 0), 1, 3650);
    onChange({ lengthDays: n });
  };
  const setEnd = (v) => {
    if (!isValidKey(v)) return;
    const n = daysBetween(config.startDate, v) + 1;
    if (n < 1) return;
    onChange({ lengthDays: clamp(n, 1, 3650) });
  };

  return (
    <div className="stack stack--tight">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--sp-3)' }}>
        <Field label="Start date" htmlFor={startId}>
          <input id={startId} type="date" value={config.startDate} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Length (days)" htmlFor={lenId}>
          <input
            id={lenId}
            type="number"
            inputMode="numeric"
            min="1"
            max="3650"
            value={config.lengthDays}
            onChange={(e) => setLength(e.target.value)}
          />
        </Field>
      </div>
      <Field label="End date" htmlFor={endId} hint="Set either a length or an end date — the other updates to match.">
        <input id={endId} type="date" value={end} min={config.startDate} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      <p className="small muted" style={{ margin: 0 }}>
        {fmtMedium(config.startDate)} → {fmtMedium(end)} · {config.lengthDays} days
      </p>
      <div className="chipbar">
        {[30, 60, 90, 100, 365].map((d) => (
          <button
            key={d}
            type="button"
            className="chip"
            aria-pressed={config.lengthDays === d}
            onClick={() => setLength(d)}
          >
            {d} days
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- categories ---------------- */

function SwatchPicker({ value, onChange, label }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="swatch-picker" role="group" aria-label={label}>
        {SWATCHES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="swatch-btn"
            aria-pressed={value === s.id}
            aria-label={s.name}
            title={s.name}
            onClick={() => onChange(s.id)}
          >
            <span style={{ background: s.light }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CategoryEditor({ categories, onChange }) {
  const update = (id, patch) => onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id) => onChange(categories.filter((c) => c.id !== id));
  const move = (id, dir) => {
    const next = [...categories];
    const i = next.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    if (categories.length >= 5) return;
    onChange([...categories, makeCategory({ name: '' }, categories.map((c) => c.swatch))]);
  };

  return (
    <div className="stack stack--tight">
      {categories.map((c, i) => (
        <div className="listrow" key={c.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row row--nowrap" style={{ gap: 'var(--sp-2)' }}>
            <span className="swatch swatch--lg" style={{ background: swatchById(c.swatch).light }} aria-hidden="true" />
            <input
              type="text"
              className="grow"
              value={c.name}
              placeholder="Category name"
              aria-label={`Category ${i + 1} name`}
              onChange={(e) => update(c.id, { name: e.target.value })}
            />
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--sp-2)' }}>
            <Field label="Daily goal (min)">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="1440"
                placeholder="none"
                value={c.dailyTarget == null ? '' : c.dailyTarget}
                aria-label={`${c.name || 'Category'} daily goal in minutes`}
                onChange={(e) =>
                  update(c.id, { dailyTarget: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Total goal (min)">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="none"
                value={c.totalTarget == null ? '' : c.totalTarget}
                aria-label={`${c.name || 'Category'} total goal in minutes`}
                onChange={(e) =>
                  update(c.id, { totalTarget: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <SwatchPicker
            label="Colour"
            value={c.swatch}
            onChange={(swatch) => update(c.id, { swatch })}
          />
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(c.id, -1)}
              disabled={i === 0}
              aria-label={`Move ${c.name || 'category'} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(c.id, 1)}
              disabled={i === categories.length - 1}
              aria-label={`Move ${c.name || 'category'} down`}
            >
              ↓
            </button>
            <span className="grow" />
            {categories.length > 1 && (
              <ConfirmButton onConfirm={() => remove(c.id)} label="Delete — sure?">
                Remove
              </ConfirmButton>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={add} disabled={categories.length >= 5}>
        + Add category {categories.length >= 5 && '(max 5)'}
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        Removing a category also removes its logged entries from your charts.
      </p>
    </div>
  );
}

/* ---------------- habits ---------------- */

export function HabitEditor({ habits, onChange }) {
  const update = (id, patch) => onChange(habits.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const remove = (id) => onChange(habits.filter((h) => h.id !== id));
  const move = (id, dir) => {
    const next = [...habits];
    const i = next.findIndex((h) => h.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="stack stack--tight">
      {habits.map((h, i) => (
        <div className="listrow" key={h.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <input
            type="text"
            value={h.name}
            placeholder="Habit name"
            aria-label={`Habit ${i + 1} name`}
            onChange={(e) => update(h.id, { name: e.target.value })}
          />
          <div className="row row--nowrap">
            <label className="small muted" htmlFor={`wt-${h.id}`} style={{ whiteSpace: 'nowrap' }}>
              Weekly target
            </label>
            <input
              id={`wt-${h.id}`}
              type="number"
              inputMode="numeric"
              min="0"
              max="7"
              placeholder="—"
              style={{ width: 84 }}
              value={h.weeklyTarget == null ? '' : h.weeklyTarget}
              onChange={(e) =>
                update(h.id, {
                  weeklyTarget: e.target.value === '' ? null : clamp(Number(e.target.value), 0, 7),
                })
              }
            />
            <span className="small muted">days / week</span>
            <span className="grow" />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(h.id, -1)}
              disabled={i === 0}
              aria-label={`Move ${h.name || 'habit'} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(h.id, 1)}
              disabled={i === habits.length - 1}
              aria-label={`Move ${h.name || 'habit'} down`}
            >
              ↓
            </button>
            <ConfirmButton onConfirm={() => remove(h.id)} label="Delete — sure?">
              Remove
            </ConfirmButton>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => onChange([...habits, makeHabit({ name: '' })])}>
        + Add habit
      </button>
    </div>
  );
}

/* ---------------- goals ---------------- */

export function GoalEditor({ goals, onChange, showDone = false }) {
  const update = (id, patch) => onChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const remove = (id) => onChange(goals.filter((g) => g.id !== id));
  const move = (id, dir) => {
    const next = [...goals];
    const i = next.findIndex((g) => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="stack stack--tight">
      {goals.length === 0 && <p className="small muted">No goals yet — add the outcomes you want from this challenge.</p>}
      {goals.map((g, i) => (
        <div className="listrow" key={g.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row row--nowrap">
            <span className="small muted tnum" style={{ minWidth: 18 }}>
              {i + 1}.
            </span>
            <input
              type="text"
              className="grow"
              value={g.title}
              placeholder="Goal"
              aria-label={`Goal ${i + 1} title`}
              onChange={(e) => update(g.id, { title: e.target.value })}
            />
          </div>
          <textarea
            rows={2}
            value={g.description}
            placeholder="Optional description"
            aria-label={`Goal ${i + 1} description`}
            onChange={(e) => update(g.id, { description: e.target.value })}
          />
          <div className="row">
            {showDone && (
              <label className="row row--nowrap small" style={{ gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={g.done}
                  style={{ width: 20, height: 20, minHeight: 0 }}
                  onChange={(e) => update(g.id, { done: e.target.checked })}
                />
                Complete
              </label>
            )}
            <span className="grow" />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(g.id, -1)}
              disabled={i === 0}
              aria-label={`Move goal ${i + 1} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => move(g.id, 1)}
              disabled={i === goals.length - 1}
              aria-label={`Move goal ${i + 1} down`}
            >
              ↓
            </button>
            <ConfirmButton onConfirm={() => remove(g.id)} label="Delete — sure?">
              Remove
            </ConfirmButton>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => onChange([...goals, makeGoal({})])}>
        + Add goal
      </button>
    </div>
  );
}
