import { createService } from './service';

const token = process.env.LOADMASTER_TOKEN;

if (!token) throw new Error('LOADMASTER_TOKEN must be set by the development launcher.');

const service = await createService(process.env.LOADMASTER_DATA_DIR || '.data');

const methods = {
  state: service.state,
  logs: service.logs,
  save: service.save,
  start: service.start,
  control: service.control,
  deleteRun: service.deleteRun,
};

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.LOADMASTER_PORT || 4319),
  async fetch(request) {
    if (request.headers.get('Authorization') !== `Bearer ${token}`)
      return new Response('Unauthorized', { status: 401 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    try {
      const method = new URL(request.url).pathname.split('/').at(-1) as keyof typeof methods;

      if (!Object.hasOwn(methods, method)) return new Response('Not found', { status: 404 });

      const body = await request.json();
      const result = await (methods[method] as (input: never) => unknown)(body as never);
      return Response.json({ result });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Request failed' },
        { status: 400 },
      );
    }
  },
});

console.log(`LoadMaster backend ready on ${server.port}`);

process.on('SIGINT', () => {
  service.shutdown();
  server.stop(true);
  process.exit(0);
});
