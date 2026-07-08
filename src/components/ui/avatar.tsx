import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  ringColor?: string
}

function Avatar({ className, src, alt, fallback, ringColor, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false)

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        ringColor && "ring-2 ring-offset-1 ring-offset-background",
        className
      )}
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
        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
          {fallback || alt?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  )
}
Avatar.displayName = "Avatar"

export { Avatar }
