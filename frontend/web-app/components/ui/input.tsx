import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "focus-ring flex h-10 w-full rounded-md border border-input bg-white/[0.86] px-3 py-2 text-body-sm text-foreground shadow-polis-xs transition-all duration-200 file:border-0 file:bg-transparent file:text-body-sm file:font-medium placeholder:text-muted-foreground hover:border-primary/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-city-coral aria-[invalid=true]:ring-city-coral/25",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
