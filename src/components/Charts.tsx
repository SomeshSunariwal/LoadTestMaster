import './css/Charts.css';
import {
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
import { useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import type { RunSnapshot } from '../shared/schema';
const grid = { stroke: 'var(--chart-grid)', strokeDasharray: '3 3' };
const axis = { stroke: 'var(--muted)', fontSize: 10, tickLine: false, axisLine: false };
const tooltip = {
  contentStyle: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--muted)' },
};
export function RequestsChart({ run }: { run: RunSnapshot }) {
  const [visible, setVisible] = useState({ rps: true, users: true });
  return (
    <section className="panel chart-panel requests-chart-panel">
      <div className="chart-title">
        <h3>
          Requests per second <FiInfo />
        </h3>
        <div className="legend">
          <button
            type="button"
            className={visible.rps ? '' : 'is-hidden'}
            aria-pressed={visible.rps}
            title={`${visible.rps ? 'Hide' : 'Show'} Requests/sec`}
            onClick={() => setVisible((current) => ({ ...current, rps: !current.rps }))}
          >
            <i className="dot blue" />
            Requests/sec
          </button>
          <button
            type="button"
            className={visible.users ? '' : 'is-hidden'}
            aria-pressed={visible.users}
            title={`${visible.users ? 'Hide' : 'Show'} Virtual users`}
            onClick={() => setVisible((current) => ({ ...current, users: !current.users }))}
          >
            <i className="dot green" />
            Virtual users
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer={false}
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
          <XAxis dataKey="second" {...axis} tickFormatter={(v) => `${v}s`} minTickGap={35} />
          <YAxis hide={!visible.rps} {...axis} />
          <YAxis hide={!visible.users} yAxisId="users" orientation="right" width={16} {...axis} />
          <Tooltip {...tooltip} />
          {visible.rps && (
            <Area
              type="monotone"
              dataKey="rps"
              name="Requests/sec"
              stroke="#4d8dff"
              fill="url(#rps-fill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
          {visible.users && (
            <Area
              type="stepAfter"
              dataKey="users"
              name="Virtual users"
              yAxisId="users"
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
}
export function ResponseChart({ run }: { run: RunSnapshot }) {
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
          <XAxis dataKey="second" {...axis} tickFormatter={(v) => `${v}s`} />
          <YAxis hide={!Object.values(visible).some(Boolean)} {...axis} />
          <Tooltip {...tooltip} />
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
          {series.filter(({ key }) => key !== 'avg' && visible[key]).map(({ key, color, label }) => (
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
}
export function Distribution({ run }: { run: RunSnapshot }) {
  return (
    <section className="panel chart-panel">
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
          margin={{ top: 12, right: 8, left: -18, bottom: 12 }}
        >
          <CartesianGrid {...grid} />
          <XAxis dataKey="range" {...axis} interval={2} tick={{ fontSize: 9 }} />
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
}
