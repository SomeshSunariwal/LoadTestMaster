import type { RPCSchema } from 'electrobun/view';
import type { ApiRequestLog, AppState, RunLogFileInfo, StartInput, Workspace } from './schema';

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      state: { params: undefined; response: AppState };
      logs: { params: { runId: string; apiId: string }; response: ApiRequestLog[] };
      logFiles: { params: { runId: string }; response: RunLogFileInfo[] };
      readLogChunk: {
        params: { runId: string; name: string; offset: number };
        response: { content: string; nextOffset: number; size: number };
      };
      downloadLog: { params: { runId: string; name: string }; response: string };
      downloadCsv: { params: { runId: string }; response: string };
      save: { params: Workspace; response: Workspace };
      start: { params: StartInput; response: string };
      control: { params: { id: string; action: 'pause' | 'resume' | 'stop' }; response: boolean };
      deleteRun: { params: { id: string }; response: boolean };
    };
    messages: {};
  }>;
  webview: RPCSchema<{ requests: {}; messages: {} }>;
};
