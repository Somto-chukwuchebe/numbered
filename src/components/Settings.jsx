import { useRef, useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { challengeDays, dayEntries } from '../lib/derive.js';
import { challengeBounds, dayNumber, exportPayload, normalize } from '../lib/store.js';
import { download, fmtMedium, slug, toCsv, todayKey, weekLabel } from '../lib/util.js';
import { Card, Callout, ConfirmButton, Modal, Segmented, TextArea, TextField } from './ui.jsx';
import { CategoryEditor, GoalEditor, HabitEditor, PeriodEditor } from './editors.jsx';
import { APP_NAME, VERSE, VERSE_REF } from '../lib/brand.jsx';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function Settings() {
  const { state, actions, toast } = useApp();
  const cfg = state.config;
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // parsed import awaiting confirmation

  const base = slug(cfg.name);

  const exportJson = () => {
    download(`${base}-backup-${stamp()}.json`, JSON.stringify(exportPayload(state), null, 2), 'application/json');
    toast('Backup downloaded');
  };

  const exportDailyCsv = () => {
    const rows = [['Date', 'Day', 'Focus area', 'Activity', 'Minutes', 'Note']];
    challengeDays(cfg).forEach((k) => {
      dayEntries(state, k).forEach((e) => {
        const cat = cfg.categories.find((c) => c.id === e.categoryId);
        rows.push([k, dayNumber(cfg, k) || '', cat ? cat.name : 'Unknown', e.activity, e.minutes, e.note]);
      });
    });
    download(`${base}-daily-log-${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast(`Daily log exported (${rows.length - 1} rows)`);
  };

  const exportHabitCsv = () => {
    const rows = [['Date', 'Day', ...cfg.habits.map((h) => h.name), 'Completed', 'Total habits']];
    challengeDays(cfg).forEach((k) => {
      const day = state.habitLog[k] || {};
      const marks = cfg.habits.map((h) => (day[h.id] ? 1 : 0));
      rows.push([k, dayNumber(cfg, k) || '', ...marks, marks.reduce((a, b) => a + b, 0), cfg.habits.length]);
    });
    download(`${base}-habit-log-${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast('Habit log exported');
  };

  const exportNotesCsv = () => {
    const rows = [['Type', 'Date / week', 'Field', 'Text']];
    Object.keys(state.journal)
      .sort()
      .forEach((k) => rows.push(['Reflection', k, 'reflection', state.journal[k]]));
    Object.keys(state.reviews)
      .sort()
      .forEach((k) => {
        const r = state.reviews[k];
        ['wins', 'misses', 'focus'].forEach((f) => {
          if (r[f]) rows.push(['Weekly review', weekLabel(k), f, r[f]]);
        });
      });
    download(`${base}-reflections-${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast('Reflections exported');
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const preview = normalize(parsed);
        setPending({
          raw: parsed,
          name: preview.config.name,
          entries: Object.values(preview.entries).reduce((n, l) => n + l.length, 0),
          days: Object.keys(preview.entries).length,
          habits: preview.config.habits.length,
          categories: preview.config.categories.length,
        });
      } catch (err) {
        toast('That file is not valid backup JSON');
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="stack">
      <Card title="Challenge" sub="Name and purpose">
        <div className="stack stack--tight">
          <TextField label="Challenge name" value={cfg.name} onChange={(name) => actions.updateConfig({ name })} maxLength={120} />
          <TextArea
            label="Purpose statement"
            rows={4}
            value={cfg.purpose}
            onChange={(purpose) => actions.updateConfig({ purpose })}
          />
          <p className="verse">
            “{VERSE}”<span className="verse__ref">{VERSE_REF}</span>
          </p>
        </div>
      </Card>

      <Card title="Tracking period">
        <PeriodEditor config={cfg} onChange={actions.updateConfig} />
      </Card>

      <Card title="Focus areas" sub="1 to 5 areas, each with a colour and optional time goals">
        <CategoryEditor categories={cfg.categories} onChange={actions.setCategories} />
      </Card>

      <Card title="Daily habits">
        <HabitEditor habits={cfg.habits} onChange={actions.setHabits} />
      </Card>

      <Card title="Goals" sub="Reorder with the arrows; tick one off when you achieve it">
        <GoalEditor goals={cfg.goals} onChange={actions.setGoals} showDone />
      </Card>

      <Card title="Appearance">
        <Segmented
          label="Theme"
          value={state.prefs.theme}
          onChange={actions.setTheme}
          options={[
            { value: 'system', label: 'Match system' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Card>

      <Card title="Backup & data" sub={`Everything lives in this browser only. ${APP_NAME} never uploads anything — export regularly.`}>
        <div className="stack stack--tight">
          <div className="row">
            <button type="button" className="btn btn--primary btn--sm" onClick={exportJson}>
              Export backup (JSON)
            </button>
            <button type="button" className="btn btn--sm" onClick={exportDailyCsv}>
              Daily log (CSV)
            </button>
            <button type="button" className="btn btn--sm" onClick={exportHabitCsv}>
              Habit log (CSV)
            </button>
            <button type="button" className="btn btn--sm" onClick={exportNotesCsv}>
              Reflections (CSV)
            </button>
          </div>

          <hr className="sep" style={{ margin: 'var(--sp-2) 0' }} />

          <div className="row">
            <button type="button" className="btn btn--sm" onClick={() => fileRef.current && fileRef.current.click()}>
              Import backup (JSON)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="sr-only"
              aria-label="Choose a backup file to import"
            />
            <span className="small muted">Replaces, does not merge — export this device first if it has newer entries.</span>
          </div>

          <hr className="sep" style={{ margin: 'var(--sp-2) 0' }} />

          <div className="row row--between">
            <span className="small muted">
              Started {fmtMedium(state.meta.createdAt.slice(0, 10))} · {Object.keys(state.entries).length} days with
              entries
            </span>
            <ConfirmButton
              className="btn btn--sm btn--danger"
              label="Erase everything — sure?"
              onConfirm={() => {
                actions.resetAll();
                toast('All data erased');
              }}
            >
              Reset all data
            </ConfirmButton>
          </div>
        </div>
      </Card>

      <Card title="Re-run setup" sub="Walk through the setup wizard again with your current values">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            actions.reopenSetup();
            window.scrollTo({ top: 0 });
          }}
        >
          Open setup wizard
        </button>
      </Card>

      {pending && (
        <Modal title="Import this backup?" onClose={() => setPending(null)}>
          <div className="stack stack--tight">
            <Callout icon="⚠">
              <strong>This replaces everything in this browser — it does not merge.</strong> Any entries logged here
              that aren’t in the file will be lost. If you’ve logged on this device since the backup was made, export
              it first.
            </Callout>
            <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-2)' }}>
              <li>Challenge: {pending.name}</li>
              <li>{pending.categories} focus areas · {pending.habits} habits</li>
              <li>
                {pending.entries} entries across {pending.days} days
              </li>
            </ul>
            <div className="row row--between">
              <button type="button" className="btn" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  actions.replaceState({ ...pending.raw, setupComplete: true });
                  setPending(null);
                  toast('Backup imported');
                }}
              >
                Replace my data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
