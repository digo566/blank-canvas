import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/20 text-primary-foreground shadow-sm shadow-primary/20",
        secondary: "border-secondary/50 bg-secondary/80 text-secondary-foreground",
        destructive: "border-destructive/30 bg-destructive/20 text-destructive-foreground shadow-sm shadow-destructive/20",
        outline: "text-foreground border-border/50",
        success: "border-green-500/30 bg-green-500/20 text-green-400 shadow-sm shadow-green-500/20",
        warning: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400 shadow-sm shadow-yellow-500/20",
        info: "border-blue-500/30 bg-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
