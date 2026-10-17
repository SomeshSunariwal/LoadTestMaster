import type { RunSnapshot } from './schema';

const clock = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const date = new Intl.DateTimeFormat(undefined, {
  day: '2-digit', month: 'short', year: 'numeric',
});

export function chartTimestamp(run: RunSnapshot, second: number) {
  // New runs retain wall time so pauses do not shift the displayed clock.
  const point = run.points.findLast((point) => point.second <= second && point.timestamp !== undefined);
  return point?.timestamp !== undefined
    ? point.timestamp + (second - point.second) * 1000
    : Date.parse(run.startedAt) + second * 1000;
}

export function chartClockLabel(run: RunSnapshot, second: number) {
  return clock.format(chartTimestamp(run, second));
}

export function chartDateLabel(run: RunSnapshot, second: number) {
  return date.format(chartTimestamp(run, second));
}

export function chartTooltipLabel(run: RunSnapshot, second: number) {
  return clock.format(chartTimestamp(run, second));
}

export function chartClockTicks(run: RunSnapshot, domain: [number, number]) {
  const [start, end] = domain;
  const span = end - start;
  const boundaries: number[] = [];
  // Walk local calendar days, including daylight-saving transitions.
  let cursor = start;
  while (cursor < end && boundaries.length < 400) {
    const now = chartTimestamp(run, cursor);
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const next = cursor + (midnight.getTime() - now) / 1000;
    if (next > end) break;
    boundaries.push(next);
    cursor = next;
  }
  const regular = Array.from({ length: 5 }, (_, index) => start + span * index / 4)
    .filter((value) => !boundaries.some((boundary) => Math.abs(value - boundary) < span / 8));
  return { ticks: [...regular, ...boundaries].sort((a, b) => a - b), boundaries };
}
