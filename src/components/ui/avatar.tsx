import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: number
}

function Avatar({ className, src, alt, fallback, size = 40, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false)

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-border-strong shadow-md",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-tertiary text-sm font-medium text-text-secondary">
          {fallback || alt?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  )
}
Avatar.displayName = "Avatar"

export { Avatar }
