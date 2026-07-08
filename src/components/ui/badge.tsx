import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-f1-red text-white shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground border-border",
        live: "border-transparent bg-f1-red/10 text-f1-red gap-1.5",
        position: "flex items-center justify-center w-7 h-7 rounded-full p-0 text-sm font-bold border-0",
        podium1: "bg-yellow-500/20 text-yellow-400 border-0",
        podium2: "bg-gray-400/20 text-gray-300 border-0",
        podium3: "bg-amber-700/20 text-amber-500 border-0",
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
    <div className={cn(badgeVariants({ variant }), "min-h-[22px]", className)} {...props} />
  )
}

export { Badge, badgeVariants }
