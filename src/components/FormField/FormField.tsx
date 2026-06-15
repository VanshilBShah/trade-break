import { useId } from 'react';
import type { ReactNode } from 'react';
import styles from './FormField.module.css';

interface BaseProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

interface SelectFieldProps extends BaseProps {
  as: 'select';
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

interface TextAreaFieldProps extends BaseProps {
  as: 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type FormFieldProps = SelectFieldProps | TextAreaFieldProps;

export function FormField(props: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [props.error ? errorId : null, props.hint ? hintId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  let control: ReactNode;
  if (props.as === 'select') {
    control = (
      <select
        id={id}
        className={`${styles.control} ${props.error ? styles.controlError : ''}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy}
        aria-required={props.required}
      >
        <option value="">{props.placeholder ?? 'Select…'}</option>
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <textarea
        id={id}
        className={`${styles.control} ${props.error ? styles.controlError : ''}`}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy}
        aria-required={props.required}
      />
    );
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {props.label}
        {props.required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {props.hint && !props.error && (
        <span id={hintId} className={styles.hint}>
          {props.hint}
        </span>
      )}
      {props.error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {props.error}
        </span>
      )}
    </div>
  );
}
