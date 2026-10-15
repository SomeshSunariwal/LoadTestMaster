import './css/JsonCodeEditor.css';
import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { useApp } from '../hooks/useApp';

export function JsonCodeEditor({
  value,
  onChange,
  wrap,
}: {
  value: string;
  onChange: (value: string) => void;
  wrap: boolean;
}) {
  const app = useApp();
  const workspace = app.state?.workspace;
  const collection =
    workspace?.collections.find((c) => c.id === app.collectionId) ?? workspace?.collections[0];
  const environment = workspace?.environments.find((e) => e.id === collection?.environmentId);
  const namesKey = JSON.stringify([
    ...new Set(environment?.variables.filter((v) => v.enabled && v.key).map((v) => v.key) ?? []),
  ]);
  const [validation, setValidation] = useState('');
  const extensions = useMemo(() => {
    const names: string[] = JSON.parse(namesKey);
    const matcher = new MatchDecorator({
      regexp: /\{\{\s*([^{}]+?)\s*\}\}/g,
      decoration: (match) =>
        names.includes(match[1]!.trim())
          ? Decoration.mark({ class: 'json-environment-token' })
          : null,
    });
    const variables = ViewPlugin.fromClass(
      class {
        decorations;
        constructor(view: EditorView) {
          this.decorations = matcher.createDeco(view);
        }
        update(update: ViewUpdate) {
          this.decorations = matcher.updateDeco(update, this.decorations);
        }
      },
      { decorations: (plugin) => plugin.decorations },
    );
    const complete = (context: CompletionContext) => {
      const token = context.matchBefore(/\{\{[^{}\n]*/);
      if (!token) return null;
      return {
        from: token.from + 2,
        to:
          context.state.sliceDoc(context.pos, context.pos + 2) === '}}'
            ? context.pos + 2
            : context.pos,
        options: names.map((name) => ({
          label: name,
          displayLabel: `{{${name}}}`,
          apply: `${name}}}`,
          type: 'variable',
        })),
        validFor: /^[^{}\n]*$/,
      };
    };
    const validate = jsonParseLinter();
    return [
      json(),
      linter(
        (view) => {
          const diagnostics = view.state.doc.toString().trim() ? validate(view) : [];
          const first = diagnostics[0];
          setValidation(
            first ? `Line ${view.state.doc.lineAt(first.from).number}: ${first.message}` : '',
          );
          return diagnostics.map((diagnostic) => {
            const line = view.state.doc.lineAt(diagnostic.from);
            return { ...diagnostic, from: line.from, to: line.to };
          });
        },
        { delay: 150 },
      ),
      lintGutter(),
      variables,
      autocompletion({ override: [complete] }),
      EditorView.contentAttributes.of({ 'aria-label': 'Request body', 'aria-multiline': 'true' }),
      ...(wrap ? [EditorView.lineWrapping] : []),
    ];
  }, [namesKey, wrap]);
  return (
    <div className="json-code-editor">
      <CodeMirror
        placeholder={'{\n  "productId": "{{productId}}",\n  "quantity": 1\n}'}
        value={value}
        onChange={onChange}
        height="100%"
        theme={workspace?.theme ?? 'dark'}
        extensions={extensions}
        basicSetup={{
          closeBrackets: true,
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
        }}
      />
      {validation && (
        <div className="json-validation-message" role="status" title={validation}>
          {validation}
        </div>
      )}
    </div>
  );
}
