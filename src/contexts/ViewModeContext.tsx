import { createContext, useContext, useState, ReactNode } from "react";

type ViewMode = 'admin' | 'client';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  hideAgencyAvg: boolean;
  setHideAgencyAvg: (hide: boolean) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [hideAgencyAvg, setHideAgencyAvg] = useState(false);
  
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, hideAgencyAvg, setHideAgencyAvg }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
