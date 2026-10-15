import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  return (
    <section className="panel chart-panel">
      <div className="chart-title">
        <h3>
          Requests per second <FiInfo />
        </h3>
        <div className="legend">
          <span>
            <i className="dot blue" />
            Requests/sec
          </span>
          <span>
            <i className="dot green" />
            Virtual users
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={run.points} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="rps-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4d8dff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4d8dff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} />
          <XAxis dataKey="second" {...axis} tickFormatter={(v) => `${v}s`} minTickGap={35} />
          <YAxis {...axis} />
          <YAxis yAxisId="users" orientation="right" {...axis} />
          <Tooltip {...tooltip} />
          <Area
            type="monotone"
            dataKey="rps"
            name="Requests/sec"
            stroke="#4d8dff"
            fill="url(#rps-fill)"
            strokeWidth={2}
            isAnimationActive={false}
          />
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
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
export function ResponseChart({ run }: { run: RunSnapshot }) {
  return (
    <section className="panel chart-panel">
      <div className="chart-title">
        <h3>
          Response time <span className="muted">(ms)</span> <FiInfo />
        </h3>
        <div className="legend">
          <span>
            <i className="dot blue" />
            Avg
          </span>
          <span>
            <i className="dot amber" />
            P95
          </span>
          <span>
            <i className="dot red" />
            P99
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={run.points} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="second" {...axis} tickFormatter={(v) => `${v}s`} />
          <YAxis {...axis} />
          <Tooltip {...tooltip} />
          {[
            ['avg', '#4d8dff'],
            ['p95', '#f3b94d'],
            ['p99', '#f56b79'],
          ].map(([key, color]) => (
            <Line
              key={key}
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
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
        <BarChart data={run.distribution} margin={{ top: 12, right: 8, left: -18, bottom: 12 }}>
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
