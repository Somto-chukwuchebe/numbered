import { useEffect, useState } from 'react';
import { useApp } from './lib/useStore.jsx';
import { challengeBounds, elapsedDays } from './lib/store.js';
import { APP_NAME, TallyMark } from './lib/brand.jsx';
import { clampKey, daysBetween, fmtAxis, pct, todayKey } from './lib/util.js';
import { Toast } from './components/ui.jsx';
import Wizard from './components/Wizard.jsx';
import Dashboard from './components/Dashboard.jsx';
import Daily from './components/Daily.jsx';
import Habits from './components/Habits.jsx';
import Insights from './components/Insights.jsx';
import Settings from './components/Settings.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'daily', label: 'Daily' },
  { id: 'habits', label: 'Habits' },
  { id: 'insights', label: 'Insights' },
  { id: 'settings', label: 'Settings' },
];

function readHash() {
  const h = (window.location.hash || '').replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'dashboard';
}

export default function App() {
  const { state, actions, isDark, toastMsg, dismissToast, saveError } = useApp();
  const cfg = state.config;
  const { start, end } = challengeBounds(cfg);
  const [tab, setTab] = useState(readHash);
  const [dateKey, setDateKeyRaw] = useState(() => clampKey(todayKey(), start, end));

  const setDateKey = (k) => setDateKeyRaw(clampKey(k, start, end));

  useEffect(() => {
    setDateKeyRaw((k) => clampKey(k, start, end));
  }, [start, end]);

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    setTab(id);
    if (window.location.hash !== '#' + id) window.location.hash = id;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (!state.setupComplete) return <Wizard />;

  const today = todayKey();
  const dayNo = elapsedDays(cfg, today);
  const progress = pct(dayNo, cfg.lengthDays);
  const notStarted = daysBetween(today, start) > 0;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <div className="brand">
          <TallyMark size={26} gold="#e0b457" className="brand__mark" />
          <span className="brand__word">{APP_NAME}</span>
        </div>
        <span className="topbar__grow" />
        <span className="topbar__meta">
          {notStarted ? `Starts ${fmtAxis(start)}` : `Day ${dayNo} of ${cfg.lengthDays}`}
        </span>
        <span className="topbar__rule" role="img" aria-label={`${Math.round(progress)} percent through the challenge`}>
          <i style={{ width: progress + '%' }} />
        </span>
        <button
          type="button"
          className="iconbtn"
          onClick={() => actions.setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
        </button>
      </header>

      <nav className="nav" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="nav__item"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => go(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main" id="main" tabIndex={-1}>
        {saveError && (
          <div className="callout callout--warn" style={{ marginBottom: 'var(--sp-4)' }}>
            <span aria-hidden="true">⚠</span>
            <span className="grow">{saveError}</span>
          </div>
        )}

        {tab === 'dashboard' && <Dashboard onNavigate={go} setDateKey={setDateKey} />}
        {tab === 'daily' && <Daily dateKey={dateKey} setDateKey={setDateKey} />}
        {tab === 'habits' && <Habits dateKey={dateKey} setDateKey={setDateKey} />}
        {tab === 'insights' && <Insights />}
        {tab === 'settings' && <Settings />}
      </main>

      <div aria-live="polite" role="status">
        <Toast toast={toastMsg} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
