"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A reusable form field component that handles validation and error display
 *
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.type - Input type (text, number, date, email, select)
 * @param {string} props.name - Field name
 * @param {any} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.helpText - Help text to display below the field
 * @param {Object} props.options - Options for select fields
 * @param {any} props.min - Min value for number inputs
 * @param {any} props.max - Max value for number inputs
 * @param {any} props.step - Step value for number inputs
 * @param {Object} props.rest - Additional props to pass to the input
 */
export function FormField({
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  options = [],
  min,
  max,
  step,
  ...rest
}) {
  // Handle different input types
  const renderInput = () => {
    if (type === "select") {
      return (
        <Select
          value={value}
          onValueChange={(value) => {
            onChange({ target: { name, value } });
          }}
        >
          <SelectTrigger className={error ? "border-red-500" : ""}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Default to regular input
    return (
      <Input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={error ? "border-red-500" : ""}
        {...rest}
      />
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!error && helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
