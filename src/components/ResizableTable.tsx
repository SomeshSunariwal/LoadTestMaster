import './ResizableTable.css';
import { useState, type PointerEvent, type ReactNode } from 'react';
import { useContainerWidth } from 'react-grid-layout';
import { z } from 'zod';
import { useLayoutPreference } from '../hooks/useLayoutPreference';

export type TableColumn = {
  id: string;
  label: string;
  minWidth: number;
  weight: number;
  hideLabel?: boolean;
};

const weightsSchema = z
  .record(z.string(), z.number().nonnegative().max(1))
  .refine((values) => Object.values(values).some((value) => value > 0));

/** Adjacent columns share space, keeping the table header and rows aligned. */
export function ResizableTable({
  columns,
  storageKey,
  children,
}: {
  columns: TableColumn[];
  storageKey: string;
  children: ReactNode;
}) {
  const { width, containerRef } = useContainerWidth();
  const defaultTotal = columns.reduce((sum, column) => sum + column.weight, 0);
  const defaults = Object.fromEntries(columns.map((c) => [c.id, c.weight / defaultTotal]));
  const [weights, saveWeights] = useLayoutPreference(storageKey, weightsSchema, defaults);
  const [drag, setDrag] = useState<{
    index: number;
    pointerId: number;
    startX: number;
    initial: number[];
    widths: number[];
  }>();
  const minimum = columns.reduce((sum, column) => sum + column.minWidth, 0);
  const extra = Math.max(120, width - minimum);
  const totalWeight = columns.reduce((sum, c) => sum + (weights[c.id] ?? defaults[c.id]), 0);
  const widths =
    drag?.widths ??
    columns.map((c) => c.minWidth + (extra * (weights[c.id] ?? defaults[c.id])) / totalWeight);

  const adjusted = (initial: number[], index: number, delta: number) => {
    const next = [...initial];
    const amount = Math.max(
      columns[index].minWidth - initial[index],
      Math.min(delta, initial[index + 1] - columns[index + 1].minWidth),
    );
    next[index] += amount;
    next[index + 1] -= amount;
    return next;
  };
  const save = (next: number[]) => {
    const remaining = next.reduce((sum, value, i) => sum + value - columns[i].minWidth, 0);
    saveWeights(
      Object.fromEntries(
        columns.map((c, i) => [c.id, Math.max(0, next[i] - c.minWidth) / remaining]),
      ),
    );
  };
  const move = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) return;
    setDrag({ ...drag, widths: adjusted(drag.initial, drag.index, event.clientX - drag.startX) });
  };
  const finish = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) return;
    save(adjusted(drag.initial, drag.index, event.clientX - drag.startX));
    setDrag(undefined);
  };

  return (
    <div className="table-scroll resizable-table-scroll" ref={containerRef}>
      <table
        className="resizable-table"
        style={{ width: widths.reduce((sum, size) => sum + size, 0) }}
      >
        <colgroup>
          {columns.map((column, index) => (
            <col key={column.id} style={{ width: widths[index] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column.id} scope="col">
                <span className={column.hideLabel ? 'sr-only' : undefined}>{column.label}</span>
                {index < columns.length - 1 && (
                  <div
                    className="table-column-resizer"
                    role="separator"
                    aria-label={`Resize ${column.label} column`}
                    aria-orientation="vertical"
                    aria-valuemin={column.minWidth}
                    aria-valuemax={Math.round(
                      widths[index] + widths[index + 1] - columns[index + 1].minWidth,
                    )}
                    aria-valuenow={Math.round(widths[index])}
                    tabIndex={0}
                    title="Drag to resize. Arrow keys adjust width."
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      setDrag({
                        index,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        initial: widths,
                        widths,
                      });
                    }}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={() => setDrag(undefined)}
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                      event.preventDefault();
                      const delta =
                        (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 30 : 10);
                      save(adjusted(widths, index, delta));
                    }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {drag && (
        <div
          className="table-resize-overlay"
          onPointerMove={move}
          onPointerUp={finish}
          onPointerLeave={finish}
          onPointerCancel={() => setDrag(undefined)}
        />
      )}
    </div>
  );
}
