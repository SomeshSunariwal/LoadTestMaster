import { expect, test } from 'bun:test';
import {
  constrainDashboardLayout,
  dashboardLayoutsSchema,
  defaultDashboardLayout,
  graphIds,
  metricIds,
} from '../src/shared/dashboardLayout';

test('default desktop board preserves six metrics and the existing two-column reports', () => {
  const layout = defaultDashboardLayout(36);
  expect(layout.slice(0, 6).map(({ x, y, w }) => ({ x, y, w }))).toEqual(
    [0, 6, 12, 18, 24, 30].map((x) => ({ x, y: 0, w: 6 })),
  );
  expect(layout.find((item) => item.i === 'requests-chart')).toMatchObject({ x: 0, y: 3, w: 20 });
  expect(layout.find((item) => item.i === 'response-chart')).toMatchObject({ x: 20, y: 3, w: 16 });
  expect(layout.find((item) => item.i === 'breakdown')).toMatchObject({ x: 0, y: 10, w: 20 });
  expect(layout.find((item) => item.i === 'distribution')).toMatchObject({ x: 20, y: 10, w: 16 });
});
test('only graphs are resizable and saved layouts stay within the responsive grid', () => {
  for (const cols of [12, 18, 36]) {
    const layout = constrainDashboardLayout(defaultDashboardLayout(cols), cols);
    for (const item of layout) {
      expect(item.x + item.w).toBeLessThanOrEqual(cols);
      expect(item.isResizable).toBe(graphIds.includes(item.i));
      if ((metricIds as readonly string[]).includes(item.i))
        expect({ w: item.w, h: item.h }).toEqual({ w: 6, h: 3 });
    }
  }
  const duplicated = defaultDashboardLayout(36);
  duplicated[1] = duplicated[0]!;
  expect(dashboardLayoutsSchema.safeParse({ '36': duplicated }).success).toBe(false);
});
