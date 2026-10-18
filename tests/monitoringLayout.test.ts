import { expect, test } from 'bun:test';
import { constrainMonitoringLayout, defaultMonitoringLayout, monitoringLayoutsSchema } from '../src/shared/monitoringLayout';

test('all monitoring cards support resize and remain inside each screen width', () => {
  for (const cols of [3, 6, 12]) {
    const layout = constrainMonitoringLayout(defaultMonitoringLayout(12), cols);
    expect(layout).toHaveLength(4);
    for (const item of layout) {
      expect(item.x + item.w).toBeLessThanOrEqual(cols);
      expect(item.isResizable).toBe(true);
      expect(item.h).toBeGreaterThanOrEqual(item.minH);
    }
  }
});

test('saved layouts require all four distinct cards', () => {
  const layout = defaultMonitoringLayout(12);
  expect(monitoringLayoutsSchema.safeParse({ '12': layout }).success).toBe(true);
  expect(monitoringLayoutsSchema.safeParse({ '12': [layout[0], layout[0], layout[2], layout[3]] }).success).toBe(false);
});
