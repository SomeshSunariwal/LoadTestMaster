import type { ApiDefinition, Environment } from '../shared/schema';

export function variableResolver(environment: Environment) {
  const values = Object.fromEntries(
    environment.variables.filter((v) => v.enabled && v.key).map((v) => [v.key, v.value]),
  );

  const resolve = (input: string, stack: string[] = []): string =>
    input.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => {
      if (!(key in values)) throw new Error(`Missing environment variable: ${key}`);
      if (stack.includes(key) || stack.length > 20)
        throw new Error(`Circular environment variable: ${key}`);
      return resolve(values[key]!, [...stack, key]);
    });
  return resolve;
}

export function prepareRequest(api: ApiDefinition, environment: Environment) {
  const resolve = variableResolver(environment);
  const url = new URL(resolve(api.url));

  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Only HTTP and HTTPS endpoints are supported.');

  for (const p of api.params.filter((p) => p.enabled && p.key))
    url.searchParams.set(resolve(p.key), resolve(p.value));

  const headers = new Headers();
  for (const h of api.headers.filter((h) => h.enabled && h.key))
    headers.set(resolve(h.key), resolve(h.value));

  if (api.auth === 'bearer') headers.set('Authorization', `Bearer ${resolve(api.token)}`);
  if (api.auth === 'basic')
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${resolve(api.username)}:${resolve(api.password)}`).toString('base64')}`,
    );
  let body =
    ['GET', 'HEAD'].includes(api.method) || api.bodyType === 'none' ? undefined : resolve(api.body);
  if (body && api.bodyType === 'json') {
    JSON.parse(body);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }
  if (body && api.bodyType === 'form') {
    body = new URLSearchParams(body).toString();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
  }
  return {
    url: url.toString(),
    options: {
      method: api.method,
      headers,
      body,
      redirect: api.followRedirects ? ('follow' as const) : ('manual' as const),
    },
  };
}
