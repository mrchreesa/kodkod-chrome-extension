import React from 'react'
import ReactDOM from 'react-dom/client'
import KodKodApp from './KodKodApp'
import { ThemeProvider } from './components/ThemeProvider'
import './index.css'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          <h1 className="font-bold">Something went wrong.</h1>
          <pre className="text-xs mt-2 overflow-auto bg-gray-100 p-2 rounded">{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="kodkod-theme">
        <KodKodApp />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
