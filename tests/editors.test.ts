import { expect, test } from 'bun:test';
import {
  completeVariable,
  variableToken,
  variableHighlights,
} from '../src/shared/variableCompletion';
import { emptyJsonValue, jsonType, replaceJsonValue } from '../src/shared/jsonTree';

test('variable completion detects the active token at the caret and preserves surrounding text', () => {
  expect(variableToken('https://{{ba', 12)?.query).toBe('ba');
  expect(variableToken('{{baseUrl}}', 11)).toBeUndefined();
  expect(completeVariable('{{ba}}/products', 4, 'baseUrl')).toBe('{{baseUrl}}/products');
  expect(completeVariable('{{baseUrl}}/products', 4, 'host')).toBe('{{host}}/products');
  expect(completeVariable('{"a":"{{ba","b":"x}}"}', 10, 'baseUrl')).toBe(
    '{"a":"{{baseUrl}}","b":"x}}"}',
  );
  expect(completeVariable('no token', 8, 'baseUrl')).toBe('no token');
});
test('orange highlighting identifies only available variables and preserves literal text', () => {
  const text = 'POST {{baseUrl}}/products/{{unknown}}';
  const parts = variableHighlights(text, ['baseUrl']);
  expect(parts.filter((p) => p.variable).map((p) => p.text)).toEqual(['{{baseUrl}}']);
  expect(parts.map((p) => p.text).join('')).toBe(text);
});
test('JSON tree edits nested values without mutating the source or converting primitive types', () => {
  const source = { items: [{ count: 1, name: '{{productId}}' }], enabled: false };
  const changed = replaceJsonValue(source, ['items', 0, 'count'], 4);
  expect(changed).toEqual({ items: [{ count: 4, name: '{{productId}}' }], enabled: false });
  expect(source.items[0].count).toBe(1);
  expect(replaceJsonValue(source, [], null)).toBeNull();
  for (const type of ['object', 'array', 'string', 'number', 'boolean', 'null'])
    expect(jsonType(emptyJsonValue(type))).toBe(type);
});
