"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react"
import Link from "next/link"

interface ContentItem {
  id: string
  title: string
  type: string
  status: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string | null
}

interface CalendarClientProps {
  items: ContentItem[]
}

const statusColor: Record<string, string> = {
  draft: "bg-zinc-500",
  pending_approval: "bg-amber-500",
  approved: "bg-blue-500",
  live: "bg-emerald-500",
  scheduled: "bg-cyan-500",
  rejected: "bg-red-500",
}

const statusLabel: Record<string, string> = {
  draft: "Utkast",
  pending_approval: "Venter",
  approved: "Godkjent",
  live: "Live",
  scheduled: "Planlagt",
  rejected: "Avvist",
}

const typeLabels: Record<string, string> = {
  news: "Nyhet", competition: "Konkurranse", stats: "Salgstall",
  weather: "Vær", slide: "Slide",
}

const MONTHS_NO = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"]
const DAYS_NO = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]

function getItemDate(item: ContentItem): Date | null {
  const dateStr = item.scheduled_at ?? item.published_at ?? item.created_at
  if (!dateStr) return null
  return new Date(dateStr)
}

export function CalendarClient({ items }: CalendarClientProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [viewMode, setViewMode] = useState<"month" | "list">("month")

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItem[]>()
    for (const item of items) {
      const d = getItemDate(item)
      if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  const monthItems = useMemo(() => {
    return items.filter(item => {
      const d = getItemDate(item)
      return d && d.getFullYear() === year && d.getMonth() === month
    }).sort((a, b) => {
      const da = getItemDate(a)?.getTime() ?? 0
      const db = getItemDate(b)?.getTime() ?? 0
      return da - db
    })
  }, [items, year, month])

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <h2 className="text-xl font-bold text-zinc-900 min-w-48 text-center">
            {MONTHS_NO[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="text-sm text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors ml-2"
          >
            I dag
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            {Object.entries(statusLabel).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColor[k]}`} />
                <span className="text-xs text-zinc-500">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("month")} className={`p-2 transition-colors ${viewMode === "month" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <CalendarDays className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "month" ? (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_NO.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-zinc-50 min-h-24 p-2" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = `${year}-${month}-${day}`
              const dayItems = itemsByDate.get(key) ?? []
              const isToday = key === todayKey

              return (
                <div key={day} className={`bg-white min-h-24 p-2 ${isToday ? "bg-blue-50" : ""}`}>
                  <div className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                    isToday ? "bg-zinc-900 text-white" : "text-zinc-500"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <Link
                        key={item.id}
                        href={`/preview/${item.id}`}
                        target="_blank"
                        className={`block text-[10px] px-1.5 py-0.5 rounded text-white font-medium truncate ${statusColor[item.status ?? "draft"]} hover:opacity-80 transition-opacity`}
                        title={item.title}
                      >
                        {item.title}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] text-zinc-400">+{dayItems.length - 3} til</p>
                    )}
                  </div>
                </div>
              )
            })}

            {Array.from({ length: (7 - (startOffset + daysInMonth) % 7) % 7 }).map((_, i) => (
              <div key={`end-${i}`} className="bg-zinc-50 min-h-24 p-2" />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {monthItems.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-zinc-200" />
              <p className="font-medium">Ingen innhold denne måneden</p>
            </div>
          ) : monthItems.map(item => {
            const d = getItemDate(item)
            return (
              <div key={item.id} className="flex items-center gap-4 bg-white border border-zinc-100 rounded-xl px-4 py-3 hover:border-zinc-200 transition-colors">
                <div className="w-12 flex-shrink-0 text-center">
                  <p className="text-xs text-zinc-400">{d ? MONTHS_NO[d.getMonth()].slice(0, 3) : "—"}</p>
                  <p className="text-lg font-bold text-zinc-900">{d ? d.getDate() : "—"}</p>
                </div>
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${statusColor[item.status ?? "draft"]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-400">{typeLabels[item.type] ?? item.type} · {statusLabel[item.status ?? "draft"] ?? item.status}</p>
                </div>
                <Link href={`/preview/${item.id}`} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                  Vis
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
