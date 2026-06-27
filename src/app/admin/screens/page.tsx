"use client"

import { useState } from "react"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Copy, RefreshCw, Trash2, Plus, CheckCircle2, XCircle, Clock } from "lucide-react"

const mockScreens = [
  { id: "1", store: "EUROSPAR BLINDHEIM", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.BLINDHEIM_01", status: "online", lastSeen: "2 min siden", createdAt: "12. jan 2025" },
  { id: "2", store: "EUROSPAR HAREID", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.HAREID_01", status: "online", lastSeen: "5 min siden", createdAt: "12. jan 2025" },
  { id: "3", store: "EUROSPAR LARSGÅRDEN", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.LARS_01", status: "online", lastSeen: "1 min siden", createdAt: "12. jan 2025" },
  { id: "4", store: "EUROSPAR MOA", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.MOA_01", status: "online", lastSeen: "Akkurat nå", createdAt: "12. jan 2025" },
  { id: "5", store: "EUROSPAR ÅLESUND STORSENTER", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.ALS_01", status: "online", lastSeen: "3 min siden", createdAt: "12. jan 2025" },
  { id: "6", store: "EUROSPAR ØRSTA", chain: "EUROSPAR", chainColor: "#E30613", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.ORSTA_01", status: "online", lastSeen: "7 min siden", createdAt: "12. jan 2025" },
  { id: "7", store: "JOKER GODØY", chain: "JOKER", chainColor: "#F7A600", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.GODOY_01", status: "online", lastSeen: "12 min siden", createdAt: "13. jan 2025" },
  { id: "8", store: "JOKER ÅHEIM", chain: "JOKER", chainColor: "#F7A600", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.AHEIM_01", status: "online", lastSeen: "4 min siden", createdAt: "13. jan 2025" },
  { id: "9", store: "SPAR ELLINGSØY", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.ELLS_01", status: "online", lastSeen: "6 min siden", createdAt: "14. jan 2025" },
  { id: "10", store: "SPAR HORNINDAL", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.HORN_01", status: "offline", lastSeen: "3 timer siden", createdAt: "14. jan 2025" },
  { id: "11", store: "SPAR LANGEVÅG", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.LANG_01", status: "online", lastSeen: "2 min siden", createdAt: "14. jan 2025" },
  { id: "12", store: "SPAR RAUDEBERG", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.RAUD_01", status: "online", lastSeen: "8 min siden", createdAt: "14. jan 2025" },
  { id: "13", store: "SPAR STRAUMANE", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.STRA_01", status: "online", lastSeen: "1 min siden", createdAt: "14. jan 2025" },
  { id: "14", store: "SPAR TRESFJORD", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.TRES_01", status: "online", lastSeen: "15 min siden", createdAt: "14. jan 2025" },
  { id: "15", store: "SPAR ULSTEINVIK", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.ULST_01", status: "online", lastSeen: "9 min siden", createdAt: "14. jan 2025" },
  { id: "16", store: "SPAR FISKÅ", chain: "SPAR", chainColor: "#007B40", name: "Personalrom", token: "gr_eyJhbGciOiJIUzI1NiJ9.FISK_01", status: "online", lastSeen: "11 min siden", createdAt: "14. jan 2025" },
]

export default function ScreensPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(`https://info.gange-rolv.no/screen/${token}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const online = mockScreens.filter((s) => s.status === "online").length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermer"
        subtitle={`${online} av ${mockScreens.length} online`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny skjerm
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{online}</p>
                <p className="text-xs text-zinc-500">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{mockScreens.length - online}</p>
                <p className="text-xs text-zinc-500">Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{mockScreens.length}</p>
                <p className="text-xs text-zinc-500">Totalt</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Screen list */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Butikk</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Navn</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Skjerm-URL</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Sist sett</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-3">Opprettet</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {mockScreens.map((screen) => (
                  <tr key={screen.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${screen.status === "online" ? "bg-emerald-500" : "bg-red-400"}`} />
                        <span className={`text-xs font-medium ${screen.status === "online" ? "text-emerald-700" : "text-red-600"}`}>
                          {screen.status === "online" ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{screen.store}</p>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: screen.chainColor + "20", color: screen.chainColor }}
                        >
                          {screen.chain}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-zinc-700">{screen.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-600 max-w-48 truncate block">
                          {screen.token.slice(0, 30)}...
                        </code>
                        <button
                          onClick={() => copyToken(screen.token, screen.id)}
                          className="text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0"
                        >
                          {copied === screen.id
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500">{screen.lastSeen}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-400">{screen.createdAt}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
