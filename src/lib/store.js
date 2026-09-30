/* State shape, defaults, persistence and mutations.
 *
 * Everything lives in one JSON blob in localStorage. No backend, no login.
 */

import { uid, todayKey, addDays, daysBetween, isValidKey, clamp } from './util.js';
import { nextSwatch, DEFAULT_SWATCH_ORDER } from './palette.js';

export const STORAGE_KEY = 'numbered.v1';
export const LEGACY_STORAGE_KEY = 'pdt.v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_CATEGORIES = [
  { name: 'Spiritual', swatch: 'blue', dailyTarget: 30, totalTarget: null },
  { name: 'Mental', swatch: 'amber', dailyTarget: 30, totalTarget: null },
  { name: 'Career', swatch: 'teal', dailyTarget: 60, totalTarget: null },
  { name: 'Finances', swatch: 'violet', dailyTarget: 20, totalTarget: null },
];

export const DEFAULT_HABITS = [
  { name: 'Quiet Time', weeklyTarget: 7 },
  { name: 'Prayer', weeklyTarget: 7 },
  { name: 'Reading', weeklyTarget: 5 },
  { name: 'Listening to Message/Podcast', weeklyTarget: 5 },
  { name: 'Deep Work', weeklyTarget: 5 },
  { name: 'Create', weeklyTarget: 3 },
];

export function makeCategory(seed = {}, used = []) {
  return {
    id: uid('cat'),
    name: seed.name || 'New category',
    swatch: seed.swatch || nextSwatch(used),
    dailyTarget: seed.dailyTarget == null ? null : seed.dailyTarget,
    totalTarget: seed.totalTarget == null ? null : seed.totalTarget,
  };
}

export function makeHabit(seed = {}) {
  return {
    id: uid('hab'),
    name: seed.name || 'New habit',
    weeklyTarget: seed.weeklyTarget == null ? null : seed.weeklyTarget,
  };
}

export function makeGoal(seed = {}) {
  return {
    id: uid('goal'),
    title: seed.title || '',
    description: seed.description || '',
    done: !!seed.done,
  };
}

export function defaultState() {
  const start = todayKey();
  const cats = DEFAULT_CATEGORIES.map((c, i) =>
    makeCategory(c, DEFAULT_SWATCH_ORDER.slice(0, i))
  );
  return {
    version: SCHEMA_VERSION,
    setupComplete: false,
    config: {
      name: 'My 90-Day Challenge',
      purpose: '',
      goals: [],
      startDate: start,
      lengthDays: 90,
      categories: cats,
      habits: DEFAULT_HABITS.map(makeHabit),
    },
    entries: {},   // dateKey -> [{ id, categoryId, activity, minutes, note }]
    habitLog: {},  // dateKey -> { habitId: true }
    journal: {},   // dateKey -> string
    reviews: {},   // weekStartKey -> { wins, misses, focus }
    prefs: { theme: 'system', seenMilestones: [] },
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  };
}

/* ---------- normalisation / migration ---------- */

