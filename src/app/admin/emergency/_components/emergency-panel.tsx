"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, CheckCircle, XCircle, ShieldOff } from "lucide-react"
import { activatePriority, deactivatePriority, deactivateAllPriority } from "../actions"

interface ContentItem {
  id: string
  title: string
  type: string | null
  status: string | null
  created_at: string | null
}

interface Props {
  priorityItems: ContentItem[]
  liveItems: ContentItem[]
}

export function EmergencyPanel({ priorityItems, liveItems }: Props) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleActivate(id: string) {
    startTransition(async () => {
      const result = await activatePriority(id)
      if (result.ok) {
        showFeedback("Prioritert innhold aktivert — vises nå på alle skjermer")
      } else {
        showFeedback(`Feil: ${result.error}`)
      }
    })
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const result = await deactivatePriority(id)
      if (result.ok) {
        showFeedback("Prioritering deaktivert")
      } else {
        showFeedback(`Feil: ${result.error}`)
      }
    })
  }

  function handleDeactivateAll() {
    startTransition(async () => {
      const result = await deactivateAllPriority()
      if (result.ok) {
        showFeedback("Nødmodus deaktivert — alle skjermer tilbake til normal visning")
      } else {
        showFeedback(`Feil: ${result.error}`)
      }
    })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Feedback banner */}
      {feedback && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900 text-white text-sm font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {feedback}
        </div>
      )}

      {/* Active priority section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-sm font-semibold text-zinc-900">Aktivt nødinnhold</h2>
            {priorityItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                {priorityItems.length} aktiv{priorityItems.length !== 1 ? "e" : ""}
              </span>
            )}
          </div>
          {priorityItems.length > 0 && (
            <button
              onClick={handleDeactivateAll}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              <ShieldOff className="w-4 h-4" />
              Deaktiver nødmodus
            </button>
          )}
        </div>

        {priorityItems.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-8 text-center">
            <p className="text-zinc-500 text-sm">Ingen aktiv nødkringkasting akkurat nå</p>
          </div>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 divide-y divide-red-100">
            {priorityItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.type} · {item.status}</p>
                </div>
                <button
                  onClick={() => handleDeactivate(item.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Deaktiver
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activate priority on live content */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Aktiver nødkringkasting</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Velg et eksisterende live-innhold som skal sendes til alle skjermer med høyeste prioritet.
        </p>

        {liveItems.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-8 text-center">
            <p className="text-zinc-500 text-sm">Ingen live-innhold tilgjengelig</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
            {liveItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.type}</p>
                </div>
                <button
                  onClick={() => handleActivate(item.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Aktiver nød
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
