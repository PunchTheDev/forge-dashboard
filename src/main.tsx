import { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import "./index.css";
import App from "./App";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; resetKey: string }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: ErrorBoundaryState & { prevResetKey?: string },
  ) {
    // When the route changes, clear any stale error so the new page renders cleanly.
    if (state.prevResetKey !== props.resetKey && state.error !== null) {
      return { error: null, prevResetKey: props.resetKey };
    }
    return { prevResetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-forge-bg flex items-center justify-center font-mono">
          <div className="text-center max-w-md px-4">
            <div className="text-forge-red text-4xl mb-4">⚠</div>
            <div className="text-white text-lg font-semibold mb-2">Dashboard error</div>
            <div className="text-forge-muted text-sm mb-4 font-mono bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-left">
              {this.state.error.message}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="text-forge-accent text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapper inside BrowserRouter so we can read the current path and pass it as
// a resetKey — the ErrorBoundary clears its error state on every navigation.
function RouteAwareErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteAwareErrorBoundary>
        <App />
      </RouteAwareErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
