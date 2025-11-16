"use client";
import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A reusable form dialog component that handles common dialog patterns
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The form content
 * @param {string} props.title - The dialog title
 * @param {React.ReactNode} props.trigger - The trigger element
 * @param {Function} props.onSubmit - Form submission handler function
 * @param {boolean} props.defaultOpen - Whether the dialog is open by default
 * @param {Function} props.onOpenChange - Optional callback when open state changes
 * @param {string} props.submitText - Text for the submit button (defaults to "Save")
 * @param {string} props.cancelText - Text for the cancel button (defaults to "Cancel")
 * @param {string} props.size - Dialog size (sm, md, lg, xl)
 */
export function FormDialog({
  children,
  title,
  trigger,
  onSubmit,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  submitText = "Save",
  cancelText = "Cancel",
  size = "md",
  description,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const formRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await onSubmit(e)) {
      handleOpenChange(false);
    }
  };

  // Map size to width class
  const sizeClasses = {
    sm: "sm:max-w-[425px]",
    md: "sm:max-w-[550px]",
    lg: "sm:max-w-[650px]",
    xl: "sm:max-w-[850px]",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(sizeClasses[size] || sizeClasses.md)}
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
      >
        <DialogTitle id="dialog-title">{title}</DialogTitle>
        {description && (
          <DialogDescription id="dialog-description">
            {description}
          </DialogDescription>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" ref={formRef}>
          <div className="max-h-[60vh] overflow-y-auto pr-4">{children}</div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {cancelText}
            </Button>
            <Button type="submit">{submitText}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
