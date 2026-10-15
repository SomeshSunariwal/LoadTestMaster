import './VariableInput.css';
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SyntheticEvent,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useApp } from '../hooks/useApp';
import { completeVariable, variableToken, variableHighlights } from '../shared/variableCompletion';

type Common = { value: string; onValueChange: (value: string) => void; environmentId?: string };
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & Common;
type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> &
  Common;

function VariableField({
  multiline,
  ...props
}: (InputProps | TextareaProps) & { multiline?: boolean }) {
  const app = useApp();
  const { value, onValueChange, environmentId, ...native } = props;
  const workspace = app.state?.workspace;
  const collection =
    workspace?.collections.find((c) => c.id === app.collectionId) ?? workspace?.collections[0];
  const environment = workspace?.environments.find(
    (e) => e.id === (environmentId ?? collection?.environmentId),
  );
  const [caret, setCaret] = useState(value.length);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const token = variableToken(value, caret);
  const names = [
    ...new Set(environment?.variables.filter((v) => v.enabled && v.key).map((v) => v.key) ?? []),
  ];
  const highlighted = variableHighlights(value, names);
  const hasVariables = highlighted.some((part) => part.variable);
  const masked = !multiline && (native as InputProps).type === 'password';
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const matches = names.filter((name) =>
    name.toLowerCase().includes(token?.query.toLowerCase() ?? ''),
  );
  const open = focused && !native.readOnly && !dismissed && !!token;
  const choose = (name: string) => {
    onValueChange(completeVariable(value, caret, name));
    setDismissed(true);
  };
  const track = (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCaret(event.currentTarget.selectionStart ?? value.length);
  };
  const events = {
    value,
    autoComplete: 'off',
    'aria-autocomplete': 'list' as const,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    'aria-activedescendant':
      open && matches.length ? `${id}-${Math.min(active, matches.length - 1)}` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onValueChange(event.target.value);
      setCaret(event.target.selectionStart ?? event.target.value.length);
      setActive(0);
      setDismissed(false);
    },
    onFocus: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(true);
      setDismissed(false);
      (native.onFocus as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>)?.(event);
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(false);
      (native.onBlur as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>)?.(event);
    },
    onSelect: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      track(event);
      (native.onSelect as React.ReactEventHandler<HTMLInputElement | HTMLTextAreaElement>)?.(event);
    },
    onScroll: (event: React.UIEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft });
      (native.onScroll as React.UIEventHandler<HTMLInputElement | HTMLTextAreaElement>)?.(event);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!open) {
        (native.onKeyDown as React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>)?.(
          event,
        );
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(true);
      } else if (matches.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        setActive(
          (i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length,
        );
      } else if (matches.length && ['Enter', 'Tab'].includes(event.key)) {
        event.preventDefault();
        choose(matches[Math.min(active, matches.length - 1)]);
      }
    },
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <Popover.Anchor asChild>
        <span
          data-wrap={multiline ? ((native as TextareaProps).wrap ?? 'soft') : undefined}
          className={`variable-field ${multiline ? 'variable-field-multiline' : ''} ${native.className?.split(' ').includes('code-editor') ? 'variable-field-code' : ''} ${hasVariables ? (masked ? 'variable-field-secret' : 'variable-field-highlighted') : ''}`}
        >
          {multiline ? (
            <textarea {...(native as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...events} />
          ) : (
            <input {...(native as InputHTMLAttributes<HTMLInputElement>)} {...events} />
          )}
          {hasVariables && !masked && (
            <span className="variable-highlight" aria-hidden="true">
              <span
                className="variable-highlight-text"
                style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}
              >
                {highlighted.map((part, index) => (
                  <span key={index} className={part.variable ? 'environment-token' : undefined}>
                    {part.text}
                  </span>
                ))}
              </span>
            </span>
          )}
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          aria-label="Environment variable suggestions"
          className="variable-suggestions"
          data-theme={workspace?.theme ?? 'dark'}
          align="start"
          sideOffset={4}
          collisionPadding={10}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setDismissed(true);
          }}
        >
          <div className="variable-suggestions-heading">
            {environment?.name ?? 'No environment selected'}
          </div>
          <div
            role="listbox"
            id={id}
            aria-label="Environment variables"
            className="variable-options"
          >
            {matches.map((name, i) => (
              <div
                key={name}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === Math.min(active, matches.length - 1)}
                onPointerDown={(e) => e.preventDefault()}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(name)}
                className="variable-option"
              >
                <span>{`{{${name}}}`}</span>
              </div>
            ))}
            {!matches.length && (
              <p className="variable-no-match">
                {names.length ? 'No matching variables' : 'Add enabled variables in Environments'}
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function VariableInput(props: InputProps) {
  return <VariableField {...props} />;
}
export function VariableTextarea(props: TextareaProps) {
  return <VariableField {...props} multiline />;
}
