import { Info } from "lucide-react";
import { useState } from "react";

interface GroupHeadingProps {
  id: string;
  label: string;
  description: string | null;
}

export function GroupHeading({ id, label, description }: GroupHeadingProps) {
  const [help, setHelp] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <h3 id={id} className="text-sm font-semibold">
          {label}
        </h3>
        {description ? (
          <button
            type="button"
            aria-label={`About ${label.toLowerCase()}`}
            aria-expanded={help}
            aria-controls={`${id}-help`}
            onClick={() => setHelp((current) => !current)}
            className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:text-interactive"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      {help && description ? (
        <p
          id={`${id}-help`}
          className="text-sm text-muted-foreground text-pretty"
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
