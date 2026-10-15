import { z } from 'zod';

export const pairSchema = z.object({
  id: z.string(),
  key: z.string().max(500),
  value: z.string().max(100000),
  enabled: z.boolean(),
});
export const configSchema = z
  .object({
    users: z.number().int().min(1).max(1000),
    duration: z.number().min(1).max(86400),
    rampUp: z.number().min(0).max(86400),
    iterations: z.number().int().min(1).max(1000000),
    timeout: z.number().min(1).max(300),
    delay: z.number().min(0).max(60000),
    parallel: z.number().int().min(1).max(20),
    rateLimit: z.number().min(0).max(100000),
    thinkTime: z.boolean(),
    thinkMin: z.number().min(0).max(60000),
    thinkMax: z.number().min(0).max(60000),
  })
  .refine((c) => !c.thinkTime || c.thinkMax >= c.thinkMin, {
    message: 'Maximum think time must be at least the minimum.',
    path: ['thinkMax'],
  });
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
  bodyType: z.enum(['none', 'json', 'raw', 'form', 'graphql']),
  body: z.string().max(1000000),
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
export interface Point {
  second: number;
  rps: number;
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
