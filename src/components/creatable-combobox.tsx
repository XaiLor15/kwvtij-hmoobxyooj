// Lightweight creatable combobox built on HTML <datalist>.
// Users can pick from preset options OR type a custom value.
import { useId } from "react";

interface CreatableComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
  disabled,
}: CreatableComboboxProps) {
  const auto = useId();
  const listId = `cc-${(id ?? auto).replace(/[:]/g, "_")}`;
  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );
}
