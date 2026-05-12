"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FieldInputProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id?: string;
  label?: React.ReactNode;
  /** Shown on the same row as the label, end-aligned (Figma input label row). */
  labelTrailing?: React.ReactNode;
  /** When true, appends a red asterisk after the label. */
  required?: boolean;
  /** Muted helper shown below the label and above the input. */
  description?: React.ReactNode;
  /** Muted helper shown below the input. */
  hint?: React.ReactNode;
  error?: React.ReactNode;
  warning?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
};

/**
 * Figma “InputField” (436:8022): 12px label, 4px gap, 40px field, 4px radius, figma border + placeholder tone.
 * Uses the shared {@link Input} primitive so focus, disabled, and file styles stay consistent app-wide.
 */
const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  (
    {
      label,
      labelTrailing,
      required,
      description,
      hint,
      error,
      warning,
      containerClassName,
      labelClassName,
      id: idProp,
      className,
      ...inputProps
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const { "aria-invalid": ariaInvalidProp, ...restInputProps } = inputProps;
    const ariaInvalid =
      Boolean(error) || (typeof ariaInvalidProp === "boolean" && ariaInvalidProp) || undefined;

    return (
      <div className={cn("flex w-full flex-col gap-1", containerClassName)}>
        {label != null ? (
          <div
            className={cn(
              "flex w-full min-w-0 items-center gap-x-3 gap-y-1",
              labelTrailing ? "justify-between" : "justify-start",
            )}
          >
            <Label
              htmlFor={id}
              className={cn(
                "mb-0 text-xs font-medium leading-[18px] text-[color:var(--figma-gray-text-04)]",
                labelClassName,
              )}
            >
              {label}
              {required ? (
                <span className="font-normal text-[color:var(--figma-error-main)]"> *</span>
              ) : null}
            </Label>
            {labelTrailing ? (
              <div className="flex min-w-0 shrink-0 items-center">{labelTrailing}</div>
            ) : null}
          </div>
        ) : null}
        {description ? (
          <p className="text-xs leading-relaxed text-[color:var(--figma-gray-text-03)]">
            {description}
          </p>
        ) : null}
        <Input
          ref={ref}
          id={id}
          {...restInputProps}
          className={className}
          aria-invalid={ariaInvalid}
        />
        {error ? (
          <p className="text-xs text-[color:var(--figma-error-main)]">{error}</p>
        ) : null}
        {warning ? (
          <p className="text-xs font-medium text-[color:var(--figma-warning-main)]">{warning}</p>
        ) : null}
        {hint ? <p className="text-xs text-[color:var(--figma-gray-text-03)]">{hint}</p> : null}
      </div>
    );
  },
);
FieldInput.displayName = "FieldInput";

export { FieldInput };
