import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-button rounded-md font-display font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 aria-invalid:border-destructive border-2 border-black",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        tertiary:
          "bg-tertiary text-tertiary-foreground hover:bg-tertiary-hover",
        ghost:
          "bg-transparent text-foreground/80 hover:bg-accent/50 shadow-none",
        link: "bg-transparent text-primary underline-offset-4 hover:underline shadow-none border-none",
      },
      size: {
        sm: "h-10 rounded-md gap-1.5 text-lg px-3 text-xs has-[>svg]:px-2.5",
        default: "h-14 px-4 py-3 text-xl has-[>svg]:px-3",
        lg: "h-16 rounded-md px-6 text-2xl text-base has-[>svg]:px-4",
        icon: "size-9 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
