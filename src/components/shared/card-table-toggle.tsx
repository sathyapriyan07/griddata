import { cn } from "@/lib/utils"
import { LayoutGrid, Table2 } from "lucide-react"

interface CardTableToggleProps {
  cardView: boolean
  onToggle: () => void
  label?: string
}

export function CardTableToggle({ cardView, onToggle, label }: CardTableToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <button
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none",
          cardView ? "bg-f1-red" : "bg-muted"
        )}
        aria-label={cardView ? "Switch to table view" : "Switch to card view"}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow transition-transform",
            cardView ? "translate-x-8" : "translate-x-1"
          )}
        >
          {cardView ? (
            <LayoutGrid className="h-3 w-3 text-f1-red" />
          ) : (
            <Table2 className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </button>
    </div>
  )
}
