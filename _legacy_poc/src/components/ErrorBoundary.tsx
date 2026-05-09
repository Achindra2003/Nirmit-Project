import { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackError } from '../lib/analytics';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Nirmit ErrorBoundary] Caught render error:', error);
    console.error('[Nirmit ErrorBoundary] Component stack:', info.componentStack);
    trackError('render_error', `[${error.name}] ${error.message}\n${info.componentStack ?? ''}`);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F4F3EE 0%, #EAE2D6 100%)',
            padding: '32px 20px',
            fontFamily: 'var(--f-body), system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {/* Warm illustration using emoji */}
          <div
            style={{
              fontSize: 'clamp(4rem, 8vw, 6rem)',
              marginBottom: 24,
              animation: 'gentleBounce 2s ease-in-out infinite',
            }}
          >
            🏠
          </div>

          {/* Decorative divider */}
          <div
            style={{
              width: 60,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #C8A96E, transparent)',
              marginBottom: 24,
            }}
          />

          <h1
            style={{
              fontFamily: 'var(--f-display), Georgia, serif',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 300,
              color: '#5C4A2E',
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              color: '#8B7355',
              maxWidth: 420,
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            A small hiccup occurred while designing your space. Don't worry — your
            progress is safe, and we can get you back on track.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '12px 32px',
                borderRadius: 9999,
                border: 'none',
                background: '#C8A96E',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'var(--f-body), system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: '0 2px 12px rgba(200, 169, 110, 0.3)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#B8944F';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#C8A96E';
              }}
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                padding: '12px 32px',
                borderRadius: 9999,
                border: '1px solid #C8A96E',
                background: 'transparent',
                color: '#5C4A2E',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'var(--f-body), system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(200, 169, 110, 0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              Start Over
            </button>
          </div>

          {/* Subtle decorative elements */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              opacity: 0.3,
            }}
          >
            {['🪑', '🛋️', '🪴', '✨'].map((emoji, i) => (
              <span
                key={i}
                style={{
                  fontSize: 20,
                  animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                {emoji}
              </span>
            ))}
          </div>

          {/* Keyframe styles injected inline */}
          <style>{`
            @keyframes gentleBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
