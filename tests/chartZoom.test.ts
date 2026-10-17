import { expect, test } from 'bun:test';
import { chartWindow } from '../src/shared/chartHistory';
import type { Point, RunSnapshot } from '../src/shared/schema';

const run = {
  elapsed: 200,
  points: Array.from({ length: 201 }, (_, second) => ({ second, rps: second }) as Point),
} as RunSnapshot;

test('zoom retains an older selection during a live rolling time range', () => {
  const result = chartWindow(run, '1m', [20, 30]);
  expect(result.domain).toEqual([20, 30]);
  expect(result.run.points[0]!.second).toBe(19);
  expect(result.run.points.at(-1)!.second).toBe(31);
});

test('reset restores the selected duration and its latest data', () => {
  const result = chartWindow(run, '1m', null);
  expect(result.domain).toEqual([140, 200]);
  expect(result.run.points.at(-1)!.second).toBe(200);
});
