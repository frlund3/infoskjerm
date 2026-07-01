"use client"

import { useEffect, useState, type CSSProperties } from "react"
import type { LiveItem } from "@/lib/content/live"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"
import { CampaignCard } from "./campaign-card"

/**
 * Liggende kunde-kampanjeskjerm (1920×1080). Roterer butikkens kunde-slides:
 * strukturerte kampanjekort (Mobile-stil) for items med `campaign`, ellers et
 * helbilde-fallback med tittel. Egen rotasjon + periodisk reload.
 */

const DEFAULT_SECONDS = 9

const frame: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  background: "#0a0a0c",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#fff",
}

function LandscapePoster({ item, chain }: { item: LiveItem; chain?: ChainBrand | null }) {
  const img = item.imageUrl
  return (
    <div style={{ position: "absolute", inset: 0, containerType: "size", background: "#0a0a0c", overflow: "hidden" }}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "grKb 22s ease-in-out infinite alternate" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(10,10,12,.85) 0%, rgba(10,10,12,.25) 40%, rgba(10,10,12,0) 70%)" }} />
      {item.title && (
        <h1 style={{ position: "absolute", left: "6cqw", right: "6cqw", bottom: "8cqh", margin: 0, fontSize: "8cqh", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.3cqh", textShadow: "0 1.5cqh 4cqh rgba(0,0,0,.5)" }}>
          {item.title}
        </h1>
      )}
      {chain?.name && (
        <span style={{ position: "absolute", right: "6cqh", top: "6cqh", fontSize: "4cqh", fontWeight: 900, letterSpacing: "0.2cqh", textShadow: "0 2px 6px rgba(0,0,0,.5)" }}>{chain.name}</span>
      )}
    </div>
  )
}

export function KampanjeRotator({ items, chain = null }: { items: LiveItem[]; chain?: ChainBrand | null }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const it = items[i % items.length]
    const secs = it?.durationSeconds ?? DEFAULT_SECONDS
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), secs * 1000)
    return () => clearTimeout(id)
  }, [i, items])

  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 10 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const item = items.length ? items[i % items.length] : null

  return (
    <main style={frame}>
      <style>{"@keyframes grKb{from{transform:scale(1)}to{transform:scale(1.08)}}@keyframes grFade{from{opacity:0}to{opacity:1}}"}</style>
      {!item ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive kampanjer
        </div>
      ) : (
        <div key={item.id} style={{ position: "absolute", inset: 0, animation: "grFade .6s ease-out" }}>
          {item.campaign ? <CampaignCard item={item} chain={chain} /> : <LandscapePoster item={item} chain={chain} />}
        </div>
      )}
    </main>
  )
}
