import React from 'react';
import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-center items-center h-16">
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="text-2xl group-hover:animate-bounce">💬</span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TraderFM
              </span>
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        {children}
      </main>
      
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-center text-gray-600 text-sm">
            TraderFM – where traders share wisdom anonymously 
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-gray-400">No signups, just insights</span>
          </p>
        </div>
      </footer>
    </div>
  );
} 