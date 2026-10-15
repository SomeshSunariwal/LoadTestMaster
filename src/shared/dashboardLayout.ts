import { z } from 'zod';

export const metricIds = ['users', 'rps', 'latency', 'throughput', 'errors', 'success'] as const;
export const widgetIds = [
  ...metricIds,
  'requests-chart',
  'response-chart',
  'breakdown',
  'distribution',
] as const;
export type WidgetId = (typeof widgetIds)[number];
export const graphIds: readonly WidgetId[] = ['requests-chart', 'response-chart', 'distribution'];
export const widgetLayoutSchema = z.object({
  i: z.enum(widgetIds),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(36),
  h: z.number().int().min(1).max(24),
});
export type WidgetLayout = z.infer<typeof widgetLayoutSchema>;
export const dashboardLayoutsSchema = z.record(
  z.string(),
  z
    .array(widgetLayoutSchema)
    .length(widgetIds.length)
    .refine((items) => new Set(items.map((item) => item.i)).size === widgetIds.length),
);
export function defaultDashboardLayout(cols: number): WidgetLayout[] {
  const metricsPerRow = cols / 6;
  const chartsStart = Math.ceil(metricIds.length / metricsPerRow) * 3;
  const wide = cols === 36;
  const leftWidth = wide ? 20 : cols;
  return [
    ...metricIds.map((i, index) => ({
      i,
      x: (index % metricsPerRow) * 6,
      y: Math.floor(index / metricsPerRow) * 3,
      w: 6,
      h: 3,
    })),
    { i: 'requests-chart', x: 0, y: chartsStart, w: leftWidth, h: 7 },
    {
      i: 'response-chart',
      x: wide ? 20 : 0,
      y: chartsStart + (wide ? 0 : 7),
      w: wide ? 16 : cols,
      h: 7,
    },
    { i: 'breakdown', x: 0, y: chartsStart + (wide ? 7 : 14), w: leftWidth, h: 7 },
    {
      i: 'distribution',
      x: wide ? 20 : 0,
      y: chartsStart + (wide ? 7 : 21),
      w: wide ? 16 : cols,
      h: 7,
    },
  ];
}
export function constrainDashboardLayout(items: readonly WidgetLayout[], cols: number) {
  return items.map((item) => {
    const graph = graphIds.includes(item.i);
    const metric = (metricIds as readonly string[]).includes(item.i);
    const w = metric ? 6 : Math.max(Math.min(12, cols), Math.min(cols, item.w));
    return {
      ...item,
      w,
      x: Math.min(item.x, cols - w),
      h: metric ? 3 : graph ? Math.max(5, item.h) : 7,
      minW: metric ? 6 : Math.min(12, cols),
      maxW: metric ? 6 : cols,
      minH: metric ? 3 : graph ? 5 : 7,
      maxH: metric ? 3 : graph ? 24 : 7,
      isResizable: graph,
    };
  });
}
