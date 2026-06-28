"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import type { Slide } from "@/app/api/screens/[id]/current-content/route"

const POLL_INTERVAL_MS = 30_000
const COMMAND_POLL_MS = 15_000

function ClockSlide({ chainName = "Infoskjerm", storeName }: { chainName?: string; chainShortName?: string; storeName?: string }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"]
  const months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"]

  return (
    <div
      className="flex flex-col items-start justify-between h-full px-16 py-14 text-white"
      style={{ background: 'linear-gradient(160deg, #050505 0%, #101010 100%)' }}
    >
      <div>
        <p
          className="text-sm font-bold uppercase tracking-[0.25em] mb-1"
          style={{ color: 'var(--brand-primary, #16a34a)' }}
        >
          {chainName}
        </p>
        {storeName && (
          <p className="text-base text-white/40 font-medium">{storeName}</p>
        )}
      </div>

      <div>
        <p className="text-[14rem] font-black tabular-nums leading-none text-white" style={{ letterSpacing: '-0.04em' }}>
          {time.getHours().toString().padStart(2, "0")}
          <span className="text-white/30">:</span>
          {time.getMinutes().toString().padStart(2, "0")}
        </p>
        <p className="text-2xl text-white/40 font-medium mt-4">
          {days[time.getDay()]} {time.getDate()}. {months[time.getMonth()]} {time.getFullYear()}
        </p>
      </div>

      <div
        className="h-1 w-24 rounded-full"
        style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }}
      />
    </div>
  )
}

function FooterBar({ slides, currentIndex, chainName }: {
  slides: Slide[]
  currentIndex: number
  chainName: string
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isClockSlide = slides[currentIndex % slides.length]?.moduleKey === "__clock__"
  if (isClockSlide) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-3"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
    >
      <p className="text-white/40 text-sm font-medium">{chainName}</p>
      <div className="flex items-center gap-1.5">
        {slides.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentIndex % slides.length ? 20 : 6,
              height: 4,
              backgroundColor: i === currentIndex % slides.length ? 'var(--brand-primary, white)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
      <p className="text-white/40 text-sm tabular-nums font-medium">
        {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
      </p>
    </div>
  )
}

const CLOCK_SLIDE: Slide = {
  id: "__clock__",
  contentItemId: "__clock__",
  moduleKey: "__clock__",
  fields: {},
  durationSeconds: 10,
}

export function ScreenDisplay({
  token,
  screenId,
  chainName = "Infoskjerm",
  chainShortName = "IS",
  storeName,
  brandPrimary,
  brandFg,
}: {
  token: string
  screenId?: string
  storeId?: string
  chainName?: string
  chainShortName?: string
  storeName?: string
  brandPrimary?: string
  brandFg?: string
}) {
  const [slides, setSlides] = useState<Slide[]>([CLOCK_SLIDE])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPoweredOff, setIsPoweredOff] = useState(false)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slideStartTimeRef = useRef<number>(Date.now())

  const fetchContent = useCallback(async () => {
    if (!screenId) return
    try {
      const res = await fetch(`/api/screens/${screenId}/current-content`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json() as { slides?: Slide[] }
      if (json.slides && json.slides.length > 0) {
        try {
          localStorage.setItem(`slides_cache_${screenId}`, JSON.stringify(json.slides))
        } catch { /* ignore */ }
        setSlides([CLOCK_SLIDE, ...json.slides])
      }
    } catch {
      try {
        const cached = localStorage.getItem(`slides_cache_${screenId}`)
        if (cached) {
          const parsed = JSON.parse(cached) as Slide[]
          if (parsed.length > 0) setSlides([CLOCK_SLIDE, ...parsed])
        }
      } catch { /* ignore */ }
    }
  }, [screenId, token])

  const pollCommands = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/screens/poll?token=${encodeURIComponent(token)}`)
      if (!res.ok) return
      const json = await res.json() as { command?: string | null }
      if (json.command === "reload" || json.command === "reboot") window.location.reload()
      else if (json.command === "power_off") setIsPoweredOff(true)
      else if (json.command === "power_on") setIsPoweredOff(false)
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => {
    fetchContent()
    const t = setInterval(fetchContent, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [fetchContent])

  useEffect(() => {
    pollCommands()
    const t = setInterval(pollCommands, COMMAND_POLL_MS)
    return () => clearInterval(t)
  }, [pollCommands])

  useEffect(() => {
    if (slides.length === 0) return
    const slide = slides[currentIndex % slides.length]
    const duration = (slide.durationSeconds ?? 10) * 1000
    slideStartTimeRef.current = Date.now()
    const outer = setTimeout(() => {
      setIsTransitioning(true)
      transitionTimerRef.current = setTimeout(() => {
        if (slide.moduleKey !== "__clock__" && screenId) {
          const durationMs = Date.now() - slideStartTimeRef.current
          fetch(`/api/screens/${screenId}/play-log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentItemId: slide.contentItemId !== "__clock__" ? slide.contentItemId : undefined,
              moduleKey: slide.moduleKey,
              durationMs,
              slideIndex: currentIndex,
            }),
            keepalive: true,
          }).catch(() => {})
        }
        slideStartTimeRef.current = Date.now()
        setCurrentIndex((prev) => (prev + 1) % slides.length)
        setIsTransitioning(false)
      }, 400)
    }, duration)
    return () => {
      clearTimeout(outer)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [currentIndex, slides, screenId])

  if (isPoweredOff) return <div className="w-screen h-screen bg-black" />

  const slide = slides[currentIndex % slides.length]

  const cssVars: React.CSSProperties = brandPrimary
    ? { '--brand-primary': brandPrimary, '--brand-fg': brandFg ?? '#ffffff' } as React.CSSProperties
    : {}

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-black" style={cssVars}>
      {/* Slide content */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ opacity: isTransitioning ? 0 : 1, transitionDuration: '400ms' }}
      >
        {slide.moduleKey === "__clock__" ? (
          <ClockSlide chainName={chainName} chainShortName={chainShortName} storeName={storeName} />
        ) : (
          <ModuleRenderer moduleKey={slide.moduleKey} fields={slide.fields} />
        )}
      </div>

      {/* Footer */}
      <FooterBar slides={slides} currentIndex={currentIndex} chainName={chainName} />
    </div>
  )
}
