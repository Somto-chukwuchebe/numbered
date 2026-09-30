import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { catColor } from '../lib/palette.js';
import { challengeWeeks, weekSummary } from '../lib/derive.js';
import { addDays, daysBetween, fmtDuration, fmtPct, todayKey, weekLabel, weekStart } from '../lib/util.js';
import { Badge, Card, ChartCard, Empty, Meter } from './ui.jsx';
import { Legend, WeeklyArea } from './chartkit.jsx';

function ReviewField({ label, hint, value, onSave, placeholder }) {
  const [text, setText] = useState(value);
  const dirty = useRef(false);
  useEffect(() => {
    setText(value);
    dirty.current = false;
  }, [value]);
  useEffect(() => {
    if (!dirty.current) return undefined;
    const t = setTimeout(() => onSave(text), 500);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="field">
      <span className="label">{label}</span>
      <textarea
        rows={3}
        value={text}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
        }}
      />
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

export default function Weekly() {
  const { state, actions, isDark } = useApp();
  const cfg = state.config;
  const today = todayKey();
  const weeks = useMemo(() => challengeWeeks(cfg), [cfg.startDate, cfg.lengthDays]);
  const [wStart, setWStart] = useState(() => {
    const w = weekStart(today);
    return weeks.includes(w) ? w : weeks[weeks.length - 1] || w;
  });

  const idx = weeks.indexOf(wStart);
  const sum = weekSummary(state, cfg, wStart, today);
  const review = state.reviews[wStart] || { wins: '', misses: '', focus: '' };

  const trend = useMemo(
    () =>
      weeks.map((w, i) => ({
        label: `W${i + 1}`,
        minutes: weekSummary(state, cfg, w, today).minutes,
      })),
    [state, weeks, today]
  );

  if (!weeks.length) return <Empty>No weeks in this challenge yet.</Empty>;

  return (
    <div className="stack">
      <Card
        title={`Week ${idx + 1} of ${weeks.length}`}
        sub={weekLabel(wStart)}
        actions={
          <div className="row row--nowrap">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setWStart(weeks[Math.max(0, idx - 1)])}
              disabled={idx <= 0}
              aria-label="Previous week"
            >
              ←
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                const w = weekStart(today);
                setWStart(weeks.includes(w) ? w : weeks[weeks.length - 1]);
              }}
            >
              This week
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setWStart(weeks[Math.min(weeks.length - 1, idx + 1)])}
              disabled={idx >= weeks.length - 1}
              aria-label="Next week"
            >
              →
            </button>
          </div>
        }
      >
        <div className="stack stack--tight">
          <div className="row" style={{ alignItems: 'baseline', gap: 'var(--sp-3)' }}>
            <span className="hero">{fmtDuration(sum.minutes)}</span>
            <span className="small muted">
              {sum.activeDays} active {sum.activeDays === 1 ? 'day' : 'days'} · {fmtPct(sum.habitRate)} habits
            </span>
          </div>
          {cfg.categories.map((c) => (
            <Meter
              key={c.id}
              label={c.name}
              valueText={fmtDuration(sum.byCategory[c.id] || 0)}
              value={sum.byCategory[c.id] || 0}
              max={Math.max(sum.minutes, 1)}
              color={catColor(c, isDark)}
            />
          ))}
        </div>
      </Card>

      <Card title="Habits this week" sub="Days completed against your weekly target">
        <div className="stack stack--tight">
          {sum.habits.length === 0 && <Empty>No habits defined.</Empty>}
          {sum.habits.map((h) => (
            <div className="row row--between" key={h.id} style={{ gap: 'var(--sp-3)' }}>
              <span className="grow small">{h.name}</span>
              <div className="row" style={{ gap: 4 }}>
                {sum.days.map((k) => {
                  const done = !!(state.habitLog[k] && state.habitLog[k][h.id]);
                  return (
                    <span
                      key={k}
                      className={'heat__cell' + (done ? ' heat__cell--on' : '')}
                      title={`${k} — ${done ? 'done' : 'not done'}`}
                    />
                  );
                })}
              </div>
              <Badge tone={h.hitTarget ? 'good' : undefined}>
                {h.done}
                {h.target ? ` / ${h.target}` : ''}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <ChartCard
        title="Minutes per week"
        sub="Across the whole challenge"
        table={
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Dates</th>
                <th scope="col">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((w, i) => (
                <tr key={weeks[i]}>
                  <th scope="row">{w.label}</th>
                  <td style={{ textAlign: 'left' }}>{weekLabel(weeks[i])}</td>
                  <td>{w.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <WeeklyArea data={trend} isDark={isDark} height={160} />
      </ChartCard>

      <Card title="Weekly review" sub="Three prompts. Saved automatically to this week.">
        <div className="stack stack--tight">
          <ReviewField
            label="Wins"
            placeholder="What went well this week?"
            value={review.wins}
            onSave={(wins) => actions.setReview(wStart, { wins })}
          />
          <ReviewField
            label="Misses"
            placeholder="What slipped, and why?"
            value={review.misses}
            onSave={(misses) => actions.setReview(wStart, { misses })}
          />
          <ReviewField
            label="Focus for next week"
            placeholder="One or two things to change."
            value={review.focus}
            onSave={(focus) => actions.setReview(wStart, { focus })}
          />
        </div>
      </Card>
    </div>
  );
}
