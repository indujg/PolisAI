import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 max-w-full shrink-0 select-none items-center justify-center gap-2 rounded-md px-4 text-center text-body-sm font-semibold transition-all duration-200 active:translate-y-0 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-polis-sm hover:-translate-y-0.5 hover:bg-city-civic hover:shadow-polis-md",
        signal:
          "bg-city-signal text-white shadow-polis-sm hover:-translate-y-0.5 hover:bg-[#2458D7] hover:shadow-polis-md",
        premium:
          "border border-white/75 bg-glass-sheen text-foreground shadow-glass backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white/[0.92]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-polis-sm hover:-translate-y-0.5 hover:bg-city-signal",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline:
          "border border-border bg-white/[0.82] text-foreground shadow-polis-xs hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:shadow-polis-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-polis-sm hover:-translate-y-0.5 hover:bg-city-coral",
        icon:
          "border border-border/80 bg-white/[0.82] px-0 text-muted-foreground shadow-polis-xs hover:bg-white hover:text-foreground hover:shadow-polis-sm"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-caption",
        lg: "h-11 px-5 text-body",
        icon: "size-10 px-0",
        "icon-sm": "size-8 px-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
