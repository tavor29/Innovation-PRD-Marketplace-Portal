import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-ink/85",
        outline: "border border-ink-rule bg-paper text-ink hover:border-ink",
        ghost: "text-ink hover:bg-ink-wash",
        danger: "bg-status-critical text-white hover:bg-status-critical/85",
        good: "bg-status-good text-white hover:bg-status-good/85",
      },
      size: { sm: "px-3 py-1.5 text-xs", md: "", lg: "px-5 py-3 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
