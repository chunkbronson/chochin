import { Component } from 'react';
import type { ReactNode } from 'react';
import { Card, Button } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      window.komorebi?.log(`REACT BOUNDARY: ${error.message}\n${error.stack ?? ''}`);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="main">
        <Card
          title="The interface hit an error"
          subtitle="Something crashed while rendering this view."
          actions={<Button onClick={() => window.location.reload()}>Reload</Button>}
        >
          <pre className="console err" style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error.stack ?? this.state.error)}
          </pre>
        </Card>
      </main>
    );
  }
}