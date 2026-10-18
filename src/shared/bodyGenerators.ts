import { bodyGeneratorsSchema, type BodyGenerator } from './schema';

export type GeneratorBodyFormat = 'json' | 'xml' | 'graphql';
export function supportsBodyGenerators(type: string): type is GeneratorBodyFormat {
  return type === 'json' || type === 'xml' || type === 'graphql';
}

/** Format template JSON without resolving variables or changing their types. */
export function formatJsonTemplate(template: string) {
  const prefix = `__loadmaster_${crypto.randomUUID()}_`;
  const tokens: { marker: string; source: string }[] = [];
  let quoted = false, escaped = false, masked = '';
  for (let index = 0; index < template.length;) {
    const token = !quoted && template[index] === '{' && template[index + 1] === '{'
      ? template.slice(index).match(/^\{\{\s*([^{}]+?)\s*\}\}/) : null;
    if (token) {
      const marker = `${prefix}${tokens.length}__`;
      tokens.push({ marker, source: token[0] });
      masked += JSON.stringify(marker);
      index += token[0].length;
      continue;
    }
    const char = template[index++]!;
    masked += char;
    if (escaped) escaped = false;
    else if (char === '\\' && quoted) escaped = true;
    else if (char === '"') quoted = !quoted;
  }
  let formatted = JSON.stringify(JSON.parse(masked), null, 2);
  for (const { marker, source } of tokens)
    formatted = formatted.replace(JSON.stringify(marker), () => source);
  return formatted;
}

export function generatorValues(generators: BodyGenerator[], index: number) {
  return new Map(generators.map((g) => {
    const value = g.type === 'uuid' ? crypto.randomUUID()
      : g.type === 'list' ? g.values[index % g.values.length]!
      : g.start + index * g.step;
    if (typeof value === 'number' && !Number.isSafeInteger(value))
      throw new Error(`Generator ${g.key} exceeded the safe integer range.`);
    return [g.key, value] as const;
  }));
}

// Insert JSON-escaped strings within quotes and typed values outside quotes.
// Environment substitutions are resolved before inserting generated values so
// a generated string containing {{...}} is always treated as literal data.
export function renderGeneratedBody(
  template: string, generators: BodyGenerator[], index = 0,
  resolveEnvironment: (token: string) => string = () => '0',
  format: GeneratorBodyFormat = 'json',
) {
  const values = generatorValues(bodyGeneratorsSchema.parse(generators), index);
  const lookup = (key: string) => {
    const name = key.slice(4);
    if (!values.has(name)) throw new Error(`Missing body generator: ${name}`);
    return values.get(name)!;
  };
  if (format === 'xml') {
    let cdata = false, result = '';
    for (let i = 0; i < template.length;) {
      if (template.startsWith('<![CDATA[', i)) { cdata = true; result += '<![CDATA['; i += 9; continue; }
      if (template.startsWith(']]>', i)) { cdata = false; result += ']]>'; i += 3; continue; }
      const token = template[i] === '{' && template[i + 1] === '{'
        ? template.slice(i).match(/^\{\{\s*([^{}]+?)\s*\}\}/) : null;
      if (!token) { result += template[i++]; continue; }
      const key = token[1]!.trim();
      if (!key.startsWith('gen.')) result += resolveEnvironment(token[0]);
      else {
        const value = String(lookup(key));
        result += cdata ? value.replaceAll(']]>', ']]]]><![CDATA[>')
          : value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
      }
      i += token[0].length;
    }
    return result;
  }
  let quoted = false, escaped = false, block = false, comment = false, result = '';
  for (let i = 0; i < template.length;) {
    if (format === 'graphql') {
      if (block && template.startsWith('\\"""', i)) { result += template.slice(i, i + 4); i += 4; continue; }
      if (!quoted && !comment && template.startsWith('"""', i)) {
        block = !block; result += '"""'; i += 3; continue;
      }
    }
    const token = template[i] === '{' && template[i + 1] === '{'
      ? template.slice(i).match(/^\{\{\s*([^{}]+?)\s*\}\}/) : null;
    if (token) {
      const key = token[1]!.trim();
      if (key.startsWith('gen.')) {
        const value = lookup(key);
        result += block ? String(value).replaceAll('"""', '\\"""')
          : quoted ? JSON.stringify(String(value)).slice(1, -1) : JSON.stringify(value);
      } else result += resolveEnvironment(token[0]);
      i += token[0].length;
      continue;
    }
    const char = template[i++]!;
    result += char;
    if (format === 'graphql') {
      if (!quoted && !block && char === '#') comment = true;
      if (char === '\n' || char === '\r') comment = false;
      if (block || comment) continue;
    }
    if (escaped) escaped = false;
    else if (char === '\\' && quoted) escaped = true;
    else if (char === '"') quoted = !quoted;
  }
  if (format === 'json') JSON.parse(result);
  return result;
}

/** Preview samples are independent of run counters; navigating back retains UUIDs. */
export function createBodyPreview(template: string, generators: BodyGenerator[], resolveEnvironment: (token: string) => string, format: GeneratorBodyFormat = 'json') {
  const samples = new Map<number, string>();
  return (index: number) => {
    if (!Number.isSafeInteger(index) || index < 0) throw new Error('Invalid preview request number.');
    if (!samples.has(index)) {
      const body = renderGeneratedBody(template, generators, index, resolveEnvironment, format);
      samples.set(index, format === 'json' ? JSON.stringify(JSON.parse(body), null, 2) : body);
    }
    return samples.get(index)!;
  };
}
