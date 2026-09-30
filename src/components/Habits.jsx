import { useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { allHabitStats, challengeDays, dayHabitCount, isHabitDone } from '../lib/derive.js';
import { challengeBounds } from '../lib/store.js';
import {
  addDays,
  daysBetween,
  dowShort,
  fmtMedium,
  fromKeyDow,
  fmtPct,
  todayKey,
  weekLabel,
  weekStart,
} from '../lib/util.js';
import { Badge, Card, Empty } from './ui.jsx';

/** GitHub-style calendar: 7 rows (Mon–Sun), one column per week. */
function HeatStrip({ habit }) {
  const { state } = useApp();
  const days = challengeDays(state.config);
  const today = todayKey();
  if (!days.length) return null;
  const pad = (fromKeyDow(days[0]) + 6) % 7; // blanks before the first day

  return (
    <div className="row row--nowrap" style={{ alignItems: 'flex-start', gap: 0 }}>
      <div className="heat__rows" aria-hidden="true">
        <span />
        <span>Tue</span>
        <span />
        <span>Thu</span>
        <span />
        <span>Sat</span>
        <span />
      </div>
      <div className="heat heat--cal" role="img" aria-label={`Completion calendar for ${habit.name}`}>
        {Array.from({ length: pad }, (_, i) => (
          <span key={'p' + i} className="heat__cell heat__cell--pad" />
        ))}
        {days.map((k) => {
          const done = isHabitDone(state, k, habit.id);
          const future = daysBetween(today, k) > 0;
          return (
            <span
              key={k}
              title={`${fmtMedium(k)} — ${done ? 'done' : future ? 'upcoming' : 'not done'}`}
              className={
                'heat__cell' +
                (done ? ' heat__cell--on' : '') +
                (future && !done ? ' heat__cell--future' : '') +
                (k === today ? ' heat__cell--today' : '')
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Habits({ dateKey, setDateKey }) {
  const { state, actions } = useApp();
  const cfg = state.config;
  const { start, end } = challengeBounds(cfg);
  const today = todayKey();
  const [wStart, setWStart] = useState(() => weekStart(dateKey || today));

  const week = Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  const inRange = (k) => daysBetween(start, k) >= 0 && daysBetween(k, end) >= 0;
  const stats = allHabitStats(state, cfg, today);

  const prevDisabled = daysBetween(start, addDays(wStart, 6)) < 0;
  const nextDisabled = daysBetween(addDays(wStart, 7), end) < 0;

  if (!cfg.habits.length) {
    return (
      <Card title="Habits">
        <Empty>No habits defined yet — add some in Settings.</Empty>
      </Card>
    );
  }

  return (
    <div className="stack">
      <Card
        title="Habit grid"
        sub={weekLabel(wStart)}
        actions={
          <div className="row row--nowrap">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setWStart(addDays(wStart, -7))}
              disabled={prevDisabled}
              aria-label="Previous week"
            >
              ←
            </button>
            <button type="button" className="btn btn--sm" onClick={() => setWStart(weekStart(today))}>
              This week
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setWStart(addDays(wStart, 7))}
              disabled={nextDisabled}
              aria-label="Next week"
            >
              →
            </button>
          </div>
        }
      >
        <div className="scroll-x">
          <table className="habit-grid">
            <caption className="sr-only">Habit completion for {weekLabel(wStart)}. Tap a cell to toggle.</caption>
            <thead>
              <tr>
                <th scope="col">Habit</th>
                {week.map((k) => (
                  <th scope="col" key={k}>
                    <span style={{ display: 'block' }}>{dowShort(k)}</span>
                    <span className="muted tnum" style={{ fontWeight: 400 }}>
                      {Number(k.slice(8))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.habits.map((h) => (
                <tr key={h.id}>
                  <th scope="row" className="habit-name" style={{ minWidth: 132 }}>
                    {h.name}
                  </th>
                  {week.map((k) => {
                    const ok = inRange(k);
                    const done = isHabitDone(state, k, h.id);
                    return (
                      <td key={k}>
                        <button
                          type="button"
                          className="hbox"
                          aria-pressed={done}
                          disabled={!ok}
                          style={!ok ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                          aria-label={`${h.name} on ${fmtMedium(k)}`}
                          onClick={() => actions.toggleHabit(k, h.id)}
                        >
                          <span aria-hidden="true">{done ? '✓' : ''}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className="small muted">
                  Done that day
                </th>
                {week.map((k) => (
                  <td key={k} className="small tnum muted">
                    {inRange(k) ? `${dayHabitCount(state, k, cfg.habits)}/${cfg.habits.length}` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid--2">
        {cfg.habits.map((h) => {
          const s = stats.find((x) => x.habitId === h.id);
          return (
            <Card key={h.id} title={h.name} sub={`${s.completed} of ${s.elapsed} days so far`}>
              <div className="stack stack--tight">
                <div className="row" style={{ gap: 'var(--sp-2)' }}>
                  <Badge tone={s.current >= 3 ? 'gold' : undefined}>
                    <span aria-hidden="true">🔥</span> {s.current} day streak
                  </Badge>
                  <Badge>Best {s.longest}</Badge>
                  <Badge>{fmtPct(s.rate)}</Badge>
                  {h.weeklyTarget ? <Badge>Target {h.weeklyTarget}/wk</Badge> : null}
                </div>
                <HeatStrip habit={h} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
