'use client';

import Link from 'next/link';
import { BookX, Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
        <div className="mx-auto mb-6 p-4 rounded-full bg-gray-700 w-fit">
          <BookX className="h-16 w-16 text-gray-400" />
        </div>
        
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-6">Page Not Found</p>
        
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <ul className="text-sm text-left space-y-2 text-gray-400 bg-gray-700/50 p-4 rounded-lg mb-6">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            The manga was removed from our sources
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            The URL was typed incorrectly
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            The chapter is not yet available
          </li>
        </ul>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Link 
            href="/" 
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <Link 
            href="/" 
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <Search className="h-4 w-4" />
            Search Manga
          </Link>
        </div>
        
        <button 
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
