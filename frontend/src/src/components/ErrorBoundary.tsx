// Error Boundary — captura erros de renderização em toda a árvore de componentes
import { Component, type ReactNode, type ErrorInfo } from 'react';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <span className="text-2xl text-red-400" aria-hidden="true">!</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#f0f0f5]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Algo deu errado
          </h1>
          {this.state.error?.message && (
            <p className="text-sm text-[#9898aa] text-center max-w-md font-mono bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded-md px-4 py-2">
              {this.state.error.message}
            </p>
          )}
          <button
            className="px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onClick={this.handleRetry}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
