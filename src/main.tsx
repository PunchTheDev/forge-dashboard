import { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
