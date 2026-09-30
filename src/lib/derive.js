/* Pure selectors over state. Everything the dashboard, charts and stats read. */

import {
  addDays,
  dateRange,
  daysBetween,
  fmtDuration,
  pct,
  todayKey,
  weekStart,
} from './util.js';
import { endDate, elapsedDays } from './store.js';

/** Entries for a day (always an array). */
export function dayEntries(state, key) {
  return state.entries[key] || [];
}

export function dayMinutes(state, key) {
  return dayEntries(state, key).reduce((s, e) => s + e.minutes, 0);
}

/** { [categoryId]: minutes } for one day. */
export function dayByCategory(state, key) {
  const out = {};
  dayEntries(state, key).forEach((e) => {
    out[e.categoryId] = (out[e.categoryId] || 0) + e.minutes;
  });
  return out;
}

/** All date keys in the challenge window. */
export function challengeDays(config) {
  return dateRange(config.startDate, endDate(config));
}

/** Challenge days that have already started (up to today). */
export function pastDays(config, today = todayKey()) {
  const n = elapsedDays(config, today);
  if (n <= 0) return [];
  return dateRange(config.startDate, addDays(config.startDate, n - 1));
}

/** Totals across the whole challenge: { total, byCategory, activeDays, entryCount }. */
export function totals(state, days) {
  const byCategory = {};
  let total = 0;
  let activeDays = 0;
  let entryCount = 0;
  days.forEach((k) => {
    const list = dayEntries(state, k);
    if (!list.length) return;
    let dayTotal = 0;
    list.forEach((e) => {
      byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.minutes;
      dayTotal += e.minutes;
      entryCount += 1;
    });
    total += dayTotal;
    if (dayTotal > 0) activeDays += 1;
  });
  return { total, byCategory, activeDays, entryCount };
}

/**
 * Cumulative minutes per category per day: [{ date, total, [catId]: n }].
 * Days after `until` (default today) carry nulls, so a line stops at the
 * present instead of flat-lining across days that haven't happened yet.
 */
export function cumulativeSeries(state, days, categories, until = todayKey()) {
  const running = {};
  categories.forEach((c) => {
    running[c.id] = 0;
  });
  let runningTotal = 0;
  return days.map((k) => {
    const future = daysBetween(k, until) < 0;
    const byCat = dayByCategory(state, k);
    if (!future) {
      categories.forEach((c) => {
        running[c.id] += byCat[c.id] || 0;
      });
      runningTotal += Object.values(byCat).reduce((a, b) => a + b, 0);
    }
    const row = { date: k, total: future ? null : runningTotal };
    categories.forEach((c) => {
      row[c.id] = future ? null : running[c.id];
    });
    return row;
  });
}

/** Per-day minutes per category: [{ date, [catId]: n, total }]. */
export function dailySeries(state, days, categories) {
  return days.map((k) => {
    const byCat = dayByCategory(state, k);
    const row = { date: k, total: 0 };
    categories.forEach((c) => {
      row[c.id] = byCat[c.id] || 0;
      row.total += row[c.id];
    });
    return row;
  });
}

/* ---------- habits ---------- */

export function isHabitDone(state, key, habitId) {
  const day = state.habitLog[key];
  return !!(day && day[habitId]);
}

export function dayHabitCount(state, key, habits) {
  return habits.reduce((n, h) => n + (isHabitDone(state, key, h.id) ? 1 : 0), 0);
}

/**
 * Streaks & completion for one habit.
 * `current` counts back from today (or from the challenge end once it is over),
 * and tolerates "not yet done today" so an unlogged today doesn't zero a streak.
 */
