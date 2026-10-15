export function variableToken(value: string, caret: number) {
  const match = /\{\{([^{}\r\n]*)$/.exec(value.slice(0, caret));
  return match ? { start: match.index, caret, query: match[1].trim() } : undefined;
}

export function variableHighlights(value: string, names: string[]) {
  const available = new Set(names);
  const parts: { text: string; variable: boolean }[] = [];
  let previous = 0;
  for (const match of value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    if (match.index > previous)
      parts.push({ text: value.slice(previous, match.index), variable: false });
    parts.push({ text: match[0], variable: available.has(match[1].trim()) });
    previous = match.index + match[0].length;
  }
  if (previous < value.length) parts.push({ text: value.slice(previous), variable: false });
  return parts;
}

export function completeVariable(value: string, caret: number, key: string) {
  const token = variableToken(value, caret);
  if (!token) return value;
  const closing = value.indexOf('}}', caret);
  const end =
    closing >= 0 && !/[{}"'\r\n,:\[\]]/.test(value.slice(caret, closing))
      ? closing + 2
      : caret + (value[caret] === '}' ? 1 : 0);
  return `${value.slice(0, token.start)}{{${key}}}${value.slice(end)}`;
}
