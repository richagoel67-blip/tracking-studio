import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Tracking studio toggle (Figma 438:8114 / SelectionControlsTogglePlain):
 * 34×20 outer hit area, track inset 15% vertical (~14px) with 7px radius,
 * primary-lighter track when on, plain gray (#D2D6DC) when off,
 * 18px thumb overlapping the track, primary fill + elevation when checked.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group relative inline-flex h-5 w-[34px] shrink-0 cursor-pointer items-center overflow-visible rounded-full border-0 bg-transparent p-0 shadow-none outline-none",
      "focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-0 right-0 top-[15%] bottom-[15%] z-0 rounded-[7px] transition-[background-color] duration-200 ease-out",
        "bg-[#d2d6dc]",
        "group-data-[state=checked]:bg-[color:var(--figma-primary-lighter)]",
      )}
    />
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none relative z-[1] block size-[18px] shrink-0 rounded-full transition-[transform,box-shadow,background-color] duration-200 ease-out will-change-transform",
        "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_15px_-3px_rgba(0,0,0,0.1)]",
        "data-[state=unchecked]:translate-x-[2px]",
        "data-[state=unchecked]:bg-white data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-[color:var(--figma-gray-border-02)]",
        "data-[state=checked]:translate-x-[14px] data-[state=checked]:bg-[color:var(--figma-primary-main)] data-[state=checked]:ring-0",
        "data-[state=checked]:shadow-[0_4px_14px_rgba(48,63,159,0.32),0_2px_6px_rgba(0,0,0,0.08)]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
