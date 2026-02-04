import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.state.errorInfo = errorInfo;
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'white', backgroundColor: '#ef4444', fontFamily: 'monospace' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap' }} open>
                        <summary style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '10px' }}>Error Details (Please share this)</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        <div style={{ marginTop: '10px', opacity: 0.8, fontSize: '0.9em' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                    </details>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/login';
                        }}
                        style={{ marginTop: '20px', padding: '10px', color: 'black' }}
                    >
                        Clear Session & Go to Login
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
