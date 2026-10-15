import './ApiLogsModal.css';
import { useEffect, useState } from 'react';
import { client } from '../apis/client';
import type { ApiRequestLog, EndpointStats } from '../shared/schema';
import { Modal } from './ui';

export function ApiLogsModal({
  runId,
  endpoint,
  onClose,
}: {
  runId: string;
  endpoint: EndpointStats;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await client.logs(runId, endpoint.id);
        if (!cancelled) {
          setLogs(result);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load logs.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(refresh, 1000);
        }
      }
    };
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId, endpoint.id]);

  return (
    <Modal
      title={`Logs · ${endpoint.name}`}
      subtitle={`${endpoint.method} ${endpoint.url}`}
      onClose={onClose}
      wide
      className="api-logs-modal"
    >
      <div className="api-logs-status" role="status">
        <span>Refreshes every second · Newest requests first</span>
        <span>{logs.length} requests</span>
      </div>
      {error && (
        <p role="alert" className="text-red">
          {error}
        </p>
      )}
      <div className="api-logs-list" aria-label="API request and response logs">
        {!logs.length && (
          <p className="muted">
            {loading
              ? 'Loading logs…'
              : 'No logs available. Logs are captured for new runs in this app session.'}
          </p>
        )}
        {[...logs].reverse().map((log) => (
          <article className="api-log-pair" key={log.id}>
            <details>
              <summary>
                <time>{log.requestAt}</time> : <code>{log.id}</code> :{' '}
                <strong className="api-log-request">request</strong>
              </summary>
              <pre>{JSON.stringify(log.request, null, 2)}</pre>
            </details>
            <details>
              <summary>
                {log.responseAt ? <time>{log.responseAt}</time> : <span>Pending</span>} :{' '}
                <code>{log.id}</code> :{' '}
                <strong className={log.response?.error ? 'text-red' : 'api-log-response'}>
                  response
                </strong>
                {log.response && (
                  <span>
                    {' '}
                    · {log.response.status ?? 'Failed'} · {log.response.durationMs.toFixed(1)} ms
                  </span>
                )}
              </summary>
              <pre>
                {log.response ? JSON.stringify(log.response, null, 2) : 'Waiting for response…'}
              </pre>
            </details>
          </article>
        ))}
      </div>
      <p className="api-logs-note">
        Latest 100 requests per API within a 200-request run buffer. Body previews are limited to
        4,096 characters; sensitive headers are masked. Logs remain available for retained runs
        during this app session.
      </p>
    </Modal>
  );
}
