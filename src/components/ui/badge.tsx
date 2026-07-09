import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-tertiary text-text-secondary border border-default",
        brand:
          "bg-accent-red text-white border-transparent",
        secondary:
          "bg-tertiary text-text-secondary border-transparent",
        destructive:
          "bg-red-900/30 text-red-400 border-transparent",
        success:
          "bg-green-900/30 text-green-400 border-transparent",
        warning:
          "bg-yellow-900/30 text-yellow-400 border-transparent",
        info:
          "bg-purple-900/30 text-purple-300 border-transparent",
        outline: "text-text-secondary border-default",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
