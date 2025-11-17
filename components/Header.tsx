import React from 'react';
import { GeminiIcon } from './icons/GeminiIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/60 backdrop-blur-md p-4 border-b border-slate-700 fixed top-0 left-0 right-0 z-10 shadow-sm">
      <div className="container mx-auto flex items-center gap-3">
        <GeminiIcon className="w-8 h-8" />
        <h1 className="text-xl font-bold text-slate-100">Chat con Ferre</h1>
      </div>
    </header>
  );
};