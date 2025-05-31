import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const formFieldVariants = cva("flex flex-col gap-2 w-full", {
  variants: {
    align: {
      left: "items-start text-left",
      center: "items-center text-center",
      right: "items-end text-right",
    },
  },
  defaultVariants: {
    align: "center",
  },
});

interface FormFieldProps extends VariantProps<typeof formFieldVariants> {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({
  label,
  htmlFor,
  align,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn(formFieldVariants({ align }), className)}>
      <label className="font-medium text-foreground/60" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export { FormField };
