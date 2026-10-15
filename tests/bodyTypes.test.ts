import { expect, test } from 'bun:test';
import { blankApi, pair } from '../src/shared/defaults';
import { prepareRequest } from '../src/backend/variables';
import type { Environment } from '../src/shared/schema';

const environment: Environment = {
  id: 'body-test',
  name: 'Test',
  color: '#fff',
  variables: [pair('name', 'a "quoted" value & more')],
};

test('multipart sends enabled fields, duplicate names, and resolved variable values', async () => {
  const api = {
    ...blankApi(),
    method: 'POST' as const,
    url: 'https://example.com',
    bodyType: 'multipart' as const,
    body: JSON.stringify([
      pair('title', '{{name}}'),
      pair('tag', 'one'),
      pair('tag', 'two'),
      { ...pair('hidden', 'excluded'), enabled: false },
    ]),
    headers: [pair('Content-Type', 'application/json')],
  };
  const prepared = prepareRequest(api, environment);
  const request = new Request(prepared.url, prepared.options);
  expect(request.headers.get('Content-Type')).toContain('multipart/form-data; boundary=');
  const form = await request.formData();
  expect(form.get('title')).toBe('a "quoted" value & more');
  expect(form.getAll('tag')).toEqual(['one', 'two']);
  expect(form.has('hidden')).toBe(false);
  expect(prepareRequest({ ...api, method: 'GET' }, environment).options.body).toBeUndefined();
});

test('XML resolves variables and respects a custom content type', () => {
  const api = {
    ...blankApi(),
    method: 'POST' as const,
    url: 'https://example.com',
    bodyType: 'xml' as const,
    headers: [],
    body: '<request>{{name}}</request>',
  };
  const result = prepareRequest(api, environment);
  expect(result.options.headers.get('Content-Type')).toBe('application/xml');
  expect(result.options.body).toBe('<request>a "quoted" value & more</request>');
  expect(
    prepareRequest(
      { ...api, headers: [pair('Content-Type', 'text/xml')] },
      environment,
    ).options.headers.get('Content-Type'),
  ).toBe('text/xml');
});

test('invalid multipart data fails with a helpful error', () => {
  expect(() =>
    prepareRequest(
      {
        ...blankApi(),
        method: 'POST',
        url: 'https://example.com',
        bodyType: 'multipart',
        body: '{}',
      },
      environment,
    ),
  ).toThrow('Invalid multipart fields');
});

test('multipart preserves binary uploads, filenames, and per-part content types', async () => {
  const bytes = Buffer.from([0, 255, 128, 13, 10, 42]);
  const api = {
    ...blankApi(),
    method: 'POST' as const,
    url: 'https://example.com',
    bodyType: 'multipart' as const,
    body: JSON.stringify([
      {
        ...pair('attachment'),
        file: {
          name: 'sample.bin',
          data: bytes.toString('base64'),
          type: 'application/octet-stream',
        },
        contentType: 'application/custom',
        description: 'Test upload',
      },
      { ...pair('message', 'hello'), contentType: 'text/plain' },
    ]),
  };
  const prepared = prepareRequest(api, environment);
  const form = await new Request(prepared.url, prepared.options).formData();
  const file = form.get('attachment') as File;
  expect(file.name).toBe('sample.bin');
  expect(prepared.options.body?.toString()).toContain('Content-Type: application/custom');
  expect(Buffer.from(await file.arrayBuffer())).toEqual(bytes);
  expect(form.get('message')).toBe('hello');
});
