import type { ApiDefinition, Environment } from '../shared/schema';
import { parseMultipartFields } from '../shared/multipart';
import { renderGeneratedBody, supportsBodyGenerators } from '../shared/bodyGenerators';
import { variableResolver } from '../shared/environmentVariables';
export { variableResolver } from '../shared/environmentVariables';

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
  let multipartBody: Buffer<ArrayBuffer> | undefined;
  const format = supportsBodyGenerators(api.bodyType) ? api.bodyType : undefined;
  const generated = format && (api.generators?.length || /\{\{\s*gen\./.test(api.body)) && !['GET', 'HEAD'].includes(api.method);
  let body =
    ['GET', 'HEAD'].includes(api.method) || api.bodyType === 'none'
      ? undefined
      : api.bodyType === 'multipart'
        ? api.body
        : generated ? renderGeneratedBody(api.body, api.generators ?? [], 0, resolve, format) : resolve(api.body);
  if (body && api.bodyType === 'json') {
    JSON.parse(body);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }
  if (body && api.bodyType === 'form') {
    body = new URLSearchParams(body).toString();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
  }
  if (body !== undefined && api.bodyType === 'xml' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/xml');
  }
  if (body !== undefined && api.bodyType === 'graphql' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/graphql');
  }
  if (body !== undefined && api.bodyType === 'multipart') {
    // Resolve each field after parsing, so quotes in variable values remain valid.
    const fields = parseMultipartFields(api.body);
    const boundary = '----LoadMaster' + crypto.randomUUID().replaceAll('-', '');
    const quote = (text: string) => text.replace(/[\r\n]/g, '').replaceAll('"', '%22');
    const parts: Buffer[] = [];
    for (const field of fields.filter((field) => field.enabled && field.key)) {
      const name = quote(resolve(field.key));
      const filename = field.file ? '; filename="' + quote(field.file.name) + '"' : '';
      const contentType = (
        field.contentType
          ? resolve(field.contentType)
          : field.file?.type || (field.file ? 'application/octet-stream' : '')
      ).replace(/[\r\n]/g, '');
      parts.push(
        Buffer.from(
          '--' +
            boundary +
            '\r\nContent-Disposition: form-data; name="' +
            name +
            '"' +
            filename +
            '\r\n' +
            (contentType ? 'Content-Type: ' + contentType + '\r\n' : '') +
            '\r\n',
        ),
      );
      parts.push(
        field.file ? Buffer.from(field.file.data, 'base64') : Buffer.from(resolve(field.value)),
      );
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from('--' + boundary + '--\r\n'));
    multipartBody = Buffer.concat(parts);
    headers.set('Content-Type', 'multipart/form-data; boundary=' + boundary);
  }
  let sequence = 0;
  return {
    nextBody: generated ? () => renderGeneratedBody(api.body, api.generators ?? [], sequence++, resolve, format) : undefined,
    url: url.toString(),
    options: {
      method: api.method,
      headers,
      body: multipartBody ?? body,
      redirect: api.followRedirects ? ('follow' as const) : ('manual' as const),
    },
  };
}
