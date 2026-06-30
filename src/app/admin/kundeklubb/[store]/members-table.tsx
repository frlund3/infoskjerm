"use client"

import { Download, Users } from "lucide-react"

export interface MemberRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  createdAt: string
}

function csvCell(v: string | null): string {
  const s = v ?? ""
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function MembersTable({ rows, storeName }: { rows: MemberRow[]; storeName: string }) {
  const exportCsv = () => {
    const header = ["Navn", "Telefon", "E-post", "Påmeldt"]
    const lines = rows.map((r) => [r.name, r.phone, r.email, new Date(r.createdAt).toLocaleString("nb-NO")].map(csvCell).join(";"))
    const csv = "﻿" + [header.join(";"), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kundeklubb-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900"><Users className="h-4 w-4 text-zinc-400" /> Medlemmer <span className="text-zinc-400">({rows.length})</span></h2>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">Ingen medlemmer ennå. Når kunder skanner QR-koden på skjermen, dukker de opp her.</p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2.5 font-semibold">Navn</th>
                <th className="px-4 py-2.5 font-semibold">Kontakt</th>
                <th className="px-4 py-2.5 font-semibold">Påmeldt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{r.phone || r.email || "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{new Date(r.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
