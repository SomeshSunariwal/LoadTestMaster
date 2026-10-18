import './css/ui.css';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Children, isValidElement, useId, useRef, useState } from 'react';
import { FiCheck, FiX, FiInfo, FiChevronDown } from 'react-icons/fi';
import { GoQuestion } from 'react-icons/go';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useApp } from '../hooks/useApp';
export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label-row">
        <span>{label.endsWith('*') ? <>{label.replace(/\s*\*$/, '')} <span className="required-marker" aria-hidden="true">*</span></> : label}</span>
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({
  children,
  value,
  onValueChange,
  className = '',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> & {
  value: string | number;
  onValueChange: (value: string) => void;
}) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const search = useRef({ text: '', at: 0 });
  const options = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ value?: string | number; children: ReactNode; disabled?: boolean }>(child)
    )
      return [];
    const label = Children.toArray(child.props.children).join('');
    return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled }];
  });
  const selected = options.findIndex((option) => option.value === String(value));
  const firstEnabled = Math.max(
    0,
    options.findIndex((option) => !option.disabled),
  );
  const focus = (index: number) => {
    setActive(index);
    buttons.current[index]?.focus();
  };
  return (
    <span className="select-control">
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next)
            setActive(selected >= 0 && !options[selected]?.disabled ? selected : firstEnabled);
          setOpen(next);
        }}
      >
        <Popover.Trigger asChild>
          <button
            {...props}
            type="button"
            className={`select-trigger ${className}`}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onKeyDown={(event) => {
              props.onKeyDown?.(event);
              if (
                !event.defaultPrevented &&
                (event.key === 'ArrowDown' || event.key === 'ArrowUp')
              ) {
                event.preventDefault();
                setActive(selected >= 0 && !options[selected]?.disabled ? selected : firstEnabled);
                setOpen(true);
              }
            }}
          >
            <span>{options[selected]?.label ?? options[0]?.label ?? 'Select'}</span>
            <FiChevronDown aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
            <Popover.Content
              className="select-menu"
              align="start"
              sideOffset={5}
              collisionPadding={10}
              id={listId}
              role="listbox"
              aria-label={props['aria-label'] ?? 'Options'}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                buttons.current[active]?.focus();
              }}
              onKeyDown={(event) => {
                const enabled = options
                  .map((option, index) => (option.disabled ? -1 : index))
                  .filter((index) => index >= 0);
                if (!enabled.length) return;
                const position = enabled.indexOf(active);
                if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  focus(
                    event.key === 'Home'
                      ? enabled[0]!
                      : event.key === 'End'
                        ? enabled.at(-1)!
                        : enabled[
                            (position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) %
                              enabled.length
                          ]!,
                  );
                } else if (event.key === 'Tab') setOpen(false);
                else if (
                  event.key.length === 1 &&
                  event.key !== ' ' &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  event.preventDefault();
                  const now = Date.now();
                  search.current = {
                    text:
                      now - search.current.at < 700
                        ? search.current.text + event.key.toLowerCase()
                        : event.key.toLowerCase(),
                    at: now,
                  };
                  const match = enabled.find((index) =>
                    options[index]!.label.toLowerCase().startsWith(search.current.text),
                  );
                  if (match !== undefined) focus(match);
                }
              }}
            >
              {options.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === selected}
                  data-active={index === active}
                  disabled={option.disabled}
                  ref={(element) => {
                    buttons.current[index] = element;
                  }}
                  tabIndex={index === active ? 0 : -1}
                  onFocus={() => setActive(index)}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {index === selected && <FiCheck aria-hidden="true" />}
                </button>
              ))}
            </Popover.Content>
          </div>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

function Tooltip({ text }: { text: string }) {
  const { state } = useApp();
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <Popover.Anchor asChild>
        <span
          className="field-tooltip-trigger"
          tabIndex={0}
          role="img"
          aria-label={text}
          aria-describedby={open ? id : undefined}
          onMouseEnter={() => {
            setHovered(true);
            setDismissed(false);
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
          onBlur={() => setFocused(false)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (open && event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setDismissed(true);
            }
          }}
        >
          <GoQuestion aria-hidden="true" />
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
          <Popover.Content
            id={id}
            className="field-tooltip"
            role="tooltip"
            aria-describedby={undefined}
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            hideWhenDetached
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {text}
          </Popover.Content>
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  hint,
  tooltip,
  min = 0,
  max = 1000000,
  step = 1,
  invalid = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
}) {
  return (
    <Field label={label} hint={hint} tooltip={tooltip}>
      <input
        type="number"
        aria-invalid={invalid}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const parsed = e.currentTarget.valueAsNumber;
          // Leave intermediate input such as the minus sign alone so users can
          // type negative values without rerendering away the in-progress edit.
          if (!Number.isFinite(parsed)) return;
          onChange(parsed);
        }}
      />
    </Field>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip?: string;
}) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`toggle ${checked ? 'on' : ''}`}>
        <span />
      </span>
      <span>{label}</span>
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}
export function Check(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} />;
}
export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Method({ method }: { method: string }) {
  return <span className={`method method-${method.toLowerCase()}`}>{method}</span>;
}
export function Empty({
  icon,
  heading,
  children,
  action,
}: {
  icon: ReactNode;
  heading: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{heading}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const { state } = useApp();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
          <Dialog.Overlay className="modal-backdrop" />
          <Dialog.Content className={`modal ${wide ? 'wide' : ''} ${className}`}>
            <div className="modal-heading">
              <div>
                <Dialog.Title asChild>
                  <h2>{title}</h2>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p className={subtitle ? undefined : 'sr-only'}>{subtitle || title}</p>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close dialog">
                  <FiX />
                </button>
              </Dialog.Close>
            </div>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="inline-alert">
      <FiInfo />
      {children}
    </div>
  );
}
export function Toast({
  message,
  error,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      key={message}
      role={error ? 'alert' : 'status'}
      className={`toast ${error ? 'error' : ''}`}
    >
      {error ? <FiInfo /> : <FiCheck />}
      <span>{message}</span>
      <IconButton label="Dismiss notification" onClick={onClose}>
        <FiX />
      </IconButton>
    </div>
  );
}
