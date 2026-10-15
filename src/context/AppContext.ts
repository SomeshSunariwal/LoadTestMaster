import { createContext } from 'react';
import type { AppController } from '../hooks/useController';

// Keep context identity outside the component/hook modules for safe hot reloads.
export const AppContext = createContext<AppController | null>(null);
