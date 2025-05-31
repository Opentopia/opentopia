import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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
    <div className="w-full flex">
      <Input
        type="text"
        className={cn(
          "h-auto md:h-[80px] w-full md:px-4 md:py-3 text-2xl md:text-5xl text-center font-display font-bold uppercase overflow-hidden text-ellipsis rounded-r-none border-r-0",
          className,
        )}
        onChange={handleChange}
        maxLength={6}
        placeholder={placeholder}
        {...props}
      />
      <Button
        variant="tertiary"
        className="md:h-[80px] aspect-square rounded-l-none"
      >
        <svg
          className="size-5"
          viewBox="0 0 17 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.5">
            <path
              d="M9.83325 12L13.8333 8L9.83325 4"
              stroke="black"
              strokeWidth="1.33333"
              strokeLinecap="square"
            />
            <path
              d="M13.1667 8L3.16675 8"
              stroke="black"
              strokeWidth="1.33333"
              strokeLinecap="square"
            />
          </g>
        </svg>
      </Button>
    </div>
  );
}

export { GameCodeInput };
