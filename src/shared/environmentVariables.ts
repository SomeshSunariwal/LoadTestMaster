import type { Environment } from './schema';

export function variableResolver(environment: Environment) {
  const values = Object.fromEntries(environment.variables.filter((v) => v.enabled && v.key).map((v) => [v.key, v.value]));
  const resolve = (input: string, stack: string[] = []): string =>
    input.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => {
      if (key.startsWith('gen.')) throw new Error('Generators are available only in the JSON, XML, or GraphQL request body.');
      if (!Object.hasOwn(values, key)) throw new Error(`Missing environment variable: ${key}`);
      if (stack.includes(key) || stack.length > 20) throw new Error(`Circular environment variable: ${key}`);
      return resolve(values[key]!, [...stack, key]);
    });
  return resolve;
}
