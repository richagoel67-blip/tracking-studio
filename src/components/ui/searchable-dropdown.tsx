"use client";

import * as React from "react";
import { Check, ChevronDown, Image as ImageIcon } from "lucide-react";

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
  /**
   * When `showLogos` is set on the dropdown, optional brand image URL.
   * If omitted or the image fails to load, a generic placeholder is shown.
   */
  logoSrc?: string;
  /**
   * Used with `optionPresentation="flow"`: pill beside the title (e.g. "2 nodes").
   */
  countBadge?: string;
  /**
   * Used with `optionPresentation="flow"`: muted second line (e.g. "Career site 1 → Bullhorn").
   */
  subtitle?: string;
};

const SEARCHABLE_DROPDOWN_TRIGGER_BASE =
  "flex h-10 min-h-10 w-full items-center justify-between gap-2 whitespace-nowrap rounded-[4px] border border-[color:var(--figma-gray-border-02)] bg-white px-3 py-[10px] text-sm shadow-none " +
  "focus:outline-none focus:ring-2 focus:ring-[color:var(--figma-secondary-main)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

function OptionLogo({ label, src }: { label: string; src?: string }) {
  const [imgError, setImgError] = React.useState(false);
  const showImg = Boolean(src?.trim() && !imgError);

  if (showImg) {
    return (
      <img
        src={src}
        alt=""
        width={24}
        height={24}
        className="block size-6 shrink-0 self-center rounded object-contain"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="flex size-6 shrink-0 self-center items-center justify-center rounded border border-[color:var(--figma-gray-border-02)] bg-[color:var(--figma-gray-bg-01)]"
      aria-hidden
      title={label}
    >
      <ImageIcon className="size-3.5 text-[color:var(--figma-gray-icon-04)]" strokeWidth={1.75} />
    </div>
  );
}

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
  showLogos = false,
  optionPresentation = "default",
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
  /** When true, each row (and the closed trigger) shows a 24×24 logo or image placeholder. */
  showLogos?: boolean;
  /**
   * `"flow"`: two-line options with inline node-count pill and selected-row styling (Tracking studio test flow picker).
   */
  optionPresentation?: "default" | "flow";
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number | undefined>(undefined);
  const panelId = React.useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? (value ? String(value) : null);

  const optionKeywords = (opt: SearchableDropdownOption) => {
    const parts = [opt.label, ...(opt.tag ? [opt.tag] : []), ...(opt.keywords ?? [])];
    if (optionPresentation === "flow") {
      if (opt.countBadge) parts.push(opt.countBadge);
      if (opt.subtitle) parts.push(opt.subtitle);
    }
    return parts;
  };

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
            <span
              className={cn(
                "flex min-h-9 min-w-0 flex-1 items-center overflow-hidden",
                showLogos ? "gap-[8px]" : "gap-0",
              )}
            >
              {showLogos ? (
                <OptionLogo label={label ?? placeholder} src={selected?.logoSrc} />
              ) : null}
              {optionPresentation === "flow" && selected ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
                  <span className="min-w-0 truncate text-sm font-semibold leading-5 text-[color:var(--figma-gray-text-05)]">
                    {selected.label}
                  </span>
                  {selected.countBadge ? (
                    <span className="shrink-0 rounded bg-[color:var(--figma-gray-bg-05)] px-1 py-0.5 text-left text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">
                      {selected.countBadge}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="min-w-0 flex-1 truncate text-left leading-5">
                  {label ?? placeholder}
                </span>
              )}
            </span>
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
                {options.map((opt) => {
                  const isCurrent = value === opt.value;
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      keywords={optionKeywords(opt)}
                      onSelect={() => {
                        onValueChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "cursor-pointer rounded-md px-2 py-2",
                        isCurrent
                          ? "bg-[color:var(--figma-gray-bg-04)] data-[selected=true]:bg-[color:var(--figma-gray-bg-04)]"
                          : "data-[selected=true]:bg-[color:var(--figma-gray-bg-01)]",
                      )}
                    >
                      {optionPresentation === "flow" ? (
                        <span className="flex w-full min-w-0 items-start gap-2">
                          {showLogos ? <OptionLogo label={opt.label} src={opt.logoSrc} /> : null}
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "shrink-0 text-sm leading-5",
                                  isCurrent
                                    ? "font-semibold text-[color:var(--figma-primary-main)]"
                                    : "font-normal text-[color:var(--figma-gray-text-05)]",
                                )}
                              >
                                {opt.label}
                              </span>
                              {opt.countBadge ? (
                                <span className="shrink-0 rounded bg-[color:var(--figma-gray-bg-05)] px-1 py-0.5 text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]">
                                  {opt.countBadge}
                                </span>
                              ) : null}
                            </span>
                            {opt.subtitle ? (
                              <span className="mt-1 block text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-03)]">
                                {opt.subtitle}
                              </span>
                            ) : null}
                          </span>
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              isCurrent
                                ? "text-[color:var(--figma-secondary-main)] opacity-100"
                                : "opacity-0",
                            )}
                            aria-hidden
                          />
                        </span>
                      ) : (
                        <span className="flex w-full min-w-0 items-center gap-[8px]">
                          {showLogos ? <OptionLogo label={opt.label} src={opt.logoSrc} /> : null}
                          <span className="min-w-0 flex-1 truncate text-left text-sm leading-5 text-[color:var(--figma-gray-text-04)]">
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
                              isCurrent
                                ? "text-[color:var(--figma-secondary-main)] opacity-100"
                                : "opacity-0",
                            )}
                            aria-hidden
                          />
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