function num(v, fallback = null) {
  if (v === '' || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Accepts anything (old versions, hand-edited or imported files) and returns valid state. */
export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  const cfg = raw.config && typeof raw.config === 'object' ? raw.config : {};
  const seenSwatches = [];

  const categories = (Array.isArray(cfg.categories) ? cfg.categories : [])
    .slice(0, 5)
    .map((c) => {
      const cat = {
        id: typeof c.id === 'string' && c.id ? c.id : uid('cat'),
        name: String(c.name || 'Category').slice(0, 60),
        swatch: DEFAULT_SWATCH_ORDER.includes(c.swatch) ? c.swatch : nextSwatch(seenSwatches),
        dailyTarget: num(c.dailyTarget, null),
        totalTarget: num(c.totalTarget, null),
      };
      seenSwatches.push(cat.swatch);
      return cat;
    });

  const habits = (Array.isArray(cfg.habits) ? cfg.habits : []).slice(0, 40).map((h) => ({
    id: typeof h.id === 'string' && h.id ? h.id : uid('hab'),
    name: String(h.name || 'Habit').slice(0, 80),
    weeklyTarget: num(h.weeklyTarget, null),
  }));

  const goals = (Array.isArray(cfg.goals) ? cfg.goals : []).slice(0, 60).map((g) =>
    makeGoal({ ...g, title: String(g.title || '').slice(0, 140) })
  );

  const startDate = isValidKey(cfg.startDate) ? cfg.startDate : base.config.startDate;
  const lengthDays = clamp(Math.round(num(cfg.lengthDays, 90) || 90), 1, 3650);

  const catIds = new Set(categories.map((c) => c.id));
  const habIds = new Set(habits.map((h) => h.id));

  const entries = {};
  const rawEntries = raw.entries && typeof raw.entries === 'object' ? raw.entries : {};
  Object.keys(rawEntries).forEach((k) => {
    if (!isValidKey(k) || !Array.isArray(rawEntries[k])) return;
    const list = rawEntries[k]
      .filter((e) => e && catIds.has(e.categoryId))
      .map((e) => ({
        id: typeof e.id === 'string' && e.id ? e.id : uid('ent'),
        categoryId: e.categoryId,
        activity: String(e.activity || '').slice(0, 200),
        minutes: clamp(Math.round(num(e.minutes, 0) || 0), 0, 1440),
        note: String(e.note || '').slice(0, 2000),
      }));
    if (list.length) entries[k] = list;
  });

  const habitLog = {};
  const rawLog = raw.habitLog && typeof raw.habitLog === 'object' ? raw.habitLog : {};
  Object.keys(rawLog).forEach((k) => {
    if (!isValidKey(k) || !rawLog[k] || typeof rawLog[k] !== 'object') return;
    const day = {};
    Object.keys(rawLog[k]).forEach((hid) => {
      if (habIds.has(hid) && rawLog[k][hid]) day[hid] = true;
    });
    if (Object.keys(day).length) habitLog[k] = day;
  });

  const journal = {};
  const rawJ = raw.journal && typeof raw.journal === 'object' ? raw.journal : {};
  Object.keys(rawJ).forEach((k) => {
    if (isValidKey(k) && typeof rawJ[k] === 'string' && rawJ[k].trim()) {
      journal[k] = rawJ[k].slice(0, 8000);
    }
  });

  const reviews = {};
  const rawR = raw.reviews && typeof raw.reviews === 'object' ? raw.reviews : {};
  Object.keys(rawR).forEach((k) => {
    const r = rawR[k];
    if (!isValidKey(k) || !r || typeof r !== 'object') return;
    reviews[k] = {
      wins: String(r.wins || '').slice(0, 4000),
      misses: String(r.misses || '').slice(0, 4000),
      focus: String(r.focus || '').slice(0, 4000),
    };
  });

  const theme = ['light', 'dark', 'system'].includes(raw.prefs && raw.prefs.theme)
    ? raw.prefs.theme
    : 'system';

  return {
    version: SCHEMA_VERSION,
    setupComplete: !!raw.setupComplete,
    config: {
      name: String(cfg.name || base.config.name).slice(0, 120),
      purpose: String(cfg.purpose || '').slice(0, 4000),
      goals,
      startDate,
      lengthDays,
      categories: categories.length ? categories : base.config.categories,
      habits,
    },
    entries,
    habitLog,
    journal,
    reviews,
    prefs: {
      theme,
      seenMilestones: Array.isArray(raw.prefs && raw.prefs.seenMilestones)
        ? raw.prefs.seenMilestones.filter((x) => typeof x === 'string').slice(-400)
        : [],
    },
    meta: {
      createdAt: (raw.meta && raw.meta.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}


/* ------------------------------------------------------------------
   The Q4 challenge, ready on first open. Used when this browser has
   nothing stored yet, so the app opens configured rather than empty.
   ------------------------------------------------------------------ */

/** Kept for reference: a worked example of a filled-in config. Not used on first run. */
export function seedState(setupComplete = false) {
  const base = defaultState();
  return {
    ...base,
    setupComplete,
    config: {
      ...base.config,
      name: 'Q4 Self-Development challenge',
      purpose: '',
      goals: [],
      startDate: '2026-10-01',
      lengthDays: 92,
      categories: [
        { id: 'cat_ueymw7874px', name: 'Spiritual', swatch: 'blue', dailyTarget: 30, totalTarget: null },
        { id: 'cat_r97jmrk74px', name: 'Mental', swatch: 'amber', dailyTarget: 30, totalTarget: null },
        { id: 'cat_n2v30b374px', name: 'Career', swatch: 'teal', dailyTarget: 60, totalTarget: null },
        { id: 'cat_s52u94z74px', name: 'Finances', swatch: 'violet', dailyTarget: 20, totalTarget: null },
      ],
      habits: [
        { id: 'hab_gev0yso74px', name: 'Quiet Time', weeklyTarget: 7 },
        { id: 'hab_lu5ew7d74px', name: 'Prayer', weeklyTarget: 7 },
        { id: 'hab_pimllhq74px', name: 'Reading', weeklyTarget: 5 },
        { id: 'hab_tjpzb1574px', name: 'Listening to Message/Podcast', weeklyTarget: 5 },
        { id: 'hab_6sy26jq74px', name: 'Deep Work', weeklyTarget: 5 },
        { id: 'hab_2jnze2374px', name: 'Create', weeklyTarget: 3 },
      ],
    },
  };
}

/* ---------- persistence ---------- */

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not read saved data; starting fresh.', err);
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/* ---------- derived config helpers ---------- */

export function endDate(config) {
  return addDays(config.startDate, Math.max(0, config.lengthDays - 1));
}

/** Day number (1-based) for a date key, or null when outside the challenge. */
export function dayNumber(config, key) {
  const n = daysBetween(config.startDate, key) + 1;
  return n >= 1 && n <= config.lengthDays ? n : null;
}

export function challengeBounds(config) {
  return { start: config.startDate, end: endDate(config) };
}

/** How many days of the challenge have started (capped at length). */
export function elapsedDays(config, today = todayKey()) {
  return clamp(daysBetween(config.startDate, today) + 1, 0, config.lengthDays);
}

export function daysRemaining(config, today = todayKey()) {
  return clamp(config.lengthDays - elapsedDays(config, today), 0, config.lengthDays);
}

export function exportPayload(state) {
  return {
    app: 'personal-development-tracker',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    setupComplete: state.setupComplete,
    config: state.config,
    entries: state.entries,
    habitLog: state.habitLog,
    journal: state.journal,
    reviews: state.reviews,
    prefs: state.prefs,
    meta: state.meta,
  };
}
