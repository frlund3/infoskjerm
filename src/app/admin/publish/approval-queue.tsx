"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { approveContent, rejectContent, rollbackContent } from "./actions"
import { toast } from "sonner"

interface ContentItem {
  id: string
  title: string
  type: string
  status: string | null
  created_at: string | null
}

interface PublishLogEntry {
  id: string
  content_item_id: string | null
  action: string
  created_at: string | null
  snapshot: Record<string, unknown>
}

interface ApprovalQueueProps {
  pendingItems: ContentItem[]
  publishLog: PublishLogEntry[]
  canApprove: boolean
}

const typeLabels: Record<string, string> = {
  news: "Nyhet", competition: "Konkurranse", stats: "Salgstall",
  weather: "Vær", slide: "Bygg/Slide",
}

function ActionButton({ label, color, onClick, loading }: { label: string; color: string; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50 ${color}`}
    >
      {label}
    </button>
  )
}

export function ApprovalQueue({ pendingItems, publishLog, canApprove }: ApprovalQueueProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showLog, setShowLog] = useState(false)

  async function handleApprove(id: string) {
    setLoadingId(id)
    const result = await approveContent(id)
    setLoadingId(null)
    if (result.ok) toast.success('Innhold godkjent')
    else toast.error(result.error ?? 'Feil')
  }

  async function handleReject(id: string) {
    const reason = prompt("Årsak til avvisning (valgfritt):")
    setLoadingId(id)
    const result = await rejectContent(id, reason ?? undefined)
    setLoadingId(null)
    if (result.ok) toast.success('Innhold avvist')
    else toast.error(result.error ?? 'Feil')
  }

  async function handleRollback(logId: string) {
    if (!confirm("Tilbakestille innholdet til dette punktet?")) return
    setLoadingId(logId)
    const result = await rollbackContent(logId)
    setLoadingId(null)
    if (result.ok) toast.success('Innhold tilbakestilt')
    else toast.error(result.error ?? 'Feil')
  }

  const actionLabels: Record<string, string> = {
    submitted_for_approval: "Sendt til godkjenning",
    approved: "Godkjent",
    rejected: "Avvist",
    published: "Publisert",
    scheduled: "Planlagt",
    rolled_back: "Tilbakestilt",
  }

  // Suppress unused import warnings — these icons are referenced for visual clarity
  void XCircle

  return (
    <div className="space-y-6">
      {/* Pending approval */}
      {pendingItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Venter på godkjenning
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{pendingItems.length}</span>
          </h2>
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white border border-amber-200 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-400">
                    {typeLabels[item.type] ?? item.type} · {item.created_at ? new Date(item.created_at).toLocaleDateString("nb-NO") : "—"}
                  </p>
                </div>
                {canApprove ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <ActionButton
                      label="Godkjenn"
                      color="bg-emerald-600 hover:bg-emerald-700"
                      loading={loadingId === item.id}
                      onClick={() => handleApprove(item.id)}
                    />
                    <ActionButton
                      label="Avvis"
                      color="bg-red-500 hover:bg-red-600"
                      loading={loadingId === item.id}
                      onClick={() => handleReject(item.id)}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex-shrink-0">Venter kjedeleder</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish log */}
      {publishLog.length > 0 && (
        <div>
          <button
            onClick={() => setShowLog((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-3 hover:text-zinc-700"
          >
            {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Publiseringslogg ({publishLog.length})
          </button>
          {showLog && (
            <div className="space-y-2">
              {publishLog.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center gap-4 bg-white border border-zinc-100 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {actionLabels[log.action] ?? log.action}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {log.created_at ? new Date(log.created_at).toLocaleString("nb-NO") : "—"}
                    </p>
                  </div>
                  {(log.action === "published" || log.action === "approved") && (
                    <button
                      onClick={() => handleRollback(log.id)}
                      disabled={loadingId === log.id}
                      className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      Angre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingItems.length === 0 && publishLog.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Ingen innhold venter godkjenning</p>
          <p className="text-sm text-zinc-400 mt-1">Innhold opprettet i byggeren vil dukke opp her.</p>
        </div>
      )}
    </div>
  )
}
