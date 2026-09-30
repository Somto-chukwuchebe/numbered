import { useMemo, useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { catColor } from '../lib/palette.js';
import { challengeDays, cumulativeSeries, dailySeries, isHabitDone, totals } from '../lib/derive.js';
import { challengeBounds } from '../lib/store.js';
import {
  addDays,
  clampKey,
  dateRange,
  daysBetween,
  fmtCompact,
  fmtDuration,
  fmtMedium,
  fmtPct,
  pct,
  todayKey,
} from '../lib/util.js';
import { Card, ChartCard, Empty } from './ui.jsx';
import {
  CategoryDonut,
  CumulativeChart,
  CumulativeTable,
  DailyStacked,
  DailyTable,
  HabitBars,
  Legend,
} from './chartkit.jsx';

const PRESETS = [
  { id: 'all', label: 'Whole challenge' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function Charts() {
  const { state, isDark } = useApp();
  const cfg = state.config;
  const today = todayKey();
  const { start, end } = challengeBounds(cfg);
  const cappedToday = clampKey(today, start, end);

  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);

  const range = useMemo(() => {
    if (preset === 'all') return { from: start, to: end };
    if (preset === '7') return { from: clampKey(addDays(cappedToday, -6), start, end), to: cappedToday };
    if (preset === '30') return { from: clampKey(addDays(cappedToday, -29), start, end), to: cappedToday };
    return { from: clampKey(from, start, end), to: clampKey(to, start, end) };
  }, [preset, from, to, start, end, cappedToday]);

  const days = useMemo(
    () => (daysBetween(range.from, range.to) >= 0 ? dateRange(range.from, range.to) : []),
    [range.from, range.to]
  );

  const t = useMemo(() => totals(state, days), [state, days]);
  const cumData = useMemo(() => cumulativeSeries(state, days, cfg.categories), [state, days, cfg.categories]);
  const elapsedDaysInRange = useMemo(() => days.filter((k) => daysBetween(k, today) >= 0), [days, today]);
  const dailyData = useMemo(
    () => dailySeries(state, elapsedDaysInRange, cfg.categories),
    [state, elapsedDaysInRange, cfg.categories]
  );
  const lastRow = cumData[cumData.length - 1] || {};

  const habitRates = useMemo(() => {
    const elapsed = days.filter((k) => daysBetween(k, today) >= 0);
    return cfg.habits.map((h) => {
      const completed = elapsed.filter((k) => isHabitDone(state, k, h.id)).length;
      return {
        habitId: h.id,
        name: h.name,
        completed,
        elapsed: elapsed.length,
        rate: pct(completed, elapsed.length),
      };
    });
  }, [state, days, cfg.habits, today]);

  if (!cfg.categories.length) {
    return (
      <Card title="Charts">
        <Empty>Add some focus areas in Settings first.</Empty>
      </Card>
    );
  }

  return (
    <div className="stack">
      <Card title="Charts" sub="One filter, applied to every chart below.">
        <div className="stack stack--tight">
          <div className="chipbar" role="group" aria-label="Date range">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={preset === p.id}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="row row--nowrap" style={{ gap: 'var(--sp-2)' }}>
              <label className="sr-only" htmlFor="range-from">
                Range start
              </label>
              <input
                id="range-from"
                type="date"
                value={from}
                min={start}
                max={end}
                onChange={(e) => e.target.value && setFrom(e.target.value)}
              />
              <span className="muted">→</span>
              <label className="sr-only" htmlFor="range-to">
                Range end
              </label>
              <input
                id="range-to"
                type="date"
                value={to}
                min={start}
                max={end}
                onChange={(e) => e.target.value && setTo(e.target.value)}
              />
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>
            {days.length ? `${fmtMedium(range.from)} → ${fmtMedium(range.to)} · ${days.length} days · ${fmtDuration(t.total)} logged` : 'Empty range — pick an end date on or after the start date.'}
          </p>
        </div>
      </Card>

      <ChartCard
        title="Cumulative time by focus area"
        sub="Minutes accumulated across the selected range"
        table={<CumulativeTable data={cumData} categories={cfg.categories} />}
      >
        <div className="stack stack--tight">
          <CumulativeChart data={cumData} categories={cfg.categories} isDark={isDark} height={320} />
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
      </ChartCard>

      <div className="grid grid--2">
        <ChartCard
          title="Time by focus area"
          sub={`${fmtDuration(t.total)} in the selected range`}
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
          <div className="stack stack--tight">
            <CategoryDonut byCategory={t.byCategory} categories={cfg.categories} isDark={isDark} height={220} />
            <Legend
              items={cfg.categories.map((c) => ({
                key: c.id,
                name: c.name,
                color: catColor(c, isDark),
                value: fmtDuration(t.byCategory[c.id] || 0),
              }))}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Habit completion"
          sub="Share of elapsed days each habit was completed"
          table={
            <table className="dtable">
              <thead>
                <tr>
                  <th scope="col">Habit</th>
                  <th scope="col">Days done</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                {habitRates.map((h) => (
                  <tr key={h.habitId}>
                    <th scope="row">{h.name}</th>
                    <td>
                      {h.completed} / {h.elapsed}
                    </td>
                    <td>{fmtPct(h.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HabitBars stats={habitRates} isDark={isDark} />
        </ChartCard>
      </div>

      <ChartCard
        title="Daily time by focus area"
        sub="Stacked minutes per day"
        table={<DailyTable data={dailyData} categories={cfg.categories} />}
      >
        <div className="stack stack--tight">
          <DailyStacked data={dailyData} categories={cfg.categories} isDark={isDark} height={280} />
          <Legend
            items={cfg.categories.map((c) => ({
              key: c.id,
              name: c.name,
              color: catColor(c, isDark),
              value: fmtDuration(t.byCategory[c.id] || 0),
            }))}
          />
        </div>
      </ChartCard>
    </div>
  );
}
