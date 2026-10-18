import { z } from 'zod';

export const pairSchema = z.object({
  id: z.string(),
  key: z.string().max(500),
  value: z.string().max(100000),
  enabled: z.boolean(),
});

export const configSchema = z
  .object({
    loadMode: z.enum(['users', 'tps']).default('users'),
    targetTps: z.number().min(1).max(100000).default(100),
    tpsParallel: z.boolean().default(false),
    users: z.number().int().min(1).max(1000),
    duration: z.number().min(1).max(86400),
    rampUp: z.number().min(0).max(86400),
    iterations: z
      .number()
      .int()
      .min(-1)
      .max(1000000)
      .refine((value) => value !== 0, {
        message: 'Use -1 for unlimited iterations, or enter a positive number.',
      }),
    timeout: z.number().min(1).max(300),
    delay: z.number().min(0).max(60000),
    parallel: z.number().int().min(1).max(20),
    rateLimit: z.number().min(0).max(100000),
    thinkTime: z.boolean(),
    thinkMin: z.number().min(0).max(60000),
    thinkMax: z.number().min(0).max(60000),
  })
  .refine((c) => c.loadMode === 'tps' || !c.thinkTime || c.thinkMax >= c.thinkMin, {
    message: 'Maximum think time must be at least the minimum.',
    path: ['thinkMax'],
  });

export const bodyGeneratorSchema = z.object({
  id: z.string(),
  key: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Generator keys must start with a letter or underscore and contain only letters, numbers, or underscores.'),
  type: z.enum(['increment', 'uuid', 'list']),
  start: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  step: z.number().int().min(1).max(50),
  values: z.array(z.string().max(100000)).max(1000),
}).refine((g) => g.type !== 'list' || g.values.length > 0, 'Add at least one list value.');
export const bodyGeneratorsSchema = z.array(bodyGeneratorSchema).max(100)
  .refine((items) => new Set(items.map((g) => g.key)).size === items.length, 'Generator keys must be unique.');
export type BodyGenerator = z.infer<typeof bodyGeneratorSchema>;

export const apiSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(200),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  url: z.string().trim().min(1).max(5000),
  selected: z.boolean(),
  params: z.array(pairSchema).max(100),
  headers: z.array(pairSchema).max(100),
  auth: z.enum(['none', 'bearer', 'basic']),
  token: z.string(),
  username: z.string(),
  password: z.string(),
  bodyType: z.enum(['none', 'json', 'xml', 'raw', 'form', 'multipart', 'graphql']),
  body: z.string().max(1000000),
  generators: bodyGeneratorsSchema.default([]),
  expectedStatus: z.number().int().min(0).max(599),
  responseContains: z.string(),
  followRedirects: z.boolean(),
  tags: z.string(),
  useGlobal: z.boolean(),
  config: configSchema,
});

export const environmentSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  color: z.string(),
  variables: z.array(pairSchema).max(300),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(200),
  description: z.string(),
  color: z.string(),
  environmentId: z.string(),
  config: configSchema,
  apis: z.array(apiSchema).max(500),
});

export const workspaceSchema = z.object({
  collections: z.array(collectionSchema).max(100),
  environments: z.array(environmentSchema).max(100),
  theme: z.enum(['dark', 'light']),
  retention: z.number().int().min(1).max(100),
});

export type Pair = z.infer<typeof pairSchema>;
export type LoadConfig = z.infer<typeof configSchema>;
export type ApiDefinition = z.infer<typeof apiSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Page =
  'dashboard' | 'collections' | 'environments' | 'history' | 'monitoring' | 'settings';
export type RunStatus = 'running' | 'paused' | 'completed' | 'stopped';

export interface EndpointStats {
  id: string;
  name: string;
  method: string;
  url: string;
  requests: number;
  errors: number;
  totalMs: number;
  avg: number;
  p95: number;
  p99: number;
  lastError: string;
}

export interface ApiRequestLog {
  id: string;
  apiId: string;
  requestAt: string;
  request: { method: string; url: string; headers: Record<string, string>; body: string };
  responseAt?: string;
  response?: {
    status?: number;
    headers: Record<string, string>;
    body: string;
    bytes: number;
    durationMs: number;
    error: string;
  };
}

export interface RunLogFileInfo {
  name: string;
  size: number;
}

export interface Point {
  second: number;
  timestamp?: number;
  spanStart?: number;
  samples?: number;
  outstandingRequests?: number;
  cpu?: number;
  rps: number;
  startRps?: number;
  users: number;
  avg: number;
  p95: number;
  p99: number;
}

export interface RunSnapshot {
  id: string;
  collectionId: string;
  name: string;
  environment: string;
  status: RunStatus;
  startedAt: string;
  elapsed: number;
  duration: number;
  users: number;
  activeUsers: number;
  requests: number;
  errors: number;
  bytes: number;
  avg: number;
  p95: number;
  p99: number;
  rps: number;
  loadMode?: 'users' | 'tps' | 'mixed';
  targetTps?: number;
  startedRequests?: number;
  startRps?: number;
  points: Point[];
  endpoints: EndpointStats[];
  distribution: { range: string; count: number }[];
}

export interface Resources {
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  uptime: number;
  platform: string;
  inFlight: number;
}

export interface AppState {
  workspace: Workspace;
  runs: RunSnapshot[];
  resources: Resources;
}

export interface StartInput {
  collectionId: string;
  all: boolean;
}
