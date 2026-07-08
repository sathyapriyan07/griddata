import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface StatCardProps {
  label: string
  value: string | number | null | undefined
  icon?: ReactNode
  trend?: "up" | "down" | "neutral"
  className?: string
  size?: "sm" | "default" | "lg"
}

export function StatCard({ label, value, icon, className, size = "default" }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm p-3 sm:p-4",
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      </div>
      <p className={cn(
        "font-bold tabular-nums text-foreground mt-1",
        size === "sm" && "text-lg sm:text-xl",
        size === "default" && "text-2xl sm:text-3xl",
        size === "lg" && "text-3xl sm:text-4xl lg:text-5xl",
      )}>
        {value ?? "—"}
      </p>
    </div>
  )
}
