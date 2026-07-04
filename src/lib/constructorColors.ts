export interface ConstructorColors {
  primary: string
  secondary: string
  accent: string
}

const colors: Record<string, ConstructorColors> = {
  "Mercedes": { primary: "#00d2be", secondary: "#00a19c", accent: "#ffffff" },
  "Red Bull": { primary: "#0600ef", secondary: "#1e4d8f", accent: "#ffffff" },
  "Ferrari": { primary: "#dc0000", secondary: "#8c1b14", accent: "#ffffff" },
  "McLaren": { primary: "#ff8700", secondary: "#4c2c02", accent: "#000000" },
  "Alpine": { primary: "#0090ff", secondary: "#002b5c", accent: "#ffffff" },
  "Aston Martin": { primary: "#2d6f3e", secondary: "#163f23", accent: "#ffffff" },
  "Williams": { primary: "#005aff", secondary: "#001f4d", accent: "#ffffff" },
  "Alfa Romeo": { primary: "#900000", secondary: "#4c0000", accent: "#ffffff" },
  "Haas": { primary: "#b7b7b7", secondary: "#000000", accent: "#000000" },
  "AlphaTauri": { primary: "#2b2e4a", secondary: "#7f7f9d", accent: "#ffffff" },
}

export function getConstructorColors(name: string): ConstructorColors | null {
  if (colors[name]) return colors[name]
  const normalized = name.trim().toLowerCase()
  const fallback = Object.keys(colors).find((key) => key.toLowerCase() === normalized)
  return fallback ? colors[fallback] : {
    primary: "#6b7280",
    secondary: "#d1d5db",
    accent: "#111827",
  }
}

export function getConstructorColorsFromRecord(constructor: { name: string; color_primary: string | null; color_secondary: string | null; color_accent: string | null }): ConstructorColors {
  const fallback = getConstructorColors(constructor.name)
  return {
    primary: constructor.color_primary ?? fallback?.primary ?? "#6b7280",
    secondary: constructor.color_secondary ?? fallback?.secondary ?? "#d1d5db",
    accent: constructor.color_accent ?? fallback?.accent ?? "#111827",
  }
}
