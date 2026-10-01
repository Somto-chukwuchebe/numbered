import { useState } from 'react';
import { useApp } from '../lib/useStore.jsx';
import { Card, TextField, TextArea } from './ui.jsx';
import { CategoryEditor, GoalEditor, HabitEditor, PeriodEditor } from './editors.jsx';
import { APP_NAME, TallyMark, VERSE, VERSE_REF } from '../lib/brand.jsx';

const STEPS = ['Challenge', 'Period', 'Focus areas', 'Habits', 'Goals'];

export default function Wizard() {
  const { state, actions } = useApp();
  const [step, setStep] = useState(0);
  const cfg = state.config;

  const last = step === STEPS.length - 1;

  return (
    <main className="wizard" id="main">
      <div className="stack">
        <div>
          <div className="brand" style={{ marginBottom: 'var(--sp-3)' }}>
            <TallyMark size={24} style={{ color: 'var(--brand-deep)' }} />
            <span className="brand__word" style={{ color: 'var(--text-1)' }}>
              {APP_NAME}
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <h1>{STEPS[step]}</h1>
        </div>

        <div className="wizard__steps" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={'wizard__dot' + (i === step ? ' wizard__dot--on' : i < step ? ' wizard__dot--done' : '')}
            />
          ))}
        </div>

        {step === 0 && (
          <Card
            title="Set up your challenge"
            sub="Everything here can be changed later in Settings. Your data stays in this browser — nothing is uploaded."
          >
            <div className="stack stack--tight">
              <p className="verse" style={{ marginBottom: 'var(--sp-2)' }}>
                “{VERSE}”<span className="verse__ref">{VERSE_REF}</span>
              </p>
              <TextField
                label="Challenge name"
                value={cfg.name}
                onChange={(name) => actions.updateConfig({ name })}
                placeholder="e.g. My 90-Day Challenge"
                hint={cfg.name.trim() ? undefined : 'Leave this blank and it will be called “My Challenge” — you can rename it any time.'}
                maxLength={120}
              />
              <TextArea
                label="Purpose statement"
                hint="Why are you doing this? You'll see it on the dashboard when motivation dips."
                rows={5}
                value={cfg.purpose}
                onChange={(purpose) => actions.updateConfig({ purpose })}
                placeholder="I'm running this challenge because…"
              />
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Tracking period" sub="When does the challenge run?">
            <PeriodEditor config={cfg} onChange={actions.updateConfig} />
          </Card>
        )}

        {step === 2 && (
          <Card
            title="Focus areas"
            sub="1 to 5 areas of life you're investing time in. Time goals are optional."
          >
            <CategoryEditor categories={cfg.categories} onChange={actions.setCategories} />
          </Card>
        )}

        {step === 3 && (
          <Card title="Daily habits" sub="The things you want to tick off each day. A weekly target is optional.">
            <HabitEditor habits={cfg.habits} onChange={actions.setHabits} />
          </Card>
        )}

        {step === 4 && (
          <Card title="Goals" sub="Optional — the outcomes you want by the end. You can mark them complete later.">
            <GoalEditor goals={cfg.goals} onChange={actions.setGoals} />
          </Card>
        )}

        <div className="row row--between">
          <button
            type="button"
            className="btn"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          <div className="row">
            {!last && (
              <button type="button" className="btn btn--ghost" onClick={() => actions.completeSetup()}>
                Skip setup
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                // A blank name must never block you: fall back rather than dead-end.
                if (step === 0 && !cfg.name.trim()) actions.updateConfig({ name: 'My Challenge' });
                if (last) actions.completeSetup();
                else setStep((s) => s + 1);
              }}
            >
              {last ? 'Start challenge' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
