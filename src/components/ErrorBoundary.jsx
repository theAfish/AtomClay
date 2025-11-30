import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-8">
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-2xl w-full">
                        <h2 className="text-2xl font-bold mb-4 text-red-400">Something went wrong in the Viewer</h2>
                        <p className="mb-4 text-slate-300">
                            An error occurred while rendering the 3D view. This might be due to an invalid structure file or a WebGL issue.
                        </p>
                        <div className="bg-black/50 p-4 rounded overflow-auto max-h-64 font-mono text-sm text-red-300 mb-6">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>
                        <button
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
