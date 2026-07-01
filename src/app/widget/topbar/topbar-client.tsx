"use client"

import { useEffect, useState } from "react"
import { symbolToGlyph, dayLabel, type WeatherForecast } from "@/lib/weather/yr"

/**
 * The thin top strip on customer screens: store name on the left, then live
 * clock + date + current weather + a compact 4-day forecast on the right. Lives
 * in its own full-width Xibo region above the content; the content fills the
 * rest of the screen.
 */

const TZ = "Europe/Oslo"
const GREEN = "#16a34a"
const MUTED = "rgba(255,255,255,.55)"

function Divider() {
  return <span style={{ width: 1, height: 80, background: "rgba(255,255,255,.12)", flex: "0 0 auto" }} />
}

export function TopbarClient({ butikk, forecast, todayIso, merke = "Gange-Rolv", accent }: { butikk: string; forecast: WeatherForecast | null; todayIso: string; merke?: string; accent?: string }) {
  const brandColor = accent || GREEN
  // null until mounted → avoids SSR/CSR time mismatch; clock ticks every second.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now ? now.toLocaleTimeString("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "--:--"
  const date = now ? now.toLocaleDateString("nb-NO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }) : ""

  return (
    <main
      style={{
        margin: 0,
        width: "100%",
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 36,
        padding: "0 56px",
        background: "linear-gradient(90deg,#0a0a0a,#161616)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Store name */}
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ color: brandColor, fontWeight: 800, letterSpacing: 4, fontSize: 18, textTransform: "uppercase" }}>{merke}</div>
        <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.02, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{butikk}</div>
      </div>

      {forecast && (
        <>
          {/* Current weather */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "0 0 auto" }}>
            <span style={{ fontSize: 70, lineHeight: 1 }}>{symbolToGlyph(forecast.current.symbolCode)}</span>
            <span style={{ fontSize: 66, fontWeight: 900, lineHeight: 1 }}>{forecast.current.temperature}°</span>
          </div>

          <Divider />

          {/* Compact 4-day forecast */}
          <div style={{ display: "flex", gap: 22, flex: "0 0 auto" }}>
            {forecast.days.slice(0, 4).map((d) => (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: MUTED }}>{dayLabel(d.date, todayIso)}</span>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{symbolToGlyph(d.symbolCode)}</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  {d.tempMax ?? "–"}°<span style={{ color: "rgba(255,255,255,.4)", fontWeight: 600 }}> / {d.tempMin ?? "–"}°</span>
                </span>
              </div>
            ))}
          </div>

          <Divider />
        </>
      )}

      {/* Clock + date */}
      <div style={{ flex: "0 0 auto", textAlign: "right" }}>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 0.95, letterSpacing: -1 }}>{time}</div>
        {date && <div style={{ fontSize: 20, color: MUTED, textTransform: "capitalize", marginTop: 4 }}>{date}</div>}
      </div>
    </main>
  )
}
