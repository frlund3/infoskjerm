import {
  Newspaper, Trophy, ImageIcon, Briefcase, PartyPopper, BarChart3, Megaphone, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isDeckUrl } from "@/lib/content/deck"

/**
 * Delt kilde-til-sannhet for innholdstype-metadata (etikett, ikon, badge, gradient)
 * og media-gjenkjenning. Brukes av både kort-oversikten og rekkefølge-dialogen så
 * miniatyrbilder ser like ut overalt (intern + kunde).
 */
export const TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string; gradient: string }> = {
  news: { label: "Nyhet", icon: Newspaper, badge: "bg-blue-600 text-white", gradient: "from-blue-500 to-blue-700" },
  competition: { label: "Konkurranse", icon: Trophy, badge: "bg-amber-500 text-white", gradient: "from-amber-400 to-amber-600" },
  slide: { label: "Tilbud", icon: ImageIcon, badge: "bg-zinc-700 text-white", gradient: "from-zinc-600 to-zinc-800" },
  job: { label: "Stilling", icon: Briefcase, badge: "bg-indigo-600 text-white", gradient: "from-indigo-500 to-indigo-700" },
  birthday: { label: "Gratulerer", icon: PartyPopper, badge: "bg-pink-500 text-white", gradient: "from-pink-400 to-pink-600" },
  stats: { label: "Salgstall", icon: BarChart3, badge: "bg-emerald-600 text-white", gradient: "from-emerald-500 to-emerald-700" },
  weather: { label: "Vær", icon: ImageIcon, badge: "bg-sky-500 text-white", gradient: "from-sky-400 to-sky-600" },
  ticker: { label: "Ticker", icon: Megaphone, badge: "bg-orange-500 text-white", gradient: "from-orange-400 to-orange-600" },
}

/** Uploads kan være PDF (kundeavis/plakat) eller video — begge må ikke rendres som <img>. */
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".pdf")
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/.test(url.toLowerCase().split("?")[0])
}

/**
 * Kompakt miniatyr for lister/dialoger. Speiler kort-oversiktens fallback-logikk:
 * PDF → dokument-ikon, video → første frame, bilde → object-cover, uten bilde →
 * type-farget kort med type-ikon (ikke en «ødelagt»-lignende grå klosse).
 * `className` styrer størrelse/form fra kalleren (f.eks. w-full h-full).
 */
export function ContentThumb({ imageUrl, type, className }: { imageUrl: string | null; type: string; className?: string }) {
  const tm = TYPE_META[type] ?? TYPE_META.slide
  const TypeIcon = tm.icon

  if (imageUrl && isDeckUrl(imageUrl)) {
    // PDF (kundeavis) og PowerPoint vises begge som dokument-ikon i miniatyren.
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-white/70", className)}>
        <FileText className="w-4 h-4" />
      </div>
    )
  }
  if (imageUrl && isVideoUrl(imageUrl)) {
    return <video src={`${imageUrl}#t=1`} muted playsInline preload="metadata" className={cn("object-cover bg-zinc-900", className)} />
  }
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={cn("object-cover", className)} />
  }
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br text-white/90", tm.gradient, className)}>
      <TypeIcon className="w-4 h-4" />
    </div>
  )
}
