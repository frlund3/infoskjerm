import { ModuleToggle } from "./module-toggle"

interface ModuleCardProps {
  moduleKey: string
  name: string
  description: string | null
  isEnabled: boolean
  tenantId: string
  userId: string
  isAdmin: boolean
}

export function ModuleCard({
  moduleKey, name, description, isEnabled, tenantId, userId, isAdmin,
}: ModuleCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${
      isEnabled ? "border-zinc-200 shadow-sm" : "border-zinc-100 opacity-60"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${isEnabled ? "text-zinc-900" : "text-zinc-400"}`}>
            {name}
          </p>
          {isAdmin && (
            <ModuleToggle
              moduleKey={moduleKey}
              tenantId={tenantId}
              userId={userId}
              initialEnabled={isEnabled}
            />
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        )}
        <p className={`text-[10px] font-mono mt-2 px-1.5 py-0.5 rounded inline-block ${
          isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
        }`}>
          {moduleKey}
        </p>
      </div>
    </div>
  )
}
