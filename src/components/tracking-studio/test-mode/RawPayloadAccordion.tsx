import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RawPayloadAccordion({
  expanded,
  onToggle,
  payload,
  disabled,
}: {
  expanded: boolean;
  onToggle: () => void;
  payload: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 gap-1 px-2 text-xs font-medium text-[color:var(--figma-gray-text-04)] hover:text-[color:var(--figma-gray-text-05)]"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        Raw
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        )}
      </Button>
      {expanded ? (
        <pre className="max-h-40 w-full max-w-full overflow-auto rounded-md border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-03)] p-2 text-left font-mono text-[10px] leading-relaxed text-[color:var(--figma-gray-text-05)]">
          {payload}
        </pre>
      ) : null}
    </div>
  );
}
