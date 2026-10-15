import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
