import { cn } from "cn";

export interface SegmentedOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  id?: string;
  name: string;
  label: string;
  value: string;
  options: readonly SegmentedOption[];
  className?: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({
  id,
  name,
  label,
  value,
  options,
  className,
  onChange,
}: SegmentedControlProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-wrap gap-0.5 self-start rounded-lg bg-muted p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <label key={option.value} className="relative">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span className="flex h-7 cursor-pointer items-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-card peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
