import type { Point, RunSnapshot } from './schema';

export const chartRanges = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '30m', seconds: 1800 },
  { label: '1H', seconds: 3600 },
  { label: '3H', seconds: 10800 },
  { label: '8H', seconds: 28800 },
  { label: 'All', seconds: Infinity },
] as const;
export type ChartRange = (typeof chartRanges)[number]['label'];

function mergePoints(points: Point[]): Point {
  const last = points.at(-1)!;
  if (points.length === 1) return last;
  const samples = points.reduce((sum, point) => sum + (point.samples ?? 1), 0);
  const merged: Point = {
    ...last,
    spanStart: points[0]!.spanStart ?? points[0]!.second,
    samples,
  };
  for (const key of ['rps', 'startRps', 'users', 'avg', 'p95', 'p99', 'cpu'] as const) {
    const present = points.filter((point) => point[key] !== undefined);
    if (present.length) {
      merged[key] = present.reduce((sum, point) => sum + point[key]! * (point.samples ?? 1), 0) /
        present.reduce((sum, point) => sum + (point.samples ?? 1), 0);
    }
  }
  const outstanding = points.flatMap((point) => point.outstandingRequests === undefined ? [] : [point.outstandingRequests]);
  if (outstanding.length) merged.outstandingRequests = Math.max(...outstanding);
  return merged;
}

// Keep recent seconds precise and compact older periods instead of discarding
// them. CPU/rates are averaged, and outstanding peaks retained.
export function compactChartHistory(points: Point[], elapsed: number): Point[] {
  const groups = new Map<string, Point[]>();
  for (const point of points) {
    const age = elapsed - point.second;
    const step = age <= 300 ? 1 : age <= 1800 ? 10 : age <= 28800 ? 60 : 300;
    const key = `${step}:${Math.floor(point.second / step)}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return [...groups.values()].map(mergePoints);
}

export function chartWindow(run: RunSnapshot, range: ChartRange, zoom?: [number, number] | null) {
  const seconds = chartRanges.find((option) => option.label === range)!.seconds;
  const cutoff = Math.max(0, run.elapsed - seconds);
  const domain: [number, number] = zoom ?? [cutoff, Math.max(cutoff + 0.1, run.elapsed)];
  const first = run.points.findIndex((point) => point.second >= domain[0]);
  const after = run.points.findIndex((point) => point.second > domain[1]);
  const points = first < 0 ? run.points.slice(-1) : run.points.slice(
    Math.max(0, first - 1), after < 0 ? undefined : after + 1,
  );
  const stride = Math.max(1, Math.ceil(points.length / 600));
  const displayPoints: Point[] = [];
  for (let index = 0; index < points.length; index += stride) {
    displayPoints.push(mergePoints(points.slice(index, index + stride)));
  }
  return {
    run: { ...run, points: displayPoints },
    domain,
  };
}

export function chartTimeLabel(seconds: number) {
  const whole = Math.floor(seconds);
  if (whole >= 60) {
    const minutes = Math.floor(whole / 60) % 60;
    const rest = String(whole % 60).padStart(2, '0');
    return whole >= 3600
      ? `${Math.floor(whole / 3600)}:${String(minutes).padStart(2, '0')}:${rest}`
      : `${minutes}:${rest}`;
  }
  return `${whole}s`;
}
