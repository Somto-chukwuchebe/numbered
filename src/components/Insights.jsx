import { useState } from 'react';
import Charts from './Charts.jsx';
import Weekly from './Weekly.jsx';

/**
 * Charts and Weekly were two tabs answering the same question — how is this
 * going? They are one tab now, with a sub-switch, so the top nav stays short.
 */
export default function Insights() {
  const [view, setView] = useState('charts');

  return (
    <div className="stack">
      <div className="chipbar" role="tablist" aria-label="Insights view">
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={view === 'charts'}
          aria-pressed={view === 'charts'}
          onClick={() => setView('charts')}
        >
          Charts
        </button>
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={view === 'weekly'}
          aria-pressed={view === 'weekly'}
          onClick={() => setView('weekly')}
        >
          This week
        </button>
      </div>

      {view === 'charts' ? <Charts /> : <Weekly />}
    </div>
  );
}
