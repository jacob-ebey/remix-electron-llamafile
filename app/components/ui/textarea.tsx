import * as React from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  disableOnFormSubmission?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, disabled: _disabled, disableOnFormSubmission, ...props },
    ref
  ) => {
    const formStatus = useFormStatus();
    const disabled =
      _disabled || (disableOnFormSubmission && formStatus?.pending);

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
