import type { ApiDefinition, LoadConfig, Pair, Workspace } from './schema';
export const uid = () => crypto.randomUUID();

export const defaultConfig: LoadConfig = {
  loadMode: 'users',
  targetTps: 100,
  tpsParallel: false,
  users: 10,
  duration: 60,
  rampUp: 5,
  iterations: 100,
  timeout: 30,
  delay: 100,
  parallel: 1,
  rateLimit: 50,
  thinkTime: false,
  thinkMin: 100,
  thinkMax: 500,
};

export const pair = (key = '', value = ''): Pair => ({ id: uid(), key, value, enabled: true });

export const blankApi = (): ApiDefinition => ({
  id: uid(),
  name: '',
  method: 'GET',
  url: '',
  selected: true,
  params: [],
  headers: [],
  auth: 'none',
  token: '',
  username: '',
  password: '',
  bodyType: 'none',
  body: '',
  expectedStatus: 0,
  responseContains: '',
  followRedirects: true,
  tags: '',
  useGlobal: true,
  config: { ...defaultConfig },
});

export function createEmptyWorkspace(): Workspace {
  return {
    theme: 'dark',
    retention: 30,
    environments: [],
    collections: [],
  };
}
