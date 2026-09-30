import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { catColor, SWATCHES } from '../lib/palette.js';
import { fmtAxis, fmtDuration, fmtInt, fmtMedium, fmtPct } from '../lib/util.js';

const AXIS_TICK = { fill: 'var(--text-3)', fontSize: 11 };
const GRID = 'var(--grid)';
const AXIS = 'var(--axis)';
const SURFACE = 'var(--surface-1)';

/* ---------- shared bits ---------- */

export function Legend({ items }) {
  return (
    <ul className="legend" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li className="legend__item" key={it.key}>
          <span
            className={it.line ? 'swatch swatch--line' : 'swatch'}
            style={{ background: it.color }}
            aria-hidden="true"
          />
          <span className="legend__name">{it.name}</span>
          {it.value != null && <span className="legend__val">{it.value}</span>}
          {it.pct != null && <span className="legend__pct">{it.pct}</span>}
        </li>
      ))}
    </ul>
  );
}

function TipBox({ heading, rows }) {
  return (
    <div className="tip">
      <div className="tip__head">{heading}</div>
      {rows.map((r) => (
        <div className="tip__row" key={r.key}>
          <span className="swatch" style={{ background: r.color }} aria-hidden="true" />
          <span className="grow">{r.name}</span>
          <span className="tip__val">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function makeSeriesTooltip(categories, isDark, { headingFmt, valueFmt, hideZero }) {
  return function SeriesTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    const rows = payload
      .filter((p) => (hideZero ? p.value > 0 : true))
      .map((p) => {
        const cat = categories.find((c) => c.id === p.dataKey);
        return {
          key: p.dataKey,
          name: cat ? cat.name : p.name,
          color: cat ? catColor(cat, isDark) : p.color,
          value: valueFmt(p.value),
        };
      });
    if (!rows.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
      <TipBox
        heading={headingFmt(label)}
        rows={[...rows, { key: '__t', name: 'Total', color: 'transparent', value: valueFmt(total) }]}
      />
    );
  };
}

/* ---------- 1. Cumulative minutes (the centrepiece) ---------- */

export function CumulativeChart({ data, categories, isDark, height = 300 }) {
  const Tip = useMemo(
    () =>
      makeSeriesTooltip(categories, isDark, {
        headingFmt: (l) => fmtMedium(l),
        valueFmt: (v) => fmtDuration(v),
        hideZero: false,
      }),
    [categories, isDark]
  );

  if (!data.length) return <p className="empty">Nothing to plot yet.</p>;

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtAxis}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            minTickGap={44}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={46}
            tickFormatter={(v) => fmtInt(v)}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: AXIS, strokeWidth: 1 }} />
          {categories.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.id}
              name={c.name}
              stroke={catColor(c, isDark)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeTable({ data, categories }) {
  const filled = data.filter((r) => r.total != null);
  const rows = filled.filter(
    (_, i) => i % Math.max(1, Math.ceil(filled.length / 30)) === 0 || i === filled.length - 1
  );
  return (
    <table className="dtable">
      <caption className="sr-only">Cumulative minutes by category</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          {categories.map((c) => (
            <th scope="col" key={c.id}>
              {c.name}
            </th>
          ))}
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.date}>
            <th scope="row">{fmtMedium(r.date)}</th>
            {categories.map((c) => (
              <td key={c.id}>{fmtInt(r[c.id])}</td>
            ))}
            <td>{fmtInt(r.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- 2. Time by category (donut) ---------- */

export function CategoryDonut({ byCategory, categories, isDark, height = 240 }) {
  const data = categories
    .map((c) => ({ id: c.id, name: c.name, value: byCategory[c.id] || 0, color: catColor(c, isDark) }))
    .filter((d) => d.value > 0);

  if (!data.length) return <p className="empty">Log some time to see this split.</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload;
              return (
                <TipBox
                  heading={p.name}
                  rows={[
                    { key: 'm', name: 'Time', color: p.color, value: fmtDuration(p.value) },
                    {
                      key: 's',
                      name: 'Share',
                      color: 'transparent',
                      value: fmtPct((p.value / total) * 100),
                    },
                  ]}
                />
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- 3. Habit completion (single series) ---------- */

export function HabitBars({ stats, isDark, height }) {
  const color = isDark ? SWATCHES[0].dark : SWATCHES[0].light;
  const data = stats.map((s) => ({ name: s.name, rate: Math.round(s.rate), done: s.completed, of: s.elapsed }));
  if (!data.length) return <p className="empty">No habits defined yet.</p>;
  const h = height || Math.max(160, data.length * 42 + 40);

  return (
    <div className="chart-frame" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            tickFormatter={(v) => v + '%'}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-3)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload;
              return (
                <TipBox
                  heading={p.name}
                  rows={[
                    { key: 'r', name: 'Completion', color, value: p.rate + '%' },
                    { key: 'd', name: 'Days done', color: 'transparent', value: `${p.done} of ${p.of}` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="rate" fill={color} barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="rate"
              position="right"
              formatter={(v) => v + '%'}
              style={{ fill: 'var(--text-2)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- 4. Daily time by category (stacked) ---------- */

export function DailyStacked({ data, categories, isDark, height = 260 }) {
  const Tip = useMemo(
    () =>
      makeSeriesTooltip(categories, isDark, {
        headingFmt: (l) => fmtMedium(l),
        valueFmt: (v) => fmtDuration(v),
        hideZero: true,
      }),
    [categories, isDark]
  );
  if (!data.length) return <p className="empty">Nothing to plot yet.</p>;

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barCategoryGap="18%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtAxis}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            minTickGap={40}
            interval="preserveStartEnd"
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} tickFormatter={(v) => fmtInt(v)} />
          <Tooltip content={<Tip />} cursor={{ fill: 'var(--surface-3)' }} />
          {categories.map((c, i) => (
            <Bar
              key={c.id}
              dataKey={c.id}
              name={c.name}
              stackId="a"
              fill={catColor(c, isDark)}
              stroke={SURFACE}
              strokeWidth={data.length > 45 ? 1 : 2}
              maxBarSize={24}
              radius={i === categories.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyTable({ data, categories }) {
  const rows = data.filter((r) => r.total > 0).slice(-40).reverse();
  if (!rows.length) return <p className="empty">No time logged in this range.</p>;
  return (
    <table className="dtable">
      <caption className="sr-only">Minutes logged per day by category</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          {categories.map((c) => (
            <th scope="col" key={c.id}>
              {c.name}
            </th>
          ))}
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.date}>
            <th scope="row">{fmtMedium(r.date)}</th>
            {categories.map((c) => (
              <td key={c.id}>{r[c.id] ? fmtInt(r[c.id]) : '—'}</td>
            ))}
            <td>{fmtInt(r.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- 5. Weekly minutes (small area, dashboard) ---------- */

export function WeeklyArea({ data, isDark, height = 140 }) {
  const color = isDark ? SWATCHES[0].dark : SWATCHES[0].light;
  if (!data.length) return null;
  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: AXIS }} minTickGap={30} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => fmtInt(v)} />
          <Tooltip
            cursor={{ stroke: AXIS, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              return (
                <TipBox
                  heading={label}
                  rows={[{ key: 'm', name: 'Time logged', color, value: fmtDuration(payload[0].value) }]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
