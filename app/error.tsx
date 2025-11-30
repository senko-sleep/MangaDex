'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 p-3 rounded-full bg-red-900/50 w-fit">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Something went wrong!</h1>
          <p className="text-gray-400 mt-2">
            An unexpected error occurred while loading this page.
          </p>
        </div>
        
        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-800 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-4 w-4 text-red-500" />
              <span className="font-semibold text-red-400">Error Details</span>
            </div>
            <p className="text-sm text-red-300 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}
        
        {/* Helpful suggestions */}
        <div className="p-4 rounded-lg bg-gray-700/50 mb-6">
          <p className="text-sm text-gray-400 mb-3">
            You can try the following:
          </p>
          <ul className="text-sm space-y-2 text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Refresh the page to try again
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Go back to the home page
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Check your internet connection
            </li>
          </ul>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
