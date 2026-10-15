import type { ReactNode } from 'react';
import { useController } from '../hooks/useController';
import { AppContext } from './AppContext';

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useController();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
