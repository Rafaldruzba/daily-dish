import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface LocationContextType {
  city: string | null;
  setCity: (city: string) => void;
  language: string;
  setLanguage: (language: string) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [city, setCityState] = useState<string | null>(() => {
    return localStorage.getItem('user_city');
  });

  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('user_language') || 'pl'; // Domyślnie polski
  });

  useEffect(() => {
    if (city) {
      localStorage.setItem('user_city', city);
    } else {
      localStorage.removeItem('user_city');
    }
  }, [city]);

  useEffect(() => {
    localStorage.setItem('user_language', language);
  }, [language]);

  const setCity = (newCity: string) => {
    setCityState(newCity);
  };

  const setLanguage = (newLanguage: string) => {
    setLanguageState(newLanguage);
  };

  const value = {
    city,
    setCity,
    language,
    setLanguage,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
