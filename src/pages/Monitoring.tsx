import './css/Monitoring.css';
import { FiActivity, FiCpu, FiServer, FiZap, FiMove, FiRotateCcw, FiPlus, FiChevronDown, FiMinus } from 'react-icons/fi';
import * as Popover from '@radix-ui/react-popover';
import { useApp } from '../hooks/useApp';
import { bytes, number } from '../shared/format';
import { useEffect, useMemo, useState } from 'react';
import GridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import { useLayoutPreference } from '../hooks/useLayoutPreference';
import { Button } from '../components/ui';
import { monitoringIds, monitoringSelectionSchema, monitoringLayoutsSchema, defaultMonitoringLayout, constrainMonitoringLayout } from '../shared/monitoringLayout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

function MoveHandle({ title, onRemove }: { title: string; onRemove: () => void }) {
  return <><button type="button" className="monitor-remove" aria-label={`Remove ${title}`} title="Remove metric" onClick={onRemove}><FiMinus /></button><button type="button" className="monitor-move" aria-label={`Move ${title}`} title="Drag to move">
    <FiMove />
  </button></>;
}

export function Monitoring() {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const cols = width >= 800 ? 12 : width >= 550 ? 6 : 3;
  const [preferences, savePreferences] = useLayoutPreference('loadmaster.monitoring-layout.v1', monitoringLayoutsSchema, {});
  useEffect(() => {
    // Apply the equal-width compact defaults once; subsequent resizing is retained.
    const key = 'loadmaster.monitoring-compact-cards.v2';
    try {
      if (localStorage.getItem(key)) return;
      savePreferences({});
      localStorage.setItem(key, 'true');
    } catch { /* Layout still works when browser storage is unavailable. */ }
  }, [preferences, savePreferences]);
  const [selected, saveSelected] = useLayoutPreference('loadmaster.monitoring-metrics.v1', monitoringSelectionSchema, ['CPU utilization']);
  const [menuOpen, setMenuOpen] = useState(false);
  const allLayout = useMemo(() => constrainMonitoringLayout(preferences[String(cols)] ?? defaultMonitoringLayout(cols), cols), [preferences, cols]);
  const layout = allLayout.filter((item) => selected.includes(item.i));
  const save = (next: Layout) => savePreferences({ ...preferences, [String(cols)]: allLayout.map((item) => {
    const updated = next.find((entry) => entry.i === item.i) ?? item;
    return { i: item.i, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
  }) });
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
      <div className="monitor-toolbar">
  <Button variant="ghost" onClick={() => savePreferences({})}><FiRotateCcw /> Reset layout</Button>
  <div className="monitor-actions">
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="button"><FiPlus /> Metric <FiChevronDown /></button>
      </Popover.Trigger>
      <Popover.Portal><div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
        <Popover.Content className="monitor-metric-menu" align="end" sideOffset={6} aria-label="Add a metric">
          {monitoringIds.filter((id) => !selected.includes(id)).map((id) => (
            <button type="button" key={id} onClick={() => {
              saveSelected([...selected, id]);
              setMenuOpen(false);
            }}>{id}</button>
          ))}
          {selected.length === monitoringIds.length && <span>All metrics added</span>}
        </Popover.Content>
      </div></Popover.Portal>
    </Popover.Root>
  </div>
</div>
<div ref={containerRef} className="monitor-layout">
{mounted && <GridLayout width={width} layout={layout}
  gridConfig={{ cols, rowHeight: 24, margin: [18, 18], containerPadding: [0, 0] }}
  dragConfig={{ enabled: true, handle: '.monitor-move' }}
  resizeConfig={{ enabled: true, handles: ['se'] }}
  onDragStop={save} onResizeStop={save}>
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
            detail: 'Across all active tests',
            progress: undefined,
            tone: 'purple',
          },
        ].filter((s) => selected.includes(s.title as (typeof monitoringIds)[number])).map((s) => (
          <section key={s.title} className="panel monitor-card"><MoveHandle title={s.title} onRemove={() => saveSelected(selected.filter((id) => id !== s.title))} />
            <span className={`stat-icon ${s.tone}`}>{s.icon}</span>
            <h3>{s.title}</h3>
            <strong>{s.value}</strong>
            <p>{s.detail}</p>
            {s.progress !== undefined && (
              <div className={`progress ${s.tone}`}>
                <span style={{ width: `${s.progress}%` }} />
              </div>
            )}
          </section>
        ))}
      {selected.includes('System information') && <section key="System information" className="panel system-info"><MoveHandle title="System information" onRemove={() => saveSelected(selected.filter((id) => id !== 'System information'))} />
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
          <strong>100 ms</strong>
        </div>
      </section>}
      </GridLayout>}
      </div>
    </>
  );
}

