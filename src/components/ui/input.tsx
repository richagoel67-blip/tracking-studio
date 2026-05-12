import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 min-h-10 w-full rounded-[4px] border border-[color:var(--figma-gray-border-02)] bg-white px-3 py-[10px] text-sm font-normal leading-5 text-[color:var(--figma-gray-text-05)] shadow-none transition-colors",
          "placeholder:text-[color:var(--figma-gray-text-01)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--figma-secondary-main)] focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-[color:var(--figma-error-main)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
