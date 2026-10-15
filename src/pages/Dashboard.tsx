import './css/Dashboard.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiArrowUpRight,
  FiClock,
  FiGlobe,
  FiLayers,
  FiPause,
  FiPlay,
  FiPlus,
  FiSquare,
  FiUsers,
  FiZap,
  FiArrowRight,
  FiDownload,
  FiX,
  FiChevronDown,
} from 'react-icons/fi';
import type { RunLogFileInfo } from '../shared/schema';
import { useApp } from '../hooks/useApp';
import { client } from '../apis/client';
import { number, clock } from '../shared/format';
import { Badge, Button } from '../components/ui';
import { RunBoard } from '../components/RunBoard';
export function Dashboard() {
  const app = useApp();
  const runs = app.state!.runs.filter((run) => app.openRunIds.has(run.id));
  const run = runs.find((r) => r.id === app.runId) || runs[0];
  const [logFiles, setLogFiles] = useState<RunLogFileInfo[]>([]);
  const [loadingLogFiles, setLoadingLogFiles] = useState(false);
  const runTabsRef = useRef<HTMLDivElement>(null);
  const [runTabIndicator, setRunTabIndicator] = useState({ left: 0, width: 0 });
  const [runTabIndicatorReady, setRunTabIndicatorReady] = useState(false);

  useLayoutEffect(() => {
    const tabs = runTabsRef.current;
    const update = () => {
      const activeTab = tabs?.querySelector<HTMLElement>('.run-tab.active');
      if (activeTab) {
        const runTabs = tabs?.querySelectorAll('.run-tab');
        const isLastRunTab = runTabs?.[runTabs.length - 1] === activeTab;
        const width = activeTab.offsetWidth - (isLastRunTab ? 4 : 0);
        setRunTabIndicator({ left: activeTab.offsetLeft, width });
        setRunTabIndicatorReady(width > 0);
      }
    };
    update();
    if (!tabs) return;
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    const activeTab = tabs.querySelector<HTMLElement>('.run-tab.active');
    if (activeTab) observer.observe(activeTab);
    return () => observer.disconnect();
  }, [run?.id, runs.length]);

  useEffect(() => {
    let cancelled = false;
    setLogFiles([]);
    if (!run || ['running', 'paused'].includes(run.status)) return;
    setLoadingLogFiles(true);
    void client
      .logFiles(run.id)
      .then((files) => {
        if (!cancelled) setLogFiles(files);
      })
      .catch((error) => {
        if (!cancelled) app.setError(error instanceof Error ? error.message : 'Could not list logs.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLogFiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run?.id, run?.status]);

  const downloadLog = (name: string) => {
    if (!run) return;
    void app.perform(async () => {
      const location = await client.downloadLog(run.id, name);
      app.setNotice(`Downloaded log to ${location}`);
    });
  };
  const downloadCsv = () => {
    if (!run) return;
    void app.perform(async () => {
      const location = await client.downloadCsv(run.id);
      app.setNotice(`Exported CSV to ${location}`);
    });
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PERFORMANCE AT A GLANCE</div>
          <h1>
            Dashboard
            <span className="heading-dot" />
          </h1>
          <p>Every request tells a story. Here’s yours, in real time.</p>
        </div>
        <div className="actions">
          <Button variant="primary" onClick={() => app.setPage('collections')}>
            <FiPlus />
            New load test
          </Button>
        </div>
      </div>
      {!run ? (
        <div className="dashboard-welcome-scroll">
          <div className="welcome-panel panel">
            <div className="welcome-copy">
              <Badge tone="green">
                <span className="dot green" />
                Your workspace is ready
              </Badge>
              <h2>
                Confidence,
                <br />
                under pressure.
              </h2>
              <p>
                Put your APIs to the test. See response times, throughput, and errors as they
                happen.
              </p>
              <div className="actions">
                <Button onClick={() => app.setPage('collections')}>
                  Explore collections
                  <FiArrowRight />
                </Button>
              </div>
            </div>
            <div className="welcome-visual">
              <div className="visual-grid" />
              <div className="visual-label">
                <FiActivity />
                YOUR NEXT RUN<span>CONFIGURE AN API</span>
              </div>
              <svg viewBox="0 0 480 200" aria-hidden="true">
                <defs>
                  <linearGradient id="welcome-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#4d8dff" stopOpacity=".35" />
                    <stop offset="1" stopColor="#4d8dff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 180 L30 175 50 160 70 165 100 140 115 145 140 100 160 120 185 80 210 90 235 50 255 70 280 40 300 60 325 25 345 45 370 30 400 38 430 20 460 28 480 15 V200 H0Z"
                  fill="url(#welcome-fill)"
                />
                <path
                  d="M0 180 L30 175 50 160 70 165 100 140 115 145 140 100 160 120 185 80 210 90 235 50 255 70 280 40 300 60 325 25 345 45 370 30 400 38 430 20 460 28 480 15"
                  fill="none"
                  stroke="#6b9fff"
                  strokeWidth="3"
                />
              </svg>
              <div className="visual-stats">
                <div>
                  <small>RESPONSE TIME</small>
                  <strong>Ready to measure</strong>
                </div>
                <FiZap />
              </div>
            </div>
          </div>
          <div className="intro-grid">
            {[
              [
                <FiLayers />,
                '01',
                'Build your collection',
                'Group endpoints, add headers, and configure request bodies.',
              ],
              [
                <FiGlobe />,
                '02',
                'Choose your environment',
                'Use reusable variables across local, staging, and production.',
              ],
              [
                <FiActivity />,
                '03',
                'Watch it perform',
                'Run real HTTP traffic and follow the metrics as they arrive.',
              ],
            ].map(([icon, n, title, desc]) => (
              <div key={String(n)} className="panel intro-card">
                <span className="intro-number">{n}</span>
                <div className="intro-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>Your collections</h2>
            <button className="text-link" onClick={() => app.setPage('collections')}>
              View all
              <FiArrowRight />
            </button>
          </div>
          <div className="intro-grid">
            {app.state!.workspace.collections.map((c) => (
              <button
                className="panel quick-collection"
                key={c.id}
                onClick={() => {
                  app.setCollectionId(c.id);
                  app.setPage('collections');
                }}
              >
                <FiLayers style={{ color: c.color }} />
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.apis.length} APIs · Ready to run</small>
                </span>
                <FiArrowUpRight />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={runTabsRef}
            className={`tabs run-tabs ${runTabIndicatorReady ? 'indicator-ready' : ''}`}
            role="tablist"
            aria-label="Load test runs"
          >
            {runs.map((r) => (
              <div key={r.id} className={`run-tab ${run.id === r.id ? 'active' : ''}`}>
                <button
                  type="button"
                  role="tab"
                  id={`run-tab-${r.id}`}
                  aria-controls="run-results"
                  aria-selected={run.id === r.id}
                  key={r.id}
                  onClick={() => app.openRun(r.id)}
                >
                  <span
                    className={`dot ${r.status === 'running' ? 'green' : r.status === 'paused' ? 'amber' : 'muted-dot'}`}
                  />
                  {r.name}
                </button>
                <button
                  type="button"
                  className="run-tab-close"
                  aria-label={`Close ${r.name} tab`}
                  title={`Close ${r.name} tab`}
                  onClick={() => app.closeRun(r.id)}
                >
                  <FiX />
                </button>
              </div>
            ))}
            <span
              className="run-tab-indicator"
              aria-hidden="true"
              style={{ left: runTabIndicator.left, width: runTabIndicator.width }}
            />
            <button
              type="button"
              className="run-tab-add"
              aria-label="New load test"
              title="New load test"
              onClick={() => app.setPage('collections')}
            >
              <svg
                className="run-tab-add-frame"
                viewBox="0 0 50 40"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <rect className="run-tab-add-mask" width="50" height="40" />
                <path d="M0 40C5 40 8 36 8 30V11C8 5 13 1 19 1H31C37 1 42 5 42 11V30C42 36 45 40 50 40Z" />
                <path d="M0 40C5 40 8 36 8 30V11C8 5 13 1 19 1H31C37 1 42 5 42 11V30C42 36 45 40 50 40" />
              </svg>
              <FiPlus />
            </button>
          </div>
          <div id="run-results" role="tabpanel" aria-labelledby={`run-tab-${run.id}`}>
            <div className="run-heading">
              <div>
                <div className="run-title">
                  <div className="run-logo">
                    <FiZap />
                  </div>
                  <h2>{run.name}</h2>
                  <Badge
                    tone={
                      run.status === 'running'
                        ? 'green'
                        : run.status === 'paused'
                          ? 'amber'
                          : 'blue'
                    }
                  >
                    <span className="dot" />
                    {run.status}
                  </Badge>
                  <Badge tone="neutral">
                    <FiClock />
                    {clock(run.elapsed)}
                  </Badge>
                </div>
                <p>
                  {app.state!.workspace.collections.find((c) => c.id === run.collectionId)
                    ?.description || 'API performance test results'}
                </p>
                <div className="actions run-meta">
                  <Badge tone="neutral">
                    <FiGlobe />
                    HTTP
                  </Badge>
                  <Badge tone="neutral">
                    <FiClock />
                    {run.duration}s duration
                  </Badge>
                  <Badge tone="neutral">
                    <FiUsers />
                    {number(run.users)} users
                  </Badge>
                  <Badge tone="purple">
                    <FiLayers />
                    Environment: {run.environment}
                  </Badge>
                </div>
              </div>
              <div className="actions">
                {!['running', 'paused'].includes(run.status) && (
                  logFiles.length > 1 ? (
                    <details className="log-download-menu">
                      <summary className="button secondary" aria-busy={loadingLogFiles}>
                        <FiDownload />
                        Download Log
                        <FiChevronDown />
                      </summary>
                      <div className="log-download-list" role="menu" aria-label="Download a log file">
                        {logFiles.map((file) => (
                          <button key={file.name} role="menuitem" onClick={() => downloadLog(file.name)}>
                            <FiDownload />
                            {file.name}
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Button
                      disabled={loadingLogFiles || logFiles.length === 0}
                      title={logFiles.length === 0 ? 'No request logs were captured for this run.' : 'Download request log'}
                      onClick={() => logFiles[0] && downloadLog(logFiles[0].name)}
                    >
                      <FiDownload />
                      Download Log
                    </Button>
                  )
                )}
                {!['running', 'paused'].includes(run.status) && (
                  <Button title="Export endpoint results" onClick={downloadCsv}>
                    <FiDownload />
                    Export CSV
                  </Button>
                )}
                {['running', 'paused'].includes(run.status) ? (
                  <>
                    <Button
                      variant="danger"
                      onClick={() =>
                        void app.perform(() => client.control({ id: run.id, action: 'stop' }))
                      }
                    >
                      <FiSquare />
                      Stop test
                    </Button>
                    <Button
                      onClick={() =>
                        void app.perform(() =>
                          client.control({
                            id: run.id,
                            action: run.status === 'paused' ? 'resume' : 'pause',
                          }),
                        )
                      }
                    >
                      {run.status === 'paused' ? <FiPlay /> : <FiPause />}
                      {run.status === 'paused' ? 'Resume' : 'Pause'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      app.setCollectionId(run.collectionId);
                      app.setPage('collections');
                    }}
                  >
                    <FiPlay />
                    Run again
                  </Button>
                )}
              </div>
            </div>
            <RunBoard run={run} />
            <div className="dashboard-foot"></div>
          </div>
        </>
      )}
    </>
  );
}
