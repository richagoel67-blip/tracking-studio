"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableDropdownOption = {
  value: string;
  label: string;
  /** Extra tokens for search matching (e.g. internal codes). */
  keywords?: string[];
  /** Optional tag at the end of the row (e.g. Pixel method hint). */
  tag?: string;
};

const SEARCHABLE_DROPDOWN_TRIGGER_BASE =
  "flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background " +
  "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

export function SearchableDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  disabled,
  id,
  triggerClassName,
  contentClassName,
  emptyMessage = "No results found.",
  searchPlaceholder = "Search",
}: {
  options: SearchableDropdownOption[];
  value: string | undefined;
  onValueChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number | undefined>(undefined);
  const panelId = React.useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? (value ? String(value) : null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      queueMicrotask(() => {
        const w = wrapRef.current?.offsetWidth;
        if (w) setPanelWidth(w);
      });
    }
  };

  return (
    <div ref={wrapRef} className="w-full">
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="listbox"
            disabled={disabled}
            id={id}
            className={cn(
              SEARCHABLE_DROPDOWN_TRIGGER_BASE,
              triggerClassName,
              !label && "text-muted-foreground",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">{label ?? placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={panelId}
          align="start"
          sideOffset={4}
          style={panelWidth ? { width: panelWidth } : undefined}
          className={cn(
            "z-50 max-w-[calc(100vw-2rem)] p-0",
            "rounded-lg border border-[color:var(--figma-gray-border-02)] bg-white text-popover-foreground shadow-[0_1px_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.1)]",
            contentClassName,
          )}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-[280px]">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup className="p-1">
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    keywords={[opt.label, ...(opt.keywords ?? [])]}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer rounded-md px-2 py-2 data-[selected=true]:bg-[color:var(--figma-gray-bg-01)]"
                  >
                    <span className="flex w-full min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-left text-sm text-[color:var(--figma-gray-text-04)]">
                        {opt.label}
                      </span>
                      {opt.tag ? (
                        <span className="shrink-0 rounded-md border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--figma-gray-text-03)]">
                          {opt.tag}
                        </span>
                      ) : null}
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === opt.value
                            ? "text-[color:var(--figma-secondary-main)] opacity-100"
                            : "opacity-0",
                        )}
                        aria-hidden
                      />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
