import './Monitoring.css';
import { FiActivity, FiCpu, FiServer, FiZap } from 'react-icons/fi';
import { useApp } from '../hooks/useApp';
import { bytes, number } from '../shared/format';
export function Monitoring() {
  const { state } = useApp();
  const r = state!.resources;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE MACHINE BEHIND THE METRICS</div>
          <h1>
            Monitoring
            <span className="heading-dot green" />
          </h1>
          <p>Live system resources from your desktop backend.</p>
        </div>
        <span className="live-indicator">
          <span className="dot green" />
          Live telemetry
        </span>
      </div>
      <div className="monitor-grid">
        {[
          {
            icon: <FiCpu />,
            title: 'CPU utilization',
            value: `${r.cpu.toFixed(1)}%`,
            detail: 'Across all logical processors',
            progress: r.cpu,
            tone: 'blue',
          },
          {
            icon: <FiServer />,
            title: 'System memory',
            value: bytes(r.memoryUsed),
            detail: `${bytes(r.memoryTotal)} total memory`,
            progress: (r.memoryUsed / r.memoryTotal) * 100,
            tone: 'green',
          },
          {
            icon: <FiZap />,
            title: 'Requests in flight',
            value: number(r.inFlight),
            detail: '200 maximum across active tests',
            progress: r.inFlight / 2,
            tone: 'purple',
          },
        ].map((s) => (
          <section key={s.title} className="panel monitor-card">
            <span className={`stat-icon ${s.tone}`}>{s.icon}</span>
            <h3>{s.title}</h3>
            <strong>{s.value}</strong>
            <p>{s.detail}</p>
            <div className={`progress ${s.tone}`}>
              <span style={{ width: `${s.progress}%` }} />
            </div>
          </section>
        ))}
      </div>
      <section className="panel system-info">
        <h3>
          <FiActivity />
          System information
        </h3>
        <div>
          <span>Platform</span>
          <strong>{r.platform}</strong>
        </div>
        <div>
          <span>System uptime</span>
          <strong>{Math.floor(r.uptime / 3600)} hours</strong>
        </div>
        <div>
          <span>Active tests</span>
          <strong>
            {state!.runs.filter((run) => ['running', 'paused'].includes(run.status)).length} / 4
          </strong>
        </div>
        <div>
          <span>Metric refresh</span>
          <strong>1 second</strong>
        </div>
      </section>
    </>
  );
}
