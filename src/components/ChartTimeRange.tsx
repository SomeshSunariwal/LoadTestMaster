import { useContext } from 'react';
import { chartRanges } from '../shared/chartHistory';
import { ChartTimeContext } from './chartTimeContext';

export function ChartTimeRange() {
  const { range, onChange, zoomed, onResetZoom } = useContext(ChartTimeContext);
  return (
    <div className="chart-time-controls">
      {zoomed && (
        <button
          type="button"
          className="chart-reset-zoom"
          aria-label="Reset zoom"
          onClick={onResetZoom}
        >
          Reset
        </button>
      )}
      <div className="chart-time-range" role="group" aria-label="Graph time range">
        {chartRanges.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={range === option.label}
            title={
              option.label === 'All'
                ? 'Show the entire run on all graphs'
                : `Show the last ${option.label} on all graphs`
            }
            onClick={() => onChange(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
