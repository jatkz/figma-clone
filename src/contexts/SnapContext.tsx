import React, { createContext, useContext, useState, useCallback } from 'react';
import type { SnapSettings } from '../types/snap';

interface SnapContextType {
  settings: SnapSettings;
  updateSettings: (settings: Partial<SnapSettings>) => void;
  toggleGrid: () => void;
  toggleSmartGuides: () => void;
}

const SnapContext = createContext<SnapContextType | undefined>(undefined);

export const SnapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SnapSettings>({
    gridEnabled: true,
    gridSize: 10,
    smartGuidesEnabled: true,
    snapThreshold: 5,
  });

  const updateSettings = useCallback((newSettings: Partial<SnapSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleGrid = useCallback(() => {
    setSettings(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  }, []);

  const toggleSmartGuides = useCallback(() => {
    setSettings(prev => ({ ...prev, smartGuidesEnabled: !prev.smartGuidesEnabled }));
  }, []);

  return (
    <SnapContext.Provider value={{ settings, updateSettings, toggleGrid, toggleSmartGuides }}>
      {children}
    </SnapContext.Provider>
  );
};

export const useSnap = () => {
  const context = useContext(SnapContext);
  if (!context) {
    throw new Error('useSnap must be used within SnapProvider');
  }
  return context;
};

