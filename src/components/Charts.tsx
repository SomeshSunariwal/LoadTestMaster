import './css/Charts.css';
import {
  type XAxisTickContentProps,
  type MouseHandlerDataParam,
  ReferenceArea,
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { memo, useContext, useRef, useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import type { RunSnapshot } from '../shared/schema';
import { ChartTimeRange } from './ChartTimeRange';
import { ChartTimeContext } from './chartTimeContext';
import {
  chartClockLabel,
  chartClockTicks,
  chartDateLabel,
  chartTooltipLabel,
} from '../shared/chartClock';

function clockAxis(run: RunSnapshot, domain: [number, number]) {
  const { ticks, boundaries } = chartClockTicks(run, domain);
  return {
    ticks,
    height: 46,
    interval: 'preserveStartEnd' as const,
    tick: ({ x, y, payload }: XAxisTickContentProps) => {
      if (!payload) return <g />;
      const second = payload.value;
      const anchor = second === ticks[0] ? 'start' : second === ticks.at(-1) ? 'end' : 'middle';
      return (
        <text x={x} y={y} fill="var(--muted)" fontSize={12} textAnchor={anchor}>
          <tspan x={x} dy={14}>
            {chartClockLabel(run, second)}
          </tspan>
          {boundaries.includes(second) && (
            <tspan x={x} dy={15}>
              {chartDateLabel(run, second)}
            </tspan>
          )}
        </text>
      );
    },
  };
}
function useChartZoom() {
  const { domain, onZoom } = useContext(ChartTimeContext);
  const drag = useRef<[number, number] | null>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const value = (state: MouseHandlerDataParam) => {
    if (state.activeLabel === undefined) return undefined;
    const second = Number(state.activeLabel);
    return Number.isFinite(second) ? Math.max(domain[0], Math.min(domain[1], second)) : undefined;
  };
  const cancel = () => {
    drag.current = null;
    setSelection(null);
  };
  return {
    handlers: {
      onMouseDown: (
        state: MouseHandlerDataParam,
        event: { button: number; preventDefault: () => void },
      ) => {
        const second = value(state);
        if (event.button !== 0 || second === undefined) return;
        event.preventDefault();
        drag.current = [second, second];
        setSelection(drag.current);
      },
      onMouseMove: (state: MouseHandlerDataParam) => {
        const second = value(state);
        if (!drag.current || second === undefined) return;
        drag.current = [drag.current[0], second];
        setSelection(drag.current);
      },
      onMouseUp: () => {
        if (drag.current) {
          const [a, b] = drag.current;
          if (Math.abs(b - a) >= Math.max(0.1, (domain[1] - domain[0]) / 200))
            onZoom([Math.min(a, b), Math.max(a, b)]);
        }
        cancel();
      },
      onMouseLeave: cancel,
    },
    overlay: selection && (
      <ReferenceArea
        x1={Math.min(...selection)}
        x2={Math.max(...selection)}
        fill="var(--blue)"
        fillOpacity={0.2}
        stroke="var(--blue)"
        strokeOpacity={0.6}
        ifOverflow="hidden"
      />
    ),
  };
}
const grid = { stroke: 'var(--chart-grid)', strokeDasharray: '3 3' };
const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false, axisLine: false };
const tooltip = {
  formatter: (value: unknown) =>
    typeof value === 'number' ? value.toFixed(2) : String(value ?? ''),
  contentStyle: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--muted)' },
};
export const RequestsChart = memo(function RequestsChart({ run }: { run: RunSnapshot }) {
  const { domain } = useContext(ChartTimeContext);
  const zoom = useChartZoom();
  const [visible, setVisible] = useState({ rps: true, users: true });
  const tps = run.loadMode === 'tps';
  const requestLabel = tps ? 'Completed/sec' : 'Requests/sec';
  const secondLabel = tps ? 'Started/sec' : 'Virtual users';
  return (
    <section className="panel chart-panel requests-chart-panel">
      <div className="chart-title">
        <h3>
          Requests per second <FiInfo />
        </h3>
        <ChartTimeRange />
        <div className="legend">
          <button
            type="button"
            className={visible.rps ? '' : 'is-hidden'}
            aria-pressed={visible.rps}
            title={`${visible.rps ? 'Hide' : 'Show'} ${requestLabel}`}
            onClick={() => setVisible((current) => ({ ...current, rps: !current.rps }))}
          >
            <i className="dot blue" />
            {requestLabel}
          </button>
          <button
            type="button"
            className={visible.users ? '' : 'is-hidden'}
            aria-pressed={visible.users}
            title={`${visible.users ? 'Hide' : 'Show'} ${secondLabel}`}
            onClick={() => setVisible((current) => ({ ...current, users: !current.users }))}
          >
            <i className="dot green" />
            {secondLabel}
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer={false}
          {...zoom.handlers}
          syncId={`run-timeline-${run.id}`}
          syncMethod="index"
          data={run.points}
          margin={{ top: 12, right: 6, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="rps-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4d8dff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4d8dff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} />
          {zoom.overlay}
          <XAxis
            dataKey="second"
            type="number"
            domain={domain}
            allowDataOverflow
            {...axis}
            {...clockAxis(run, domain)}
            minTickGap={55}
          />
          <YAxis hide={tps ? !visible.rps && !visible.users : !visible.rps} {...axis} />
          {!tps && (
            <YAxis hide={!visible.users} yAxisId="users" orientation="right" width={16} {...axis} />
          )}
          <Tooltip {...tooltip} labelFormatter={(value) => chartTooltipLabel(run, Number(value))} />
          {visible.rps && (
            <Area
              type="monotone"
              dataKey="rps"
              name={requestLabel}
              stroke="#4d8dff"
              fill="url(#rps-fill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
          {visible.users && (
            <Area
              type="stepAfter"
              dataKey={tps ? 'startRps' : 'users'}
              name={secondLabel}
              yAxisId={tps ? 0 : 'users'}
              stroke="#1bcd9b"
              fill="transparent"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
});
export const ResponseChart = memo(function ResponseChart({ run }: { run: RunSnapshot }) {
  const { domain } = useContext(ChartTimeContext);
  const zoom = useChartZoom();
  const [visible, setVisible] = useState({ avg: true, p95: true, p99: true });
  const series = [
    { key: 'avg', label: 'Avg', color: '#4d8dff' },
    { key: 'p95', label: 'P95', color: '#f3b94d' },
    { key: 'p99', label: 'P99', color: '#f56b79' },
  ] as const;
  return (
    <section className="panel chart-panel">
      <div className="chart-title">
        <h3>
          Response time <span className="muted">(ms)</span> <FiInfo />
        </h3>
        <ChartTimeRange />
        <div className="legend">
          {series.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              className={visible[key] ? '' : 'is-hidden'}
              aria-pressed={visible[key]}
              title={`${visible[key] ? 'Hide' : 'Show'} ${label}`}
              onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}
            >
              <i className="legend-swatch" style={{ backgroundColor: color }} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          accessibilityLayer={false}
          {...zoom.handlers}
          syncId={`run-timeline-${run.id}`}
          syncMethod="index"
          data={run.points}
          margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="response-avg-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4d8dff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4d8dff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} />
          {zoom.overlay}
          <XAxis
            dataKey="second"
            type="number"
            domain={domain}
            allowDataOverflow
            {...axis}
            {...clockAxis(run, domain)}
            minTickGap={55}
          />
          <YAxis hide={!Object.values(visible).some(Boolean)} {...axis} />
          <Tooltip {...tooltip} labelFormatter={(value) => chartTooltipLabel(run, Number(value))} />
          {visible.avg && (
            <Area
              type="monotone"
              dataKey="avg"
              name="Avg"
              stroke="#4d8dff"
              fill="url(#response-avg-fill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
          {series
            .filter(({ key }) => key !== 'avg' && visible[key])
            .map(({ key, color, label }) => (
              <Line
                key={key}
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
});
function TelemetryChart({ run, cpu = false }: { run: RunSnapshot; cpu?: boolean }) {
  const { domain } = useContext(ChartTimeContext);
  const zoom = useChartZoom();
  const [visible, setVisible] = useState(true);
  const dataKey = cpu ? 'cpu' : 'outstandingRequests';
  const title = cpu ? 'CPU Utilization' : 'Outstanding Requests';
  const color = cpu ? '#f3b94d' : '#1bcd9b';
  const hasData = run.points.some((point) => point[dataKey] !== undefined);
  return (
    <section className="panel chart-panel">
      <div className="chart-title">
        <h3
          title={
            cpu
              ? 'CPU usage of the machine running the load test.'
              : 'Requests in this run waiting for a response.'
          }
        >
          {title} <FiInfo />
        </h3>
        <ChartTimeRange />
        <div className="legend">
          <button
            type="button"
            className={visible ? '' : 'is-hidden'}
            aria-pressed={visible}
            title={`${visible ? 'Hide' : 'Show'} ${title}`}
            onClick={() => setVisible((current) => !current)}
          >
            <i className="legend-swatch" style={{ backgroundColor: color }} />
            {!hasData ? 'No recorded data' : cpu ? 'Load generator (%)' : 'Waiting for response'}
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer={false}
          {...zoom.handlers}
          syncId={`run-timeline-${run.id}`}
          syncMethod="index"
          data={run.points}
          margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
        >
          <CartesianGrid {...grid} />
          {zoom.overlay}
          <XAxis
            dataKey="second"
            type="number"
            domain={domain}
            allowDataOverflow
            {...axis}
            {...clockAxis(run, domain)}
            minTickGap={55}
          />
          <YAxis
            {...axis}
            hide={!visible}
            domain={cpu ? [0, 100] : [0, 'auto']}
            allowDecimals={cpu}
            tickFormatter={cpu ? (value) => `${value}%` : undefined}
          />
          <Tooltip {...tooltip} labelFormatter={(value) => chartTooltipLabel(run, Number(value))} />
          {visible && (
            <Area
              type={cpu ? 'monotone' : 'stepAfter'}
              dataKey={dataKey}
              name={title}
              unit={cpu ? '%' : ''}
              stroke={color}
              fill={color}
              fillOpacity={0.12}
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
export const OutstandingRequestsChart = memo(function OutstandingRequestsChart({
  run,
}: {
  run: RunSnapshot;
}) {
  return <TelemetryChart run={run} />;
});
export const CpuChart = memo(function CpuChart({ run }: { run: RunSnapshot }) {
  return <TelemetryChart run={run} cpu />;
});
export const Distribution = memo(function Distribution({ run }: { run: RunSnapshot }) {
  return (
    <section className="panel chart-panel distribution-chart-panel">
      <div className="chart-title">
        <h3>
          Response time distribution <FiInfo />
        </h3>
        <span className="muted helper">All requests</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={run.distribution}
          margin={{ top: 12, right: 8, left: -18, bottom: 2 }}
        >
          <CartesianGrid {...grid} />
          <XAxis dataKey="range" {...axis} interval={2} />
          <YAxis {...axis} />
          <Tooltip {...tooltip} />
          <Bar
            dataKey="count"
            name="Requests"
            fill="#a879ff"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
});
