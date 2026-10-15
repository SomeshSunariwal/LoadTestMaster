export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonPath = (string | number)[];
export function replaceJsonValue(value: JsonValue, path: JsonPath, next: JsonValue): JsonValue {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (Array.isArray(value))
    return value.map((item, i) => (i === key ? replaceJsonValue(item, rest, next) : item));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        name === key ? replaceJsonValue(item, rest, next) : item,
      ]),
    );
  return value;
}
export function jsonType(value: JsonValue) {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}
export function emptyJsonValue(type: string): JsonValue {
  const values: Record<string, JsonValue> = {
    object: {},
    array: [],
    number: 0,
    boolean: false,
    null: null,
    string: '',
  };
  return Object.hasOwn(values, type) ? values[type] : '';
}
