import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { catColor } from '../lib/palette.js';
import { VERSE, VERSE_REF } from '../lib/brand.jsx';
import {
  dayByCategory,
  dayEntries,
  dayMinutes,
  isHabitDone,
  previousDayEntries,
  recentActivities,
} from '../lib/derive.js';
import { challengeBounds, dayNumber } from '../lib/store.js';
import { addDays, clampKey, daysBetween, fmtDuration, fmtMedium, fmtShort, todayKey, uid } from '../lib/util.js';
import { Card, ConfirmButton, Empty, Meter } from './ui.jsx';

const DURATIONS = [15, 25, 30, 45, 60, 90];

/* ------------------------------------------------------------------
   Quick log — one form for every area.
   Tap an area, tap what you did, tap how long. The third tap logs it.
   ------------------------------------------------------------------ */

function QuickLog({ dateKey }) {
  const { state, actions, isDark, toast } = useApp();
  const cats = state.config.categories;
  const [catId, setCatId] = useState(null);
  const [activity, setActivity] = useState('');
  const [typing, setTyping] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setCatId(null);
    setActivity('');
    setTyping(false);
  }, [dateKey]);

  const cat = cats.find((c) => c.id === catId) || null;
  const recents = useMemo(
    () => (cat ? recentActivities(state, cat.id, dateKey) : []),
    [state.entries, cat, dateKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const commit = (minutes) => {
    if (!cat || !activity.trim() || !minutes) return;
    const id = uid('ent');
    actions.addEntries(dateKey, [{ categoryId: cat.id, activity, minutes }], [id]);
    const label = `${activity.trim()} · ${fmtDuration(minutes)}`;
    setActivity('');
    setTyping(false);
    toast(`Logged ${label}`, {
      label: 'Undo',
      run: () => actions.removeEntries(dateKey, [id]),
    });
  };

  const repeatYesterday = () => {
    const prev = previousDayEntries(state, dateKey);
    if (!prev.length) {
      toast('Nothing logged yesterday to repeat');
      return;
    }
    const ids = prev.map(() => uid('ent'));
    actions.addEntries(
      dateKey,
      prev.map((e) => ({ categoryId: e.categoryId, activity: e.activity, minutes: e.minutes })),
      ids
    );
    toast(`Added ${prev.length} ${prev.length === 1 ? 'entry' : 'entries'} from yesterday`, {
      label: 'Undo',
      run: () => actions.removeEntries(dateKey, ids),
    });
  };

  if (!cats.length) {
    return (
      <Card title="Quick log">
        <Empty>No focus areas yet — add some in Settings.</Empty>
      </Card>
    );
  }

  return (
    <Card title="Quick log" sub="Tap an area, tap what you did, tap how long.">
      <div className="ql">
        <div className="ql__step">
          <span className="ql__legend">
            <span className={'ql__num' + (cat ? ' ql__num--on' : '')}>1</span> Area
          </span>
          <div className="chipbar">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={catId === c.id}
                style={catId === c.id ? { color: catColor(c, isDark) } : undefined}
                onClick={() => {
                  setCatId(catId === c.id ? null : c.id);
                  setActivity('');
                  setTyping(false);
                }}
              >
                <span className="chip__dot" style={{ background: catColor(c, isDark) }} aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="ql__step">
          <span className="ql__legend">
            <span className={'ql__num' + (activity.trim() ? ' ql__num--on' : '')}>2</span> What you did
          </span>
          {!cat ? (
            <p className="small muted" style={{ margin: 0 }}>
              Pick an area first — the things you usually do there appear here.
            </p>
          ) : (
            <>
              {recents.length > 0 && (
                <div className="chipbar">
                  {recents.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className="chip"
                      aria-pressed={activity === a}
                      onClick={() => {
                        setActivity(activity === a ? '' : a);
                        setTyping(false);
                      }}
                    >
                      {a}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="chip chip--ghost"
                    onClick={() => {
                      setTyping(true);
                      setActivity('');
                      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
                    }}
                  >
                    + Something else
                  </button>
                </div>
              )}
              {(typing || recents.length === 0) && (
                <input
                  ref={inputRef}
                  type="text"
                  value={activity}
                  maxLength={200}
                  placeholder={`What did you do for ${cat.name}?`}
                  aria-label={`${cat.name} activity`}
                  onChange={(e) => setActivity(e.target.value)}
                />
              )}
            </>
          )}
        </div>

        <div className="ql__step">
          <span className="ql__legend">
            <span className="ql__num">3</span> How long
          </span>
          <div className="chipbar">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className="chip chip--dur"
                disabled={!cat || !activity.trim()}
                onClick={() => commit(d)}
              >
                {d}m
              </button>
            ))}
            <CustomDuration disabled={!cat || !activity.trim()} onCommit={commit} />
          </div>
        </div>

        <div className="ql__bar">
          <button type="button" className="btn btn--sm" onClick={repeatYesterday}>
            ↻ Repeat yesterday
          </button>
        </div>
      </div>
    </Card>
  );
}

function CustomDuration({ disabled, onCommit }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="chip chip--ghost" disabled={disabled} onClick={() => setOpen(true)}>
        Other
      </button>
    );
  }
  return (
    <form
      className="row row--nowrap"
      style={{ gap: 6 }}
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (n > 0) onCommit(n);
        setValue('');
        setOpen(false);
      }}
    >
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        min="1"
        max="1440"
        value={value}
        placeholder="min"
        aria-label="Custom duration in minutes"
        style={{ width: 90, minHeight: 40 }}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => !value && setOpen(false)}
      />
      <button type="submit" className="btn btn--sm btn--primary">
        Log
      </button>
    </form>
  );
}

