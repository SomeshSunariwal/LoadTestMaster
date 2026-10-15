import './css/History.css';
import { FiClock, FiArrowUpRight, FiTrash2 } from 'react-icons/fi';
import { useApp } from '../hooks/useApp';
import { client } from '../apis/client';
import { clock, number } from '../shared/format';
import { Badge, Button, Empty, IconButton } from '../components/ui';
import { ResizableTable, type TableColumn } from '../components/ResizableTable';

const columns: TableColumn[] = [
  { id: 'test', label: 'Test / Environment', minWidth: 170, weight: 30 },
  { id: 'started', label: 'Started', minWidth: 170, weight: 20 },
  { id: 'status', label: 'Status', minWidth: 95, weight: 10 },
  { id: 'duration', label: 'Duration', minWidth: 75, weight: 8 },
  { id: 'requests', label: 'Requests', minWidth: 80, weight: 8 },
  { id: 'average', label: 'Avg. time', minWidth: 85, weight: 8 },
  { id: 'errors', label: 'Errors', minWidth: 60, weight: 6 },
  { id: 'actions', label: 'Actions', minWidth: 85, weight: 10, hideLabel: true },
];
export function History() {
  const app = useApp();
  const runs = app.state!.runs.filter((r) => !['running', 'paused'].includes(r.status));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A RECORD OF EVERY RUN</div>
          <h1>
            Test history
            <span className="heading-dot purple" />
          </h1>
          <p>Look back, compare, and keep moving forward.</p>
        </div>
        <Badge tone="neutral">{runs.length} saved runs</Badge>
      </div>
      <section className="panel history-panel">
        {runs.length ? (
          <ResizableTable columns={columns} storageKey="loadmaster.history-column-widths.v1">
            {runs.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  <small className="table-subtitle">{r.environment}</small>
                </td>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>
                  <Badge tone={r.status === 'completed' ? 'green' : 'amber'}>{r.status}</Badge>
                </td>
                <td>{clock(r.elapsed)}</td>
                <td>{number(r.requests)}</td>
                <td>{number(r.avg)} ms</td>
                <td className={r.errors ? 'text-red' : 'muted'}>{number(r.errors)}</td>
                <td>
                  <div className="actions">
                    <IconButton
                      label={`View ${r.name} results`}
                      onClick={() => {
                        app.openRun(r.id);
                        app.setPage('dashboard');
                      }}
                    >
                      <FiArrowUpRight />
                    </IconButton>
                    <IconButton
                      label={`Delete ${r.name} run`}
                      onClick={() => void app.perform(() => client.deleteRun(r.id))}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </ResizableTable>
        ) : (
          <Empty
            icon={<FiClock />}
            heading="Your testing story starts here"
            action={
              <Button variant="primary" onClick={() => app.setPage('collections')}>
                Create a load test
              </Button>
            }
          >
            Completed and stopped runs will appear here automatically.
          </Empty>
        )}
      </section>
    </>
  );
}
