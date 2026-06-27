"use client"

import { useEffect, useState } from "react"
import { CloudSun, Thermometer, Wind, Droplets, Trophy, Newspaper, TrendingUp, Clock } from "lucide-react"

interface SlideContent {
  id: string
  type: "news" | "competition" | "stats" | "weather" | "slide" | "clock"
  title?: string
  body?: string
  data?: Record<string, unknown>
}

const demoSlides: SlideContent[] = [
  {
    id: "1",
    type: "clock",
    title: "Velkommen",
  },
  {
    id: "2",
    type: "news",
    title: "Sommerferieåpningstider 2025",
    body: "Vi minner om at butikken har endrede åpningstider i juli. Hverdager: 08:00–20:00, Lørdag: 09:00–18:00. God sommer til alle ansatte!",
  },
  {
    id: "3",
    type: "competition",
    title: "Ukens konkurranse",
    body: "Hvem selger mest i denne uken? Topplisten oppdateres daglig. Premie: Gavekort på 500 kr!",
    data: {
      leaderboard: [
        { name: "Kari N.", score: "142 500 kr" },
        { name: "Ola M.", score: "138 200 kr" },
        { name: "Per H.", score: "121 800 kr" },
      ],
      endsIn: "3 dager",
    },
  },
  {
    id: "4",
    type: "stats",
    title: "Salgstall — i dag",
    data: {
      today: "87 400",
      yesterday: "79 200",
      week: "412 800",
      budget: "95 000",
      pct: 92,
    },
  },
  {
    id: "5",
    type: "weather",
    title: "Vær neste 7 dager",
    data: {
      location: "Ålesund",
      current: { temp: 18, condition: "Delvis skyet", wind: 6, humidity: 72 },
      forecast: [
        { day: "Man", icon: "☀️", high: 21, low: 13 },
        { day: "Tir", icon: "⛅", high: 19, low: 11 },
        { day: "Ons", icon: "🌧️", high: 15, low: 10 },
        { day: "Tor", icon: "🌦️", high: 17, low: 12 },
        { day: "Fre", icon: "☀️", high: 22, low: 14 },
        { day: "Lør", icon: "☀️", high: 23, low: 15 },
        { day: "Søn", icon: "⛅", high: 20, low: 13 },
      ],
    },
  },
]

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

function NewsSlide({ slide }: { slide: SlideContent }) {
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Newspaper className="w-7 h-7 text-violet-400" />
        </div>
        <span className="text-violet-400 font-semibold text-lg uppercase tracking-widest">Nyhet</span>
      </div>
      <h2 className="text-6xl font-black text-white leading-tight mb-8">{slide.title}</h2>
      <p className="text-2xl text-zinc-300 leading-relaxed max-w-3xl">{slide.body}</p>
    </div>
  )
}

function CompetitionSlide({ slide }: { slide: SlideContent }) {
  const lb = (slide.data?.leaderboard as { name: string; score: string }[]) ?? []
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-amber-400" />
        </div>
        <span className="text-amber-400 font-semibold text-lg uppercase tracking-widest">Konkurranse</span>
        <span className="ml-auto text-zinc-500 text-sm">Avsluttes om {slide.data?.endsIn as string}</span>
      </div>
      <h2 className="text-5xl font-black text-white leading-tight mb-6">{slide.title}</h2>
      <p className="text-xl text-zinc-400 mb-10">{slide.body}</p>
      <div className="space-y-3">
        {lb.map((entry, i) => (
          <div key={i} className="flex items-center gap-5 bg-white/5 rounded-2xl px-6 py-4 border border-white/10">
            <span className={`text-3xl font-black w-10 ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : "text-amber-700"}`}>
              {i + 1}.
            </span>
            <span className="text-xl font-semibold text-white flex-1">{entry.name}</span>
            <span className="text-xl font-bold text-emerald-400">{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsSlide({ slide }: { slide: SlideContent }) {
  const d = slide.data as { today: string; yesterday: string; week: string; budget: string; pct: number }
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-emerald-400" />
        </div>
        <span className="text-emerald-400 font-semibold text-lg uppercase tracking-widest">Salgstall</span>
        <span className="ml-auto text-zinc-500 text-sm">Oppdatert i dag</span>
      </div>
      <h2 className="text-4xl font-black mb-10">{slide.title}</h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Omsetning i dag</p>
          <p className="text-6xl font-black text-white">{d?.today}</p>
          <p className="text-zinc-500 text-sm mt-1">kr</p>
        </div>
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Budsjett i dag</p>
          <p className="text-6xl font-black text-zinc-300">{d?.budget}</p>
          <p className="text-zinc-500 text-sm mt-1">kr</p>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Budsjettoppnåelse</span>
          <span className={`font-bold ${d?.pct >= 100 ? "text-emerald-400" : d?.pct >= 80 ? "text-amber-400" : "text-red-400"}`}>
            {d?.pct}%
          </span>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${d?.pct >= 100 ? "bg-emerald-500" : d?.pct >= 80 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(d?.pct, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">I går</p>
          <p className="text-xl font-bold text-zinc-300">{d?.yesterday} kr</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">Denne uken</p>
          <p className="text-xl font-bold text-zinc-300">{d?.week} kr</p>
        </div>
      </div>
    </div>
  )
}

function WeatherSlide({ slide }: { slide: SlideContent }) {
  const d = slide.data as {
    location: string
    current: { temp: number; condition: string; wind: number; humidity: number }
    forecast: { day: string; icon: string; high: number; low: number }[]
  }
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <CloudSun className="w-7 h-7 text-sky-400" />
        </div>
        <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {d?.location}</span>
      </div>

      {/* Current */}
      <div className="flex items-end gap-8 mb-10">
        <p className="text-9xl font-black">{d?.current.temp}°</p>
        <div className="pb-4">
          <p className="text-2xl text-zinc-300 mb-3">{d?.current.condition}</p>
          <div className="flex gap-6 text-zinc-400">
            <div className="flex items-center gap-2"><Wind className="w-4 h-4" /><span>{d?.current.wind} m/s</span></div>
            <div className="flex items-center gap-2"><Droplets className="w-4 h-4" /><span>{d?.current.humidity}%</span></div>
          </div>
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="flex gap-3">
        {d?.forecast.map((day) => (
          <div key={day.day} className="flex-1 bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">{day.day}</p>
            <p className="text-3xl mb-2">{day.icon}</p>
            <p className="text-sm font-bold text-white">{day.high}°</p>
            <p className="text-xs text-zinc-500">{day.low}°</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScreenDisplay({ token }: { token: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const durations: Record<string, number> = {
      clock: 10000,
      news: 12000,
      competition: 15000,
      stats: 12000,
      weather: 12000,
      slide: 10000,
    }

    const slide = demoSlides[currentIndex]
    const duration = durations[slide.type] ?? 10000

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % demoSlides.length)
        setIsTransitioning(false)
      }, 500)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex])

  const slide = demoSlides[currentIndex]

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden relative" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 h-full transition-opacity duration-500"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {slide.type === "clock" && <ClockSlide />}
        {slide.type === "news" && <NewsSlide slide={slide} />}
        {slide.type === "competition" && <CompetitionSlide slide={slide} />}
        {slide.type === "stats" && <StatsSlide slide={slide} />}
        {slide.type === "weather" && <WeatherSlide slide={slide} />}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">GR</span>
          </div>
          <span className="text-zinc-400 text-sm font-medium">Gange-Rolv</span>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center gap-2">
          {demoSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${i === currentIndex ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
            />
          ))}
        </div>

        <ScreenClock />
      </div>
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
