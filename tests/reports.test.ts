import { expect, test } from 'bun:test';
import { runCsv } from '../src/shared/reports';
import type { RunSnapshot } from '../src/shared/schema';
test('CSV escapes quoted names and protects against spreadsheet formula injection', () => {
  const csv = runCsv({
    name: '=HYPERLINK("x")',
    environment: 'Local',
    startedAt: '2026-10-15',
    status: 'completed',
    elapsed: 1,
    endpoints: [],
  } as unknown as RunSnapshot);
  expect(csv).toContain('"\'=HYPERLINK(""x"")"');
});
