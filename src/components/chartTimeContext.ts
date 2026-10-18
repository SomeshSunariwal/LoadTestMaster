import { createContext } from 'react';
import type { ChartRange } from '../shared/chartHistory';

export const ChartTimeContext = createContext<{
  range: ChartRange;
  onChange: (range: ChartRange) => void;
  domain: [number, number];
  zoomed: boolean;
  onZoom: (domain: [number, number]) => void;
  onResetZoom: () => void;
}>({
  range: 'All',
  onChange: () => {},
  domain: [0, 1],
  zoomed: false,
  onZoom: () => {},
  onResetZoom: () => {},
});
