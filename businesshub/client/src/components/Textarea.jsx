import { useId } from 'react';

export default function Textarea({ label, error, className = '', id: idProp, ...props }) {
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`input resize-none ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
