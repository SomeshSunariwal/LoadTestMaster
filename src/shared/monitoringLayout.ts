import { z } from 'zod';

export const monitoringIds = ['CPU utilization', 'System memory', 'Requests in flight', 'System information'] as const;
export const monitoringSelectionSchema = z.array(z.enum(monitoringIds))
  .refine((items) => new Set(items).size === items.length);
export const monitoringLayoutsSchema = z.record(z.string(), z.array(z.object({
  i: z.enum(monitoringIds),
  x: z.number().int().min(0), y: z.number().int().min(0),
  w: z.number().int().min(1).max(12), h: z.number().int().min(1).max(24),
})).length(4).refine((items) => new Set(items.map((item) => item.i)).size === 4));

export function defaultMonitoringLayout(cols: number) {
  const w = cols === 12 ? 4 : 3;
  const perRow = cols / w;
  return monitoringIds.map((i, index) => ({
    i, x: (index % perRow) * w,
    y: Math.floor(index / perRow) * 5,
    w,
    h: 5,
  }));
}

export function constrainMonitoringLayout(items: ReturnType<typeof defaultMonitoringLayout>, cols: number) {
  return items.map((item) => {
    const minW = Math.min(cols, 3);
    const w = Math.max(minW, Math.min(cols, item.w));
    const minH = 5;
    return { ...item, w, x: Math.min(item.x, cols - w), h: Math.max(minH, item.h),
      minW, maxW: cols, minH, maxH: 24, isResizable: true };
  });
}
