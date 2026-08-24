import React, { useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin } from 'lucide-react';

export const Preloader: React.FC = () => {
  const { setCity, setLanguage } = useLocation();
  const [currentCity, setCurrentCity] = useState('');

  const handleStart = () => {
    if (currentCity.trim()) {
      setCity(currentCity.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        
        {/* Logo */}
        <img src="/favicon.svg" alt="Daily Dish Logo" className="w-16 h-16 mx-auto mb-4" />
        
        {/* Title */}
        <h1 className="text-4xl font-black font-serif tracking-tight text-stone-900 mb-2">
          Witaj w Daily Dish!
        </h1>
        <p className="text-stone-500 mb-8">Zanim zaczniemy, powiedz nam, gdzie szukasz jedzenia.</p>

        {/* City Input */}
        <div className="relative mb-4">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={currentCity}
            onChange={(e) => setCurrentCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="Wpisz miasto, np. Łódź"
            className="w-full pl-12 pr-4 py-4 border border-stone-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleStart}
          disabled={!currentCity.trim()}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-md hover:bg-orange-600 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          Szukaj restauracji
        </button>
        <p className="text-xs text-stone-400 mt-3 font-mono">(w promieniu 20km)</p>

        {/* Language Selector */}
        <div className="mt-12">
          <p className="text-xs text-stone-400 mb-2 font-mono uppercase tracking-widest">Język / Language</p>
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={() => setLanguage('pl')} 
              className="px-3 py-1 border border-stone-200 rounded-md text-sm hover:bg-stone-100 transition-colors"
            >
              🇵🇱 Polski
            </button>
            <button 
              onClick={() => setLanguage('en')}
              className="px-3 py-1 border border-stone-200 rounded-md text-sm hover:bg-stone-100 transition-colors"
            >
              🇬🇧 English
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
