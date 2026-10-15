import type { RPCSchema } from 'electrobun/view';
import type { AppState, StartInput, Workspace } from './schema';

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      state: { params: undefined; response: AppState };
      save: { params: Workspace; response: Workspace };
      start: { params: StartInput; response: string };
      control: { params: { id: string; action: 'pause' | 'resume' | 'stop' }; response: boolean };
      deleteRun: { params: { id: string }; response: boolean };
    };
    messages: {};
  }>;
  webview: RPCSchema<{ requests: {}; messages: {} }>;
};
