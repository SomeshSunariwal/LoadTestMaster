import { useCallback, useEffect, useRef, useState } from 'react';
import { client } from '../apis/client';
import type { AppState, Page, Workspace } from '../shared/schema';

export function useController() {
  const [state, setState] = useState<AppState>();
  const [page, setPage] = useState<Page>('dashboard');
  const [collectionId, setCollectionId] = useState('ecommerce');
  const [runId, setRunId] = useState<string>();
  // Dashboard tabs belong to this session; loading saved history must not open them.
  const [openRunIds, setOpenRunIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const local = useRef<Workspace | undefined>(undefined);
  const saving = useRef(false);
  const revision = useRef(0);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const polling = useRef(false);

  const refresh = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    const requestedRevision = revision.current;
    try {
      const next = await client.state();
      if (!saving.current && requestedRevision === revision.current) {
        local.current = next.workspace;
        setState(next);
      } else setState((previous) => (previous ? { ...next, workspace: previous.workspace } : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to the backend.');
    } finally {
      polling.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const update = useCallback((fn: (workspace: Workspace) => void) => {
    if (!local.current) return;
    const next = structuredClone(local.current);
    fn(next);
    local.current = next;
    revision.current++;
    saving.current = true;
    setState((s) => (s ? { ...s, workspace: next } : s));
  }, []);

  const save = useCallback(async (message = 'Changes saved') => {
    if (!local.current) return;
    const input = structuredClone(local.current);
    const savedRevision = revision.current;
    setBusy(true);
    try {
      const work = saveQueue.current.catch(() => {}).then(() => client.save(input));
      saveQueue.current = work;
      const next = await work;
      if (revision.current === savedRevision) {
        // Invalidate polls started before this save committed on the backend.
        revision.current++;
        local.current = next;
        saving.current = false;
      }
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const perform = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const openRun = useCallback((id: string) => {
    setOpenRunIds((open) => new Set(open).add(id));
    setRunId(id);
  }, []);

  const closeRun = useCallback(
    (id: string) => {
      const visibleRuns = (state?.runs ?? []).filter((run) => openRunIds.has(run.id));
      const index = visibleRuns.findIndex((run) => run.id === id);
      const neighbor = visibleRuns[index + 1] ?? visibleRuns[index - 1];
      setOpenRunIds((open) => {
        const next = new Set(open);
        next.delete(id);
        return next;
      });
      setRunId((current) => {
        const selected = visibleRuns.find((run) => run.id === current) ?? visibleRuns[0];
        return selected?.id === id ? neighbor?.id : current;
      });
      const run = state?.runs.find((run) => run.id === id);
      setNotice(
        run && ['running', 'paused'].includes(run.status)
          ? 'Tab closed. The test continues in the background.'
          : 'Tab closed. Results are still available in History.',
      );
    },
    [state?.runs, openRunIds],
  );

  const start = useCallback(
    (all = false) =>
      perform(async () => {
        await save('Test configuration saved');
        const id = await client.start({ collectionId, all });
        openRun(id);
        setPage('dashboard');
      }),
    [collectionId, perform, save, openRun],
  );

  return {
    state,
    page,
    setPage,
    collectionId,
    setCollectionId,
    runId,
    openRun,
    openRunIds,
    closeRun,
    error,
    setError,
    notice,
    setNotice,
    busy,
    update,
    save,
    perform,
    start,
    refresh,
    dirty: saving.current,
  };
}

export type AppController = ReturnType<typeof useController>;
