import { useMemo, useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { catColor } from '../lib/palette.js';
import { VERSE, VERSE_REF } from '../lib/brand.jsx';
import {
  allHabitStats,
  challengeDays,
  cumulativeSeries,
  dayByCategory,
  dayEntries,
  goalProgress,
  habitCompletionOverall,
  milestones,
  outstandingHabits,
  pastDays,
  totals,
} from '../lib/derive.js';
import { challengeBounds, daysRemaining, elapsedDays } from '../lib/store.js';
import { clampKey, daysBetween, fmtCompact, fmtDuration, fmtMedium, fmtPct, pct, todayKey } from '../lib/util.js';
import { Badge, Callout, Card, ChartCard, Empty, Meter } from './ui.jsx';
import { CumulativeChart, CumulativeTable, Legend } from './chartkit.jsx';

export default function Dashboard({ onNavigate, setDateKey }) {
  const { state, actions, isDark } = useApp();
  const cfg = state.config;
  const today = todayKey();
  const { start, end } = challengeBounds(cfg);

  const days = useMemo(() => challengeDays(cfg), [cfg.startDate, cfg.lengthDays]);
  const elapsed = useMemo(() => pastDays(cfg, today), [cfg.startDate, cfg.lengthDays, today]);
  const t = useMemo(() => totals(state, days), [state.entries, days]);
  const habitOverall = habitCompletionOverall(state, cfg, today);
  const stats = allHabitStats(state, cfg, today);
  const best = stats.reduce((a, b) => (b.current > (a ? a.current : -1) ? b : a), null);
  const elapsedN = elapsedDays(cfg, today);
  const remaining = daysRemaining(cfg, today);

  /* Before the challenge opens (or after it closes) "today" sits outside the
     window, so the hero follows the nearest day inside it — and Log time lands
     on the same day the hero is describing. */
  const focus = clampKey(today, start, end);
  const focusEntries = dayEntries(state, focus);
  const focusByCat = dayByCategory(state, focus);
  const focusTotal = focusEntries.reduce((s, e) => s + e.minutes, 0);
  const outstanding = outstandingHabits(state, cfg, focus);
  const goalTotal = cfg.categories.reduce((s, c) => s + (c.dailyTarget || 0), 0);

  const notStarted = daysBetween(today, start) > 0;
  const finished = daysBetween(end, today) > 0;

  const cumData = useMemo(
    () => cumulativeSeries(state, elapsed.length ? elapsed : days.slice(0, 1), cfg.categories, today),
    [state.entries, elapsed.length, days, cfg.categories, today]
  );
  const lastRow = cumData[cumData.length - 1] || {};

  const ms = useMemo(() => milestones(state, cfg, today), [state, cfg, today]);
  const gp = goalProgress(cfg);
  const timeGoalCats = cfg.categories.filter((c) => c.totalTarget || c.dailyTarget);
  const [showPurpose, setShowPurpose] = useState(false);
  const hasData = t.total > 0;

  return (
    <div className="stack">
      {/* --- today, the reason you opened the app --- */}
      <Card className="card card--hero">
        <div className="row row--between" style={{ alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
          <div>
            <div className="hero-label">
              {notStarted
                ? `Day 1 · ${fmtMedium(start)}`
                : finished
                ? `Last day · ${fmtMedium(end)}`
                : `Today · ${fmtMedium(today)}`}
            </div>
            <div className="hero" style={{ marginTop: 4 }}>
              {fmtDuration(focusTotal)}
            </div>
            <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>
              {goalTotal > 0 && `of ${fmtDuration(goalTotal)} daily goal · `}
              {cfg.habits.length - outstanding.length}/{cfg.habits.length} habits
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setDateKey(focus);
              onNavigate('daily');
            }}
          >
            Log time
          </button>
        </div>

        {cfg.categories.some((c) => c.dailyTarget) && (
          <div className="stack stack--tight" style={{ marginTop: 'var(--sp-4)' }}>
            {cfg.categories
              .filter((c) => c.dailyTarget)
              .map((c) => (
                <Meter
                  key={c.id}
                  label={c.name}
                  valueText={`${fmtDuration(focusByCat[c.id] || 0)} / ${fmtDuration(c.dailyTarget)}`}
                  value={focusByCat[c.id] || 0}
                  max={c.dailyTarget}
                  color={catColor(c, isDark)}
                />
              ))}
          </div>
        )}

        {outstanding.length > 0 && (
          <p className="small" style={{ opacity: 0.8, margin: 'var(--sp-4) 0 0' }}>
            Still open: {outstanding.map((h) => h.name).join(', ')}
          </p>
        )}
      </Card>

      {/* --- the challenge at a glance --- */}
      <Card>
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <h1>{cfg.name}</h1>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              {fmtMedium(start)} → {fmtMedium(end)} ·{' '}
              {notStarted ? 'Not started yet' : finished ? 'Complete' : `Day ${elapsedN} of ${cfg.lengthDays}`}
            </p>
          </div>
          {cfg.purpose && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-expanded={showPurpose}
              onClick={() => setShowPurpose((v) => !v)}
            >
              {showPurpose ? 'Hide purpose' : 'Why I’m doing this'}
            </button>
          )}
        </div>

        {showPurpose && cfg.purpose && (
          <blockquote
            style={{
              margin: 'var(--sp-3) 0 0',
              paddingLeft: 'var(--sp-3)',
              borderLeft: '3px solid var(--accent-mark)',
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {cfg.purpose}
          </blockquote>
        )}

        <div className="meter" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="meter__top">
            <span className="grow" style={{ fontWeight: 500 }}>
              Challenge progress
            </span>
            <span className="tnum" style={{ fontWeight: 650 }}>
              {fmtPct(pct(elapsedN, cfg.lengthDays))}
            </span>
          </div>
          <div
            className="meter__track"
            role="progressbar"
            aria-label="Challenge progress"
            aria-valuenow={Math.round(pct(elapsedN, cfg.lengthDays))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="meter__fill"
              style={{ width: pct(elapsedN, cfg.lengthDays) + '%', background: 'var(--accent-mark)' }}
            />
          </div>
        </div>
      </Card>

      {/* --- stat strip --- */}
      <div className="strip">
        {[
          ['Total invested', fmtDuration(t.total), `${t.entryCount} entries`],
          ['Active days', fmtCompact(t.activeDays), elapsedN ? `${Math.round(pct(t.activeDays, elapsedN))}% of days so far` : '—'],
          ['Habit rate', fmtPct(habitOverall.rate), `${habitOverall.done} ticks`],
          ['Best streak', best && best.current ? `${best.current}d` : '0d', best && best.current ? best.name : 'No active streak'],
        ].map(([label, value, foot]) => (
          <div className="strip__cell" key={label}>
            <div className="stat">
              <span className="stat__label">{label}</span>
              <span className="stat__value">{value}</span>
              <span className="stat__foot">{foot}</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- one line of encouragement, not four banners --- */}
      {ms.length > 0 && (
        <div className="callout">
          <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>
            {ms[0].icon}
          </span>
          <span className="grow">
            <strong>{ms[0].text}</strong>
            {ms.slice(1, 3).map((m) => (
              <span key={m.key}>
                <span className="callout__sep"> · </span>
                {m.text}
              </span>
            ))}
          </span>
        </div>
      )}

      {notStarted && (
        <Callout icon="◷" tone="info">
          Your challenge opens on {fmtMedium(start)} — that’s day 1. Anything you log from the panel above goes to that
          day, so you can get ahead tonight.
        </Callout>
      )}

      {/* --- the centrepiece --- */}
      <ChartCard
        title="Cumulative time by focus area"
        sub="How each area’s investment builds across the challenge"
        table={<CumulativeTable data={cumData} categories={cfg.categories} />}
        actions={
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigate('insights')}>
            All charts
          </button>
        }
      >
        {hasData ? (
          <div className="stack stack--tight">
            <CumulativeChart data={cumData} categories={cfg.categories} isDark={isDark} height={270} />
            <Legend
              items={cfg.categories.map((c) => ({
                key: c.id,
                name: c.name,
                color: catColor(c, isDark),
                line: true,
                value: fmtDuration(lastRow[c.id] || 0),
              }))}
            />
          </div>
        ) : (
          <Empty>Log your first session and the lines start here.</Empty>
        )}
      </ChartCard>

      <div className="grid grid--2">
        {/* --- where the time went: a bar, not a pie --- */}
        <ChartCard
          title="Where the time went"
          sub={`${fmtDuration(t.total)} across ${elapsedN} ${elapsedN === 1 ? 'day' : 'days'}`}
          table={
            <table className="dtable">
              <thead>
                <tr>
                  <th scope="col">Focus area</th>
                  <th scope="col">Minutes</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {cfg.categories.map((c) => (
                  <tr key={c.id}>
                    <th scope="row">{c.name}</th>
                    <td>{fmtCompact(t.byCategory[c.id] || 0)}</td>
                    <td>{fmtPct(pct(t.byCategory[c.id] || 0, t.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {hasData ? (
            <div className="stack stack--tight">
              <div className="split" role="img" aria-label="Share of total time by focus area">
                {cfg.categories
                  .filter((c) => t.byCategory[c.id])
                  .map((c) => (
                    <i
                      key={c.id}
                      style={{
                        width: pct(t.byCategory[c.id], t.total) + '%',
                        background: catColor(c, isDark),
                      }}
                    />
                  ))}
              </div>
              <Legend
                items={cfg.categories.map((c) => ({
                  key: c.id,
                  name: c.name,
                  color: catColor(c, isDark),
                  value: fmtDuration(t.byCategory[c.id] || 0),
                  pct: fmtPct(pct(t.byCategory[c.id] || 0, t.total)),
                }))}
              />
            </div>
          ) : (
            <Empty>Nothing logged yet.</Empty>
          )}
        </ChartCard>

        {/* --- goals --- */}
        <Card title="Goal progress" sub="Time goals and written goals">
          <div className="stack stack--tight">
            {timeGoalCats.length === 0 && gp.total === 0 && (
              <div>
                <p className="small muted">No goals set yet.</p>
                <p className="verse" style={{ marginTop: 'var(--sp-3)' }}>
                  “{VERSE}”<span className="verse__ref">{VERSE_REF}</span>
                </p>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ marginTop: 'var(--sp-3)' }}
                  onClick={() => onNavigate('settings')}
                >
                  Add goals in Settings
                </button>
              </div>
            )}

            {timeGoalCats.map((c) => {
              const done = t.byCategory[c.id] || 0;
              const target = c.totalTarget || (c.dailyTarget || 0) * cfg.lengthDays;
              return (
                <Meter
                  key={c.id}
                  label={c.name}
                  valueText={`${fmtDuration(done)} / ${fmtDuration(target)}`}
                  value={done}
                  max={target}
                  color={catColor(c, isDark)}
                  foot={c.totalTarget ? 'Total goal' : `Daily goal × ${cfg.lengthDays} days`}
                />
              );
            })}

            {gp.total > 0 && (
              <>
                <hr className="sep" style={{ margin: 'var(--sp-2) 0' }} />
                <div className="row row--between">
                  <span className="small" style={{ fontWeight: 500 }}>
                    Written goals
                  </span>
                  <Badge tone={gp.done === gp.total ? 'good' : undefined}>
                    {gp.done} / {gp.total} complete
                  </Badge>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {cfg.goals.map((g) => (
                    <li key={g.id} style={{ padding: '4px 0' }}>
                      <label className="row row--nowrap small" style={{ gap: 'var(--sp-2)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={g.done}
                          style={{ width: 20, height: 20, minHeight: 0, flex: 'none' }}
                          onChange={(e) => actions.updateGoal(g.id, { done: e.target.checked })}
                        />
                        <span
                          className="grow"
                          style={{
                            textDecoration: g.done ? 'line-through' : 'none',
                            color: g.done ? 'var(--text-3)' : 'var(--text-1)',
                          }}
                        >
                          {g.title || 'Untitled goal'}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