/* ---------------- reflection ---------------- */

function Journal({ dateKey }) {
  const { state, actions } = useApp();
  const [text, setText] = useState(state.journal[dateKey] || '');
  const dirty = useRef(false);

  useEffect(() => {
    setText(state.journal[dateKey] || '');
    dirty.current = false;
  }, [dateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => actions.setJournal(dateKey, text), 500);
    return () => clearTimeout(t);
  }, [text, dateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card title="Reflection" sub="Optional — saves itself.">
      <textarea
        rows={3}
        value={text}
        aria-label={`Reflection for ${fmtMedium(dateKey)}`}
        placeholder="What went well? What got in the way?"
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
        }}
      />
    </Card>
  );
}

/* ---------------- the screen ---------------- */

export default function Daily({ dateKey, setDateKey }) {
  const { state, actions, isDark } = useApp();
  const cfg = state.config;
  const { start, end } = challengeBounds(cfg);
  const today = todayKey();

  const entries = dayEntries(state, dateKey);
  const byCat = dayByCategory(state, dateKey);
  const total = dayMinutes(state, dateKey);
  const dayNo = dayNumber(cfg, dateKey);
  const goalTotal = cfg.categories.reduce((s, c) => s + (c.dailyTarget || 0), 0);
  const doneHabits = cfg.habits.filter((h) => isHabitDone(state, dateKey, h.id)).length;

  return (
    <div className="stack">
      <Card>
        <div className="row row--nowrap row--between" style={{ gap: 'var(--sp-2)' }}>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setDateKey(addDays(dateKey, -1))}
            disabled={daysBetween(start, dateKey) <= 0}
            aria-label="Previous day"
          >
            ←
          </button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <h1 style={{ fontSize: '1.1rem' }}>{fmtShort(dateKey)}</h1>
            <p className="small muted" style={{ margin: 0 }}>
              {dayNo ? `Day ${dayNo} of ${cfg.lengthDays}` : 'Outside the challenge'}
              {dateKey === today ? ' · Today' : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setDateKey(addDays(dateKey, 1))}
            disabled={daysBetween(dateKey, end) <= 0}
            aria-label="Next day"
          >
            →
          </button>
        </div>
        {dateKey !== today && daysBetween(start, today) >= 0 && daysBetween(today, end) >= 0 && (
          <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--sp-3)' }}>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setDateKey(clampKey(today, start, end))}>
              Jump to today
            </button>
          </div>
        )}
      </Card>

      <QuickLog dateKey={dateKey} />

      <Card
        title="Logged today"
        sub={entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : undefined}
        actions={
          <span className="serif tnum" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
            {fmtDuration(total)}
          </span>
        }
      >
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-4) var(--sp-3)' }}>
            <p className="verse" style={{ margin: 0 }}>
              “{VERSE}”<span className="verse__ref">{VERSE_REF}</span>
            </p>
          </div>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {entries.map((e) => {
                const c = cfg.categories.find((x) => x.id === e.categoryId);
                return (
                  <li className="entry" key={e.id}>
                    <span
                      className="entry__bar"
                      style={{ background: c ? catColor(c, isDark) : 'var(--text-3)' }}
                      aria-hidden="true"
                    />
                    <span className="grow">
                      <span className="entry__desc">{e.activity}</span>
                      <br />
                      <span className="entry__cat">{c ? c.name : 'Unknown'}</span>
                      {e.note && <span className="entry__note">{e.note}</span>}
                    </span>
                    <span className="entry__min">{fmtDuration(e.minutes)}</span>
                    <ConfirmButton
                      className="btn btn--ghost btn--sm"
                      onConfirm={() => actions.removeEntry(dateKey, e.id)}
                      label="Delete?"
                    >
                      <span aria-hidden="true">✕</span>
                      <span className="sr-only">Delete {e.activity}</span>
                    </ConfirmButton>
                  </li>
                );
              })}
            </ul>
            {goalTotal > 0 && (
              <div className="stack stack--tight" style={{ marginTop: 'var(--sp-4)' }}>
                {cfg.categories
                  .filter((c) => c.dailyTarget)
                  .map((c) => (
                    <Meter
                      key={c.id}
                      label={c.name}
                      valueText={`${fmtDuration(byCat[c.id] || 0)} / ${fmtDuration(c.dailyTarget)}`}
                      value={byCat[c.id] || 0}
                      max={c.dailyTarget}
                      color={catColor(c, isDark)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card
        title="Habits"
        sub={
          cfg.habits.length
            ? `${doneHabits} of ${cfg.habits.length} done`
            : 'No habits defined yet — add some in Settings.'
        }
      >
        {cfg.habits.length > 0 && (
          <div className="htile-grid">
            {cfg.habits.map((h) => {
              const done = isHabitDone(state, dateKey, h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  className="htile"
                  title={h.name}
                  aria-pressed={done}
                  onClick={() => actions.toggleHabit(dateKey, h.id)}
                >
                  <span className="htile__tick" aria-hidden="true">
                    ✓
                  </span>
                  <span className="grow">{h.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Journal dateKey={dateKey} />
    </div>
  );
}
