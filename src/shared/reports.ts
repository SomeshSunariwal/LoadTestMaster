import type { RunSnapshot } from './schema';

function csvCell(value: string | number) {
  const text = String(value);
  // Prevent spreadsheet formulas when a report contains a user-provided label.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function runCsv(run: RunSnapshot) {
  const rows: (string | number)[][] = [
    ['Test', run.name],
    ['Environment', run.environment],
    ['Started', run.startedAt],
    ['Status', run.status],
    ['Elapsed seconds', run.elapsed],
    [],
    [
      'Method',
      'API',
      'Endpoint',
      'Requests',
      'Errors',
      'Success %',
      'Average ms',
      'P95 ms',
      'P99 ms',
    ],
  ];
  for (const e of run.endpoints)
    rows.push([
      e.method,
      e.name,
      e.url,
      e.requests,
      e.errors,
      e.requests ? 100 * (1 - e.errors / e.requests) : 0,
      e.avg,
      e.p95,
      e.p99,
    ]);
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
