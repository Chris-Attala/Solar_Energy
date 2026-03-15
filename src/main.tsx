import { StrictMode, Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error boundary — prevents blank/black screen on crash
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#070c14', color: '#f1f5f9', fontFamily: 'sans-serif', padding: '2rem',
          flexDirection: 'column', gap: '1rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f87171' }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', fontSize: '0.875rem' }}>
            {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem', padding: '0.75rem 2rem', background: '#22c55e',
              color: 'white', border: 'none', borderRadius: '0.75rem',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.875rem'
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
