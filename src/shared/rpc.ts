import type { RPCSchema } from 'electrobun/view';
import type { ApiRequestLog, AppState, StartInput, Workspace } from './schema';

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      state: { params: undefined; response: AppState };
      logs: { params: { runId: string; apiId: string }; response: ApiRequestLog[] };
      save: { params: Workspace; response: Workspace };
      start: { params: StartInput; response: string };
      control: { params: { id: string; action: 'pause' | 'resume' | 'stop' }; response: boolean };
      deleteRun: { params: { id: string }; response: boolean };
    };
    messages: {};
  }>;
  webview: RPCSchema<{ requests: {}; messages: {} }>;
};
