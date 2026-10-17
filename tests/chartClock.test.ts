import { expect, test } from 'bun:test';
import { chartClockTicks, chartTimestamp, chartTooltipLabel } from '../src/shared/chartClock';
import type { RunSnapshot } from '../src/shared/schema';

function runAt(hour: number, minute: number): RunSnapshot {
  return { startedAt: new Date(2026, 9, 18, hour, minute).toISOString(), points: [] } as unknown as RunSnapshot;
}

test('same-day charts have time ticks without date boundaries', () => {
  expect(chartClockTicks(runAt(14, 30), [0, 118]).boundaries).toEqual([]);
});

test('midnight is included at its exact position, even between regular ticks', () => {
  const result = chartClockTicks(runAt(23, 59), [0, 150]);
  expect(result.boundaries).toEqual([60]);
  expect(result.ticks).toContain(60);
});

test('a filtered window after midnight does not repeat the date', () => {
  expect(chartClockTicks(runAt(23, 59), [70, 150]).boundaries).toEqual([]);
});

test('old history falls back to start time while new samples retain pause time', () => {
  const run = runAt(14, 30);
  const start = Date.parse(run.startedAt);
  expect(chartTimestamp(run, 10)).toBe(start + 10_000);
  run.points = [{ second: 10, timestamp: start + 70_000 }] as RunSnapshot['points'];
  expect(chartTimestamp(run, 11)).toBe(start + 71_000);
  expect(chartTooltipLabel(run, 11)).toBe('14:31:11');
});
