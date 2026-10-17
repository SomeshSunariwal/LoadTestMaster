import './css/RunBoard.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCloud,
  FiGrid,
  FiMove,
  FiRotateCcw,
  FiUsers,
  FiZap,
  FiFileText,
} from 'react-icons/fi';
import type { RunSnapshot } from '../shared/schema';
import { number, bytes } from '../shared/format';
import {
  constrainDashboardLayout,
  dashboardLayoutsSchema,
  defaultDashboardLayout,
  widgetIds,
  type WidgetId,
} from '../shared/dashboardLayout';
import { useLayoutPreference } from '../hooks/useLayoutPreference';
import { Button, IconButton, Method } from './ui';
import { ApiLogsModal } from './ApiLogsModal';
import { ChartTimeContext } from './chartTimeContext';
import { chartWindow, type ChartRange } from '../shared/chartHistory';
import { CpuChart, Distribution, OutstandingRequestsChart, RequestsChart, ResponseChart } from './Charts';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export function RunBoard({ run }: { run: RunSnapshot }) {
  const [range, setRange] = useState<ChartRange>('All');
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  useEffect(() => setZoom(null), [run.id]);
  const latestRun = useRef(run);
  const [graphRun, setGraphRun] = useState(run);
  useEffect(() => {
    latestRun.current = run;
  }, [run]);
  useEffect(() => {
    // Keep graphs on a one-second cadence; metrics and the table use live run data.
    setGraphRun(latestRun.current);
    if (run.status !== 'running') return;
    const timer = setInterval(() => setGraphRun(latestRun.current), 1000);
    return () => clearInterval(timer);
  }, [run.id, run.status]);
  const window = useMemo(() => chartWindow(graphRun, range, zoom), [graphRun, range, zoom]);
  const chartTime = useMemo(
    () => ({
      range,
      onChange: (next: ChartRange) => { setRange(next); setZoom(null); },
      domain: zoom ?? window.domain,
      zoomed: zoom !== null,
      onZoom: setZoom,
      onResetZoom: () => setZoom(null),
    }),
    [range, window.domain, zoom],
  );
  const [logsApiId, setLogsApiId] = useState<string>();
  const logsEndpoint = run.endpoints.find((endpoint) => endpoint.id === logsApiId);
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const cols = width >= 900 ? 36 : width >= 500 ? 18 : 12;
  const key = String(cols);
  const [preferences, savePreferences] = useLayoutPreference(
    'loadmaster.dashboard-layout.v1',
    dashboardLayoutsSchema,
    {},
  );
  const layout = useMemo(
    () => constrainDashboardLayout(preferences[key] ?? defaultDashboardLayout(cols), cols),
    [preferences, key, cols],
  );
  const save = (next: Layout) =>
    savePreferences({
      ...preferences,
      [key]: next.map(({ i, x, y, w, h }) => ({ i: i as WidgetId, x, y, w, h })),
    });
  const success = run.requests ? 100 * (1 - run.errors / run.requests) : 0;
  const tps = run.loadMode === 'tps';
  const metrics = [
    {
      id: 'users',
      label: tps ? 'Target TPS' : 'Virtual users',
      value: number(tps ? (run.targetTps ?? 0) : run.activeUsers),
      unit: '',
      detail: tps
        ? `Started: ${number(run.startRps ?? 0)} / sec`
        : `Configured: ${number(run.users)}`,
      icon: tps ? <FiZap /> : <FiUsers />,
      tone: 'green',
    },
    {
      id: 'rps',
      label: tps ? 'Completed / sec' : 'Requests / sec',
      value: number(run.rps),
      unit: '',
      detail: `Total completed: ${number(run.requests)}`,
      icon: <FiZap />,
      tone: 'blue',
    },
    {
      id: 'latency',
      label: 'Avg. response time',
      value: number(run.avg),
      unit: 'ms',
      detail: `P95: ${number(run.p95)} ms`,
      icon: <FiClock />,
      tone: 'amber',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: bytes(run.bytes / Math.max(1, run.elapsed)),
      unit: '/s',
      detail: `Transferred: ${bytes(run.bytes)}`,
      icon: <FiActivity />,
      tone: 'purple',
    },
    {
      id: 'errors',
      label: 'Error rate',
      value: run.requests ? ((100 * run.errors) / run.requests).toFixed(2) : '0.00',
      unit: '%',
      detail: `Errors: ${number(run.errors)}`,
      icon: <FiAlertTriangle />,
      tone: 'red',
    },
    {
      id: 'success',
      label: 'Successful requests',
      value: success.toFixed(2),
      unit: '%',
      detail: `Successful: ${number(run.requests - run.errors)}`,
      icon: <FiCloud />,
      tone: 'cyan',
    },
  ];
  const titles: Record<WidgetId, string> = {
    ...Object.fromEntries(metrics.map((m) => [m.id, m.label])),
    'requests-chart': 'Requests per second',
    'response-chart': 'Response time',
    'outstanding-chart': 'Outstanding Requests',
    'cpu-chart': 'CPU Utilization',
    breakdown: 'Request breakdown',
    distribution: 'Response time distribution',
  } as Record<WidgetId, string>;
  const moveWithKeyboard = (id: WidgetId, direction: 'previous' | 'next') => {
    const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
    const index = sorted.findIndex((item) => item.i === id);
    const other = sorted[index + (direction === 'previous' ? -1 : 1)];
    if (!other) return;
    const current = sorted[index]!;
    // Keyboard movement swaps positions; the grid resolves collisions on update.
    save(
      layout.map((item) =>
        item.i === id
          ? { ...item, x: Math.min(other.x, cols - item.w), y: other.y }
          : item.i === other.i
            ? { ...item, x: Math.min(current.x, cols - item.w), y: current.y }
            : item,
      ),
    );
  };
  return (
    <ChartTimeContext.Provider value={chartTime}>
    <section className="run-board" aria-label="Adjustable dashboard">
      <div className="board-toolbar">
        <span>
          <FiGrid />
          Drag a card’s move handle. Resize graphs and the request breakdown from their corner.
        </span>
        <Button variant="ghost" onClick={() => savePreferences({})}>
          <FiRotateCcw />
          Reset layout
        </Button>
      </div>
      <div ref={containerRef} className="board-grid-container">
        {mounted && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{ cols, rowHeight: 28, margin: [16, 16], containerPadding: [0, 0] }}
            dragConfig={{ enabled: true, handle: '.widget-move-handle' }}
            resizeConfig={{ enabled: true, handles: ['se'] }}
            onDragStop={save}
            onResizeStop={save}
          >
            {widgetIds.map((id) => {
              const metric = metrics.find((m) => m.id === id);
              return (
                <div
                  key={id}
                  className={`board-widget ${metric ? 'metric-widget' : 'report-widget'}`}
                  data-widget-id={id}
                  data-resizable={layout.find((item) => item.i === id)?.isResizable}
                >
                  <button
                    className="widget-move-handle"
                    aria-label={`Move ${titles[id]}`}
                    title={`Drag to move ${titles[id]}. Arrow keys swap with the previous or next card.`}
                    onKeyDown={(event) => {
                      if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
                        event.preventDefault();
                        moveWithKeyboard(
                          id,
                          ['ArrowLeft', 'ArrowUp'].includes(event.key) ? 'previous' : 'next',
                        );
                      }
                    }}
                  >
                    <FiMove />
                  </button>
                  {metric ? (
                    <div className="panel stat-card">
                      <span className={`stat-icon ${metric.tone}`}>{metric.icon}</span>
                      <div>
                        <span className="stat-label">{metric.label}</span>
                        <strong>
                          {metric.value}
                          <small>{metric.unit}</small>
                        </strong>
                        <p>{metric.detail}</p>
                      </div>
                    </div>
                  ) : id === 'requests-chart' ? (
                    <RequestsChart run={window.run} />
                  ) : id === 'response-chart' ? (
                    <ResponseChart run={window.run} />
                  ) : id === 'outstanding-chart' ? (
                    <OutstandingRequestsChart run={window.run} />
                  ) : id === 'cpu-chart' ? (
                    <CpuChart run={window.run} />
                  ) : id === 'distribution' ? (
                    <Distribution run={graphRun} />
                  ) : (
                    <section className="panel breakdown">
                      <div className="chart-title">
                        <h3>
                          Request breakdown <FiCheckCircle />
                        </h3>
                        <span className="muted helper">All requests · {run.endpoints.length} endpoints</span>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Method</th>
                              <th>Endpoint</th>
                              <th>Requests</th>
                              <th>Success</th>
                              <th>Avg (ms)</th>
                              <th>P95</th>
                              <th>Errors</th>
                              <th>Logs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {run.endpoints.map((e) => (
                              <tr key={e.id}>
                                <td>
                                  <Method method={e.method} />
                                </td>
                                <td title={e.url}>
                                  <span className="endpoint-cell">
                                    {e.url.replace('{{baseUrl}}', '')}
                                  </span>
                                </td>
                                <td>{number(e.requests)}</td>
                                <td className="text-green">
                                  {e.requests
                                    ? (100 * (1 - e.errors / e.requests)).toFixed(1)
                                    : '0'}
                                  %
                                </td>
                                <td>{number(e.avg)}</td>
                                <td>{number(e.p95)}</td>
                                <td className={e.errors ? 'text-red' : 'muted'}>
                                  {number(e.errors)}
                                </td>
                                <td>
                                  <IconButton
                                    label={`View logs for ${e.name}`}
                                    onClick={() => setLogsApiId(e.id)}
                                  >
                                    <FiFileText />
                                  </IconButton>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
      {logsEndpoint && (
        <ApiLogsModal
          key={`${run.id}:${logsEndpoint.id}`}
          runId={run.id}
          endpoint={logsEndpoint}
          onClose={() => setLogsApiId(undefined)}
        />
      )}
    </section>
    </ChartTimeContext.Provider>
  );
}
