import { forwardRef, useId } from "react";

// The label is tied to the field with htmlFor/id, and an error is announced
// with the field (aria-invalid + aria-describedby). A caller-supplied id wins.
const Input = forwardRef(function Input(
  { label, error, className = "", id: idProp, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`input ${error ? "border-red-400 focus:ring-red-400" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
