import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wide uppercase select-none transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-hot",
  {
    variants: {
      variant: {
        primary:
          "bg-ember text-fg hover:bg-ember-hot active:bg-heat shadow-[0_8px_20px_rgb(196_92_38_/_0.28)]",
        secondary:
          "bg-elevated text-fg border border-border hover:border-iron hover:bg-surface",
        ghost: "bg-transparent text-fg hover:bg-elevated",
        danger: "bg-heat text-fg hover:brightness-110",
      },
      size: {
        sm: "h-10 px-3 text-xs rounded-sm",
        md: "h-11 px-4 text-sm rounded-md",
        lg: "h-12 px-5 text-sm rounded-md min-h-12",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
