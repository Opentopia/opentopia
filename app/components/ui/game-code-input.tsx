import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface GameCodeInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "onChange" | "maxLength" | "placeholder"
  > {
  onChange?: (value: string) => void;
  placeholder?: string;
}

function GameCodeInput({
  className,
  onChange,
  placeholder = "ABC123",
  ...props
}: GameCodeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    e.target.value = value;
    onChange?.(value);
  };

  return (
    <Input
      type="text"
      className={cn(
        "h-12 px-4 py-3 text-lg text-center font-display font-bold",
        className
      )}
      onChange={handleChange}
      maxLength={6}
      placeholder={placeholder}
      {...props}
    />
  );
}

export { GameCodeInput };
