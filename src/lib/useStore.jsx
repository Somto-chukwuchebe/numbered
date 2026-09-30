import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, normalize, defaultState, makeGoal } from './store.js';
import { uid, clamp } from './util.js';

const Ctx = createContext(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState());
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [toast, setToastRaw] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const toastTimer = useRef(null);

  /* --- persist on every change (debounced a tick) --- */
  const saveRef = useRef(null);
  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      const res = saveState(state);
      if (!res.ok) {
        setSaveError(
          'Your browser refused to save (storage may be full or private browsing is on). Export a backup to be safe.'
        );
      } else {
        setSaveError(null);
      }
    }, 150);
    return () => clearTimeout(saveRef.current);
  }, [state]);

  /* --- theme --- */
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const isDark = state.prefs.theme === 'dark' || (state.prefs.theme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toastFn = useCallback((msg, action) => {
    setToastRaw(action ? { msg, action } : { msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastRaw(null), action ? 5200 : 2800);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastRaw(null);
  }, []);

  const actions = useMemo(() => {
    const patch = (fn) => setState((s) => fn(s));

    return {
      /* config */
      updateConfig: (p) => patch((s) => ({ ...s, config: { ...s.config, ...p } })),
      /** Removing a category also drops the entries that pointed at it. */
      setCategories: (categories) =>
        patch((s) => {
          const live = new Set(categories.map((c) => c.id));
          const gone = s.config.categories.some((c) => !live.has(c.id));
          if (!gone) return { ...s, config: { ...s.config, categories } };
          const entries = {};
          Object.keys(s.entries).forEach((k) => {
            const list = s.entries[k].filter((e) => live.has(e.categoryId));
            if (list.length) entries[k] = list;
          });
          return { ...s, config: { ...s.config, categories }, entries };
        }),

      /** Removing a habit also drops its ticks. */
      setHabits: (habits) =>
        patch((s) => {
          const live = new Set(habits.map((h) => h.id));
          const gone = s.config.habits.some((h) => !live.has(h.id));
          if (!gone) return { ...s, config: { ...s.config, habits } };
          const habitLog = {};
          Object.keys(s.habitLog).forEach((k) => {
            const day = {};
            Object.keys(s.habitLog[k]).forEach((id) => {
              if (live.has(id)) day[id] = true;
            });
            if (Object.keys(day).length) habitLog[k] = day;
          });
          return { ...s, config: { ...s.config, habits }, habitLog };
        }),
      setGoals: (goals) => patch((s) => ({ ...s, config: { ...s.config, goals } })),
      addGoal: (seed) =>
        patch((s) => ({ ...s, config: { ...s.config, goals: [...s.config.goals, makeGoal(seed)] } })),
      updateGoal: (id, p) =>
        patch((s) => ({
          ...s,
          config: {
            ...s.config,
            goals: s.config.goals.map((g) => (g.id === id ? { ...g, ...p } : g)),
          },
        })),
      removeGoal: (id) =>
        patch((s) => ({
          ...s,
          config: { ...s.config, goals: s.config.goals.filter((g) => g.id !== id) },
        })),
      moveGoal: (id, dir) =>
        patch((s) => {
          const goals = [...s.config.goals];
          const i = goals.findIndex((g) => g.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= goals.length) return s;
          [goals[i], goals[j]] = [goals[j], goals[i]];
          return { ...s, config: { ...s.config, goals } };
        }),

      completeSetup: () => patch((s) => ({ ...s, setupComplete: true })),
      reopenSetup: () => patch((s) => ({ ...s, setupComplete: false })),

      /* daily entries */
      addEntry: (dateKey, entry) =>
        patch((s) => {
          const list = s.entries[dateKey] || [];
          const next = [
            ...list,
            {
              id: uid('ent'),
              categoryId: entry.categoryId,
              activity: String(entry.activity || '').trim().slice(0, 200),
              minutes: clamp(Math.round(Number(entry.minutes) || 0), 0, 1440),
              note: String(entry.note || '').trim().slice(0, 2000),
            },
          ];
          return { ...s, entries: { ...s.entries, [dateKey]: next } };
        }),
      updateEntry: (dateKey, id, p) =>
        patch((s) => {
          const list = s.entries[dateKey] || [];
          return {
            ...s,
            entries: {
              ...s.entries,
              [dateKey]: list.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      ...p,
                      minutes:
                        p.minutes == null
                          ? e.minutes
                          : clamp(Math.round(Number(p.minutes) || 0), 0, 1440),
                    }
                  : e
              ),
            },
          };
        }),
      /** Add several entries at once; returns nothing, ids are generated here. */
      addEntries: (dateKey, list, ids) =>
        patch((s) => {
          const existing = s.entries[dateKey] || [];
          const next = list.map((entry, i) => ({
            id: ids[i],
            categoryId: entry.categoryId,
            activity: String(entry.activity || '').trim().slice(0, 200),
            minutes: clamp(Math.round(Number(entry.minutes) || 0), 0, 1440),
            note: String(entry.note || '').trim().slice(0, 2000),
          }));
          return { ...s, entries: { ...s.entries, [dateKey]: [...existing, ...next] } };
        }),
      removeEntries: (dateKey, ids) =>
        patch((s) => {
          const drop = new Set(ids);
          const list = (s.entries[dateKey] || []).filter((e) => !drop.has(e.id));
          const entries = { ...s.entries };
          if (list.length) entries[dateKey] = list;
          else delete entries[dateKey];
          return { ...s, entries };
        }),
      removeEntry: (dateKey, id) =>
        patch((s) => {
          const list = (s.entries[dateKey] || []).filter((e) => e.id !== id);
          const entries = { ...s.entries };
          if (list.length) entries[dateKey] = list;
          else delete entries[dateKey];
          return { ...s, entries };
        }),

      /* habits */
      toggleHabit: (dateKey, habitId) =>
        patch((s) => {
          const day = { ...(s.habitLog[dateKey] || {}) };
          if (day[habitId]) delete day[habitId];
          else day[habitId] = true;
          const habitLog = { ...s.habitLog };
          if (Object.keys(day).length) habitLog[dateKey] = day;
          else delete habitLog[dateKey];
          return { ...s, habitLog };
        }),

      /* journal + reviews */
      setJournal: (dateKey, text) =>
        patch((s) => {
          const journal = { ...s.journal };
          if (text && text.trim()) journal[dateKey] = text.slice(0, 8000);
          else delete journal[dateKey];
          return { ...s, journal };
        }),
      setReview: (weekKey, p) =>
        patch((s) => {
          const cur = s.reviews[weekKey] || { wins: '', misses: '', focus: '' };
          const next = { ...cur, ...p };
          const reviews = { ...s.reviews };
          if (next.wins || next.misses || next.focus) reviews[weekKey] = next;
          else delete reviews[weekKey];
          return { ...s, reviews };
        }),

      /* prefs */
      setTheme: (theme) => patch((s) => ({ ...s, prefs: { ...s.prefs, theme } })),
      markSeen: (keys) =>
        patch((s) => ({
          ...s,
          prefs: {
            ...s.prefs,
            seenMilestones: Array.from(new Set([...s.prefs.seenMilestones, ...keys])).slice(-400),
          },
        })),

      /* whole-state */
      replaceState: (raw) => setState(normalize(raw)),
      resetAll: () => setState({ ...defaultState(), prefs: { theme: 'system', seenMilestones: [] } }),
    };
  }, []);

  const value = useMemo(
    () => ({ state, actions, isDark, toast: toastFn, dismissToast, toastMsg: toast, saveError }),
    [state, actions, isDark, toastFn, dismissToast, toast, saveError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
