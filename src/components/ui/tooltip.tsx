"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipArrow = TooltipPrimitive.Arrow;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  /** Optional heading row with info icon (Tracking Studio / Figma tooltip pattern). */
  title?: React.ReactNode;
  /** When false, the popover pointer is omitted (e.g. very tight layouts). @default true */
  showArrow?: boolean;
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    {
      className,
      sideOffset = 8,
      title,
      showArrow = true,
      children,
      collisionPadding = 12,
      ...props
    },
    ref,
  ) => {
    const hasTitle = title != null && title !== "";

    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "z-50 max-w-[min(262px,calc(100vw-24px))] overflow-visible rounded-[4px] border-0 p-3 text-left",
            "bg-[color:var(--figma-code-panel-bg)] text-[color:var(--figma-gray-text-01)]",
            "shadow-[0px_20px_25px_rgba(0,0,0,0.1),0px_10px_10px_rgba(0,0,0,0.04),0px_4px_4px_rgba(0,0,0,0.11),0px_-1px_1px_rgba(0,0,0,0.09)]",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
            className,
          )}
          {...props}
        >
          {hasTitle ? (
            <>
              <div className="flex w-full items-start gap-1">
                <Info
                  className="mt-px size-4 shrink-0 text-[color:var(--figma-gray-bg-03)]"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="min-w-0 text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-01)]">
                  {title}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-normal leading-[14px] text-[color:var(--figma-gray-text-01)]">
                {children}
              </div>
            </>
          ) : (
            <div className="text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-01)]">
              {children}
            </div>
          )}
          {showArrow ? (
            <TooltipArrow
              className="fill-[color:var(--figma-code-panel-bg)] drop-shadow-[0px_2px_2px_rgba(0,0,0,0.12)]"
              width={12}
              height={6}
            />
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow };
