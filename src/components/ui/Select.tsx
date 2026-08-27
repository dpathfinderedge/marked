import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, options, id, ...rest }, ref) {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="text-xs font-medium uppercase tracking-widest text-text-faint"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className="rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-line-strong"
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);