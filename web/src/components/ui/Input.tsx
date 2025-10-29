import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { INPUT_BASE, INPUT_ERROR } from "../../lib/classNames";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(error ? INPUT_ERROR : INPUT_BASE, className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(error ? INPUT_ERROR : INPUT_BASE, className)}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