export function habitStats(state, habit, config, today = todayKey()) {
  const days = challengeDays(config);
  const end = endDate(config);
  const upTo = daysBetween(today, end) >= 0 ? today : end;
  const elapsed = days.filter((k) => daysBetween(k, upTo) >= 0);

  let longest = 0;
  let run = 0;
  let completed = 0;
  days.forEach((k) => {
    if (isHabitDone(state, k, habit.id)) {
      run += 1;
      completed += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  });

  // current streak: walk backwards from `upTo`
  let current = 0;
  let cursor = upTo;
  if (!isHabitDone(state, cursor, habit.id)) cursor = addDays(cursor, -1); // today still open
  while (daysBetween(config.startDate, cursor) >= 0 && isHabitDone(state, cursor, habit.id)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const rate = pct(completed, elapsed.length);
  return {
    habitId: habit.id,
    name: habit.name,
    completed,
    elapsed: elapsed.length,
    rate,
    current,
    longest,
    doneToday: isHabitDone(state, today, habit.id),
  };
}

export function allHabitStats(state, config, today = todayKey()) {
  return config.habits.map((h) => habitStats(state, h, config, today));
}

/** Overall habit completion % across elapsed days. */
export function habitCompletionOverall(state, config, today = todayKey()) {
  const habits = config.habits;
  if (!habits.length) return { rate: 0, done: 0, possible: 0 };
  const days = pastDays(config, today);
  let done = 0;
  days.forEach((k) => {
    done += dayHabitCount(state, k, habits);
  });
  const possible = days.length * habits.length;
  return { rate: pct(done, possible), done, possible };
}

/* ---------- weeks ---------- */

/** Week windows that overlap the challenge, Monday-start. */
export function challengeWeeks(config) {
  const start = weekStart(config.startDate);
  const end = endDate(config);
  const out = [];
  let cur = start;
  let guard = 0;
  while (daysBetween(cur, end) >= 0 && guard++ < 600) {
    out.push(cur);
    cur = addDays(cur, 7);
  }
  return out;
}

/** Days of a week that fall inside the challenge. */
export function weekDays(config, wStart) {
  const end = endDate(config);
  return dateRange(wStart, addDays(wStart, 6)).filter(
    (k) => daysBetween(config.startDate, k) >= 0 && daysBetween(k, end) >= 0
  );
}

export function weekSummary(state, config, wStart, today = todayKey()) {
  const days = weekDays(config, wStart);
  const t = totals(state, days);
  const habits = config.habits.map((h) => {
    const done = days.filter((k) => isHabitDone(state, k, h.id)).length;
    return {
      id: h.id,
      name: h.name,
      done,
      target: h.weeklyTarget,
      hitTarget: h.weeklyTarget ? done >= h.weeklyTarget : null,
    };
  });
  const elapsedInWeek = days.filter((k) => daysBetween(k, today) >= 0).length;
  const possible = elapsedInWeek * config.habits.length;
  const doneCount = habits.reduce(
    (n, h) => n + days.filter((k) => daysBetween(k, today) >= 0 && isHabitDone(state, k, h.id)).length,
    0
  );
  return {
    weekStart: wStart,
    days,
    minutes: t.total,
    byCategory: t.byCategory,
    activeDays: t.activeDays,
    habits,
    habitRate: pct(doneCount, possible),
  };
}

/* ---------- goals & milestones ---------- */

export function goalProgress(config) {
  const total = config.goals.length;
  const done = config.goals.filter((g) => g.done).length;
  return { total, done, rate: pct(done, total) };
}

const STREAK_TIERS = [3, 7, 14, 21, 30, 50, 75, 100];
const HOUR_TIERS = [5, 10, 25, 50, 100, 200, 300, 500];

/**
 * Motivating callouts that are true right now. Each has a stable key so the app
 * can tell which ones the user has already seen.
 */
export function milestones(state, config, today = todayKey()) {
  const out = [];
  const stats = allHabitStats(state, config, today);

  stats.forEach((s) => {
    const tier = [...STREAK_TIERS].reverse().find((t) => s.current >= t);
    if (tier) {
      out.push({
        key: `streak:${s.habitId}:${tier}`,
        icon: '🔥',
        text: `${tier}-day ${s.name} streak!`,
        weight: tier,
      });
    }
  });

  const days = challengeDays(config);
  const t = totals(state, days);
  const hours = t.total / 60;
  const hourTier = [...HOUR_TIERS].reverse().find((h) => hours >= h);
  if (hourTier) {
    out.push({
      key: `hours:${hourTier}`,
      icon: '⏱',
      text: `${hourTier} hours invested — ${fmtDuration(t.total)} in total.`,
      weight: hourTier / 2,
    });
  }

  const elapsed = elapsedDays(config, today);
  if (elapsed > 0) {
    const consistency = pct(t.activeDays, elapsed);
    if (consistency >= 80 && elapsed >= 7) {
      out.push({
        key: `consistency:${Math.floor(consistency / 10) * 10}:${Math.floor(elapsed / 7)}`,
        icon: '📈',
        text: `You have logged time on ${Math.round(consistency)}% of days so far.`,
        weight: 40,
      });
    }
  }

  const gp = goalProgress(config);
  if (gp.total && gp.done) {
    out.push({
      key: `goals:${gp.done}/${gp.total}`,
      icon: '✅',
      text: `${gp.done} of ${gp.total} goals marked complete.`,
      weight: 30 + gp.done,
    });
  }

  const quarter = [75, 50, 25].find((q) => pct(elapsed, config.lengthDays) >= q);
  if (quarter) {
    out.push({
      key: `progress:${quarter}`,
      icon: '🚩',
      text: `${quarter}% of the way through the challenge.`,
      weight: quarter / 3,
    });
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, 4);
}

/** Habits with no tick yet for `key`. */
export function outstandingHabits(state, config, key) {
  return config.habits.filter((h) => !isHabitDone(state, key, h.id));
}


/**
 * The activities you actually use for a category, most-used first, with a
 * bonus for the last fortnight so the list follows what you're doing now.
 * Falls back to nothing when there is no history — the free-text field covers it.
 */
export function recentActivities(state, categoryId, today = todayKey(), limit = 4) {
  const score = new Map();
  Object.keys(state.entries).forEach((k) => {
    const age = daysBetween(k, today);
    if (age < 0) return;
    const weight = age <= 14 ? 2 : 1;
    state.entries[k]
      .filter((e) => e.categoryId === categoryId && e.activity.trim())
      .forEach((e) => {
        const name = e.activity.trim();
        score.set(name, (score.get(name) || 0) + weight);
      });
  });
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

/** Yesterday's entries, for the one-press repeat. */
export function previousDayEntries(state, key) {
  return dayEntries(state, addDays(key, -1));
}
