"use client"

import { useState } from "react"
import Link from "next/link"
import { Monitor, Mail, Building2, MapPin, Hash, ArrowUpRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagPopover } from "./tag-popover"
import type { BoardStore, BoardTag } from "./types"
import { withAlpha } from "./types"

interface StoreCardProps {
  store: BoardStore
  chainName: string
  chainColor: string
  tags: BoardTag[]
  allTags: BoardTag[]
  onToggleTag: (tag: BoardTag, assign: boolean) => void
  onCreateTag: (name: string, color: string) => Promise<{ ok: boolean; error?: string }>
  onUpdateTag: (tag: BoardTag) => Promise<{ ok: boolean; error?: string }>
  onDeleteTag: (tagId: string) => Promise<{ ok: boolean; error?: string }>
}

export function StoreCard({
  store,
  chainName,
  chainColor,
  tags,
  allTags,
  onToggleTag,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: StoreCardProps) {
  const online = store.screenCount > 0
  const [tagOpen, setTagOpen] = useState(false)

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg",
        tagOpen ? "z-40" : "hover:z-10"
      )}
    >
      {/* Chain accent strip */}
      <div
        className="h-1.5 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${chainColor}, ${withAlpha(chainColor, "99")})` }}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="relative mt-1.5 flex h-2.5 w-2.5 flex-shrink-0">
              {online && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  online ? "bg-emerald-500" : "bg-zinc-300"
                }`}
              />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-tight text-zinc-900">
                {store.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-zinc-500">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate text-xs">{store.company_name ?? "—"}</span>
              </div>
            </div>
          </div>

          <span
            className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              backgroundColor: withAlpha(chainColor, "1a"),
              color: chainColor,
            }}
          >
            {chainName}
          </span>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-zinc-50/80 p-3">
          <Meta icon={<Hash className="h-3 w-3" />} label="Org.nr" value={store.org_number} mono />
          <Meta icon={<MapPin className="h-3 w-3" />} label="By" value={store.city} />
          <div className="col-span-2">
            <Meta icon={<Mail className="h-3 w-3" />} label="E-post" value={store.email} truncate />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="group/tag inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-1 text-xs font-medium text-zinc-700"
              style={{ backgroundColor: withAlpha(tag.color, "14") }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="max-w-[8rem] truncate">{tag.name}</span>
              <button
                type="button"
                onClick={() => onToggleTag(tag, false)}
                aria-label={`Fjern tag ${tag.name}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <TagPopover
            assigned={tags}
            allTags={allTags}
            open={tagOpen}
            onOpenChange={setTagOpen}
            onToggle={onToggleTag}
            onCreate={onCreateTag}
            onUpdate={onUpdateTag}
            onDelete={onDeleteTag}
          />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
            <Monitor className="h-3.5 w-3.5 text-zinc-400" />
            {store.screenCount} skjerm{store.screenCount !== 1 ? "er" : ""}
          </div>
          <Link
            href={`/admin/stores/${store.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Åpne
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Meta({
  icon,
  label,
  value,
  mono,
  truncate,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {icon}
        {label}
      </div>
      <p
        className={`mt-0.5 text-xs text-zinc-700 ${mono ? "font-mono" : ""} ${
          truncate ? "truncate" : ""
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  )
}
