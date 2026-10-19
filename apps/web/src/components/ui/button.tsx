import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button-default",
      outline: "ui-button-outline",
      ghost: "ui-button-ghost",
    },
    size: { default: "ui-button-md", sm: "ui-button-sm", icon: "ui-button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
