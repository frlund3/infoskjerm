"use client"

import { useEffect, useState, useCallback } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import type { Slide } from "@/app/api/screens/[id]/current-content/route"

const POLL_INTERVAL_MS = 30_000
const COMMAND_POLL_MS = 15_000

function ClockSlide() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"]
  const months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"]
  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="mb-8">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/50">
          <span className="text-4xl font-bold text-white">GR</span>
        </div>
        <p className="text-center text-zinc-400 text-lg font-medium tracking-wide">Gange-Rolv</p>
      </div>
      <p className="text-9xl font-black tabular-nums tracking-tighter text-white">
        {time.getHours().toString().padStart(2, "0")}
        <span className="animate-pulse">:</span>
        {time.getMinutes().toString().padStart(2, "0")}
      </p>
      <p className="text-2xl text-zinc-400 mt-4 font-light">
        {days[time.getDay()]}, {time.getDate()}. {months[time.getMonth()]} {time.getFullYear()}
      </p>
    </div>
  )
}

function ScreenClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="text-zinc-400 text-sm tabular-nums">
      {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
    </span>
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
}: {
  token: string
  screenId?: string
  storeId?: string
}) {
  const [slides, setSlides] = useState<Slide[]>([CLOCK_SLIDE])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPoweredOff, setIsPoweredOff] = useState(false)

  const fetchContent = useCallback(async () => {
    if (!screenId) return
    try {
      const res = await fetch(`/api/screens/${screenId}/current-content`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json() as { slides?: Slide[] }
      if (json.slides && json.slides.length > 0) {
        setSlides([CLOCK_SLIDE, ...json.slides])
        setCurrentIndex(0)
      }
    } catch {
      // keep existing slides on network error
    }
  }, [screenId, token])

  const pollCommands = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/screens/poll?token=${encodeURIComponent(token)}`)
      if (!res.ok) return
      const json = await res.json() as { command?: string | null }
      if (json.command === "reload" || json.command === "reboot") {
        window.location.reload()
      } else if (json.command === "power_off") {
        setIsPoweredOff(true)
      } else if (json.command === "power_on") {
        setIsPoweredOff(false)
      }
    } catch {
      // ignore network errors
    }
  }, [token])

  useEffect(() => {
    fetchContent()
    const contentTimer = setInterval(fetchContent, POLL_INTERVAL_MS)
    return () => clearInterval(contentTimer)
  }, [fetchContent])

  useEffect(() => {
    pollCommands()
    const cmdTimer = setInterval(pollCommands, COMMAND_POLL_MS)
    return () => clearInterval(cmdTimer)
  }, [pollCommands])

  useEffect(() => {
    if (slides.length === 0) return
    const slide = slides[currentIndex % slides.length]
    const duration = (slide.durationSeconds ?? 10) * 1000
    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length)
        setIsTransitioning(false)
      }, 500)
    }, duration)
    return () => clearTimeout(timer)
  }, [currentIndex, slides])

  if (isPoweredOff) {
    return <div className="w-screen h-screen bg-black" />
  }

  const slide = slides[currentIndex % slides.length]

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden relative" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 h-full transition-opacity duration-500" style={{ opacity: isTransitioning ? 0 : 1 }}>
        {slide.moduleKey === "__clock__" ? (
          <ClockSlide />
        ) : (
          <ModuleRenderer moduleKey={slide.moduleKey} fields={slide.fields} />
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">GR</span>
          </div>
          <span className="text-zinc-400 text-sm font-medium">Gange-Rolv</span>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === currentIndex % slides.length ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
            />
          ))}
        </div>
        <ScreenClock />
      </div>
    </div>
  )
}
