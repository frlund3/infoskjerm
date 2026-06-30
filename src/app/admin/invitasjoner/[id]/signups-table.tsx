"use client"

import { Download, Inbox } from "lucide-react"

export interface SignupRow {
  id: string
  name: string
  department: string | null
  guests: number
  dietary: string | null
  comment: string | null
  email: string | null
  phone: string | null
  store: string | null
  createdAt: string
}

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function SignupsTable({ rows, eventTitle }: { rows: SignupRow[]; eventTitle: string }) {
  const exportCsv = () => {
    const header = ["Navn", "Avdeling", "Følge", "Allergier", "Kommentar", "E-post", "Telefon", "Butikk", "Påmeldt"]
    const lines = rows.map((r) =>
      [
        r.name,
        r.department,
        r.guests,
        r.dietary,
        r.comment,
        r.email,
        r.phone,
        r.store,
        new Date(r.createdAt).toLocaleString("nb-NO"),
      ]
        .map(csvCell)
        .join(";")
    )
    const csv = "﻿" + [header.join(";"), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pameldinger-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
        <Inbox className="mb-3 h-8 w-8 text-zinc-300" />
        <h2 className="text-sm font-bold text-zinc-900">Ingen påmeldinger ennå</h2>
        <p className="mt-1 max-w-xs text-xs text-zinc-500">Når noen skanner QR-koden på skjermen og melder seg på, dukker de opp her.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Påmeldingsliste</h2>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900">
          <Download className="h-3.5 w-3.5" /> Last ned CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-2.5 font-semibold">Navn</th>
              <th className="px-4 py-2.5 font-semibold">Avdeling</th>
              <th className="px-4 py-2.5 font-semibold">Følge</th>
              <th className="px-4 py-2.5 font-semibold">Allergier</th>
              <th className="px-4 py-2.5 font-semibold">Kontakt</th>
              <th className="px-4 py-2.5 font-semibold">Påmeldt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                <td className="px-4 py-2.5 font-medium text-zinc-900">
                  {r.name}
                  {r.comment && <span className="mt-0.5 block text-[11px] font-normal text-zinc-400">{r.comment}</span>}
                </td>
                <td className="px-4 py-2.5 text-zinc-600">{r.department ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-600">{r.guests > 0 ? `+${r.guests}` : "—"}</td>
                <td className="px-4 py-2.5 text-zinc-600">{r.dietary ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-600">{r.email || r.phone || "—"}</td>
                <td className="px-4 py-2.5 text-zinc-400">{new Date(r.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
