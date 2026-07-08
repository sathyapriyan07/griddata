import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TeamAccentCardProps {
  children: ReactNode
  color?: string
  className?: string
  onClick?: () => void
}

export function TeamAccentCard({ children, color, className, onClick }: TeamAccentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
        onClick && "cursor-pointer hover:bg-card/80 transition-colors",
        className
      )}
    >
      {color && (
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      )}
      <div className="p-3 sm:p-4">
        {children}
      </div>
    </div>
  )
}
