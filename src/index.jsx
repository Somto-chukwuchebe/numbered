import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './lib/useStore.jsx';
import App from './App.jsx';
import { STORAGE_KEY } from './lib/store.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    let raw = '';
    try {
      raw = localStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      raw = '';
    }
    const rescue = () => {
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tracker-rescue-backup.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    return (
      <main className="wizard" style={{ paddingTop: 40 }}>
        <div className="card stack">
          <h1>Something went wrong</h1>
          <p className="small muted">
            Your data is still saved in this browser. Download a copy, then reload the page.
          </p>
          <pre className="small" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-2)' }}>
            {String(this.state.error)}
          </pre>
          <div className="row">
            <button type="button" className="btn btn--primary btn--sm" onClick={rescue} disabled={!raw}>
              Download my data
            </button>
            <button type="button" className="btn btn--sm" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>
);
