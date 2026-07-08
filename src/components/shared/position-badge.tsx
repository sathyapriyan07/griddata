import { cn } from "@/lib/utils"

interface PositionBadgeProps {
  position: number | string | null | undefined
  className?: string
  size?: "sm" | "default"
}

export function PositionBadge({ position, className, size = "default" }: PositionBadgeProps) {
  const pos = typeof position === "string" ? parseInt(position, 10) : position

  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full font-bold shrink-0",
      size === "sm" ? "w-6 h-6 text-[11px]" : "w-7 h-7 text-sm",
      pos === 1 && "bg-yellow-500/20 text-yellow-400",
      pos === 2 && "bg-gray-400/20 text-gray-300",
      pos === 3 && "bg-amber-700/20 text-amber-500",
      pos != null && pos > 3 && "bg-muted text-muted-foreground",
      (pos == null || isNaN(pos)) && "bg-muted text-muted-foreground",
      className
    )}>
      {pos ?? "—"}
    </span>
  )
}
