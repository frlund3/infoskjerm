"use client"

import { useState, useCallback, useEffect } from "react"
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import { FieldEditor } from "./field-editor"
import { BuilderPublishDialog } from "./builder-publish-dialog"
import { useAutosave } from "@/lib/builder/autosave"
import { createClient } from "@/lib/supabase/client"
import type { ModulePlacement, BuilderState, ModuleSchema } from "@/lib/builder/types"
import type { Json } from "@/types/database"
import type { ModuleRow } from "@/lib/admin/modules"
import {
  Save, CheckCircle, AlertCircle, Loader2, Eye, Plus,
  Trash2, GripVertical, ChevronLeft, Monitor, Settings,
  LayoutGrid, Search,
} from "lucide-react"
import { toast } from "sonner"

interface BuilderRootProps {
  modules: ModuleRow[]
  tenantId: string
  userId: string
  initialName?: string
  initialContentItemId?: string | null
  initialPlacements?: ModulePlacement[]
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function SaveStatusIndicator({ status }: { status: BuilderState['saveStatus'] }) {
  if (status === 'idle') return null
  return (
    <span className="flex items-center gap-1 text-xs">
      {status === 'saving' && <><Loader2 className="w-3 h-3 animate-spin text-zinc-400" /><span className="text-zinc-400">Lagrer...</span></>}
      {status === 'saved' && <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Lagret</span></>}
      {status === 'error' && <><AlertCircle className="w-3 h-3 text-red-500" /><span className="text-red-600">Feil</span></>}
    </span>
  )
}

// Slide thumbnail in the bottom strip
function SlideThumbnail({
  placement, index, isSelected, onSelect, onRemove,
}: {
  placement: ModulePlacement
  index: number
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: placement.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex-shrink-0 w-32 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isSelected ? 'border-[var(--brand-primary)] shadow-md' : 'border-zinc-200 hover:border-zinc-400'
      }`}
      onClick={onSelect}
    >
      {/* Aspect ratio box */}
      <div className="aspect-video bg-zinc-900 overflow-hidden">
        <div className="scale-[0.15] origin-top-left w-[667%] h-[667%] pointer-events-none">
          <ModuleRenderer moduleKey={placement.moduleKey} fields={placement.fields} />
        </div>
      </div>
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
        <p className="text-white text-[9px] font-medium truncate">{placement.moduleName}</p>
        <p className="text-white/50 text-[8px]">{placement.durationSeconds}s</p>
      </div>
      {/* Index badge */}
      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
        isSelected ? 'bg-[var(--brand-primary)] text-white' : 'bg-black/50 text-white'
      }`}>
        {index + 1}
      </div>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1 right-6 opacity-0 group-hover:opacity-100 p-0.5 bg-black/50 rounded text-white cursor-grab"
      >
        <GripVertical className="w-2.5 h-2.5" />
      </button>
      {/* Remove */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-black/50 rounded text-white hover:text-red-400"
      >
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

// Left panel: either module picker or field editor
function LeftPanel({
  modules,
  selectedPlacement,
  selectedModuleSchema,
  onAddModule,
  onUpdateField,
  onUpdateDuration,
  onCloseEditor,
  onRemovePlacement,
}: {
  modules: ModuleRow[]
  selectedPlacement: ModulePlacement | null
  selectedModuleSchema: ModuleSchema | null
  onAddModule: (mod: ModuleRow) => void
  onUpdateField: (key: string, value: unknown) => void
  onUpdateDuration: (seconds: number) => void
  onCloseEditor: () => void
  onRemovePlacement: () => void
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'modules' | 'edit'>('modules')

  useEffect(() => {
    if (selectedPlacement) setTab('edit')
    else setTab('modules')
  }, [selectedPlacement?.id])

  const filtered = modules.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-white border-r border-zinc-100">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        <button
          onClick={() => setTab('modules')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
            tab === 'modules' ? 'text-zinc-900 border-b-2 border-zinc-900 -mb-px' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Moduler
        </button>
        <button
          onClick={() => setTab('edit')}
          disabled={!selectedPlacement}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors disabled:opacity-30 ${
            tab === 'edit' ? 'text-zinc-900 border-b-2 border-zinc-900 -mb-px' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Egenskaper
          {selectedPlacement && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
          )}
        </button>
      </div>

      {tab === 'modules' && (
        <>
          <div className="px-3 py-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Søk modul..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-6">Ingen moduler</p>
            )}
            {filtered.map((mod) => (
              <button
                key={mod.key}
                onClick={() => onAddModule(mod)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-200 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 truncate">{mod.name}</p>
                  {mod.description && (
                    <p className="text-[10px] text-zinc-400 truncate">{mod.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-zinc-100 bg-zinc-50">
            <p className="text-[10px] text-zinc-400 text-center">Klikk for å legge til på slide</p>
          </div>
        </>
      )}

      {tab === 'edit' && selectedPlacement && (
        <div className="flex-1 overflow-hidden">
          <FieldEditor
            placement={selectedPlacement}
            schema={selectedModuleSchema}
            onUpdateField={onUpdateField}
            onUpdateDuration={onUpdateDuration}
            onClose={onCloseEditor}
            onRemove={onRemovePlacement}
          />
        </div>
      )}

      {tab === 'edit' && !selectedPlacement && (
        <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 px-4 text-center gap-3">
          <Settings className="w-8 h-8 opacity-30" />
          <p className="text-sm">Velg en slide i bunnen for å redigere egenskapene</p>
        </div>
      )}
    </div>
  )
}

export function BuilderRoot({
  modules, tenantId, userId,
  initialName = 'Nytt innhold',
  initialContentItemId = null,
  initialPlacements = [],
}: BuilderRootProps) {
  const supabase = createClient()

  const [state, setState] = useState<BuilderState>({
    contentItemId: initialContentItemId,
    name: initialName,
    placements: initialPlacements,
    selectedId: initialPlacements.length > 0 ? initialPlacements[0].id : null,
    saveStatus: 'idle',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleSaved = useCallback((id: string) => {
    setState((prev) => ({ ...prev, contentItemId: id }))
  }, [])

  const handleStatus = useCallback((status: BuilderState['saveStatus']) => {
    setState((prev) => ({ ...prev, saveStatus: status }))
  }, [])

  useAutosave(supabase, state.name, state.placements, tenantId, userId, state.contentItemId, handleSaved, handleStatus)

  const selectedPlacement = state.placements.find((p) => p.id === state.selectedId) ?? null

  const selectedModuleSchema: ModuleSchema | null = (() => {
    if (!selectedPlacement) return null
    const mod = modules.find((m) => m.key === selectedPlacement.moduleKey)
    if (!mod) return null
    try { return (mod.schema as unknown as ModuleSchema) } catch { return null }
  })()

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setState((prev) => {
      const oldIndex = prev.placements.findIndex((p) => p.id === String(active.id))
      const newIndex = prev.placements.findIndex((p) => p.id === String(over.id))
      if (oldIndex === -1 || newIndex === -1) return prev
      return { ...prev, placements: arrayMove(prev.placements, oldIndex, newIndex) }
    })
  }

  function addModule(mod: ModuleRow) {
    const newPlacement: ModulePlacement = {
      id: genId(),
      moduleKey: mod.key,
      moduleName: mod.name,
      fields: {},
      durationSeconds: 10,
    }
    setState((prev) => ({
      ...prev,
      placements: [...prev.placements, newPlacement],
      selectedId: newPlacement.id,
    }))
  }

  function updateField(key: string, value: unknown) {
    if (!state.selectedId) return
    setState((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === prev.selectedId ? { ...p, fields: { ...p.fields, [key]: value } } : p
      ),
    }))
  }

  function updateDuration(seconds: number) {
    if (!state.selectedId) return
    setState((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === prev.selectedId ? { ...p, durationSeconds: seconds } : p
      ),
    }))
  }

  function removePlacement(id: string) {
    setState((prev) => {
      const remaining = prev.placements.filter((p) => p.id !== id)
      return {
        ...prev,
        placements: remaining,
        selectedId: prev.selectedId === id ? (remaining[0]?.id ?? null) : prev.selectedId,
      }
    })
  }

  const handleManualSave = async () => {
    handleStatus('saving')
    try {
      const body = JSON.parse(JSON.stringify({ builder_v1: { placements: state.placements } })) as Json
      if (state.contentItemId) {
        await supabase
          .from('content_items')
          .update({ title: state.name, body, updated_at: new Date().toISOString() })
          .eq('id', state.contentItemId)
      } else {
        const { data } = await supabase
          .from('content_items')
          .insert({ title: state.name, body, type: 'slide', status: 'draft', tenant_id: tenantId, created_by: userId })
          .select('id')
          .single()
        if (data) handleSaved(data.id)
      }
      handleStatus('saved')
      toast.success('Lagret')
    } catch {
      handleStatus('error')
      toast.error('Feil ved lagring')
    }
  }

  const currentPlacement = state.placements.length > 0
    ? (state.placements.find(p => p.id === state.selectedId) ?? state.placements[0])
    : null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-zinc-200 flex-shrink-0 shadow-sm">
        <a href="/admin/content" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </a>
        <input
          type="text"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          className="text-sm font-semibold text-zinc-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-zinc-200 rounded px-2 py-1 min-w-[180px] max-w-xs"
          placeholder="Navn på innholdet..."
        />
        <div className="flex items-center gap-2 ml-auto">
          <SaveStatusIndicator status={state.saveStatus} />
          {state.contentItemId && (
            <a
              href={`/preview/${state.contentItemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Fullskjerm
            </a>
          )}
          <BuilderPublishDialog
            contentItemId={state.contentItemId}
            onSaveFirst={handleManualSave}
            onPublished={() => {}}
          />
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Save className="w-3.5 h-3.5" />
            Lagre
          </button>
        </div>
      </div>

      {/* Main layout: left panel + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Modules + Field editor */}
        <div className="w-72 flex-shrink-0 h-full overflow-hidden">
          <LeftPanel
            modules={modules}
            selectedPlacement={selectedPlacement}
            selectedModuleSchema={selectedModuleSchema}
            onAddModule={addModule}
            onUpdateField={updateField}
            onUpdateDuration={updateDuration}
            onCloseEditor={() => setState(prev => ({ ...prev, selectedId: null }))}
            onRemovePlacement={() => selectedPlacement && removePlacement(selectedPlacement.id)}
          />
        </div>

        {/* Right: Preview + slide strip */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TV preview - center of attention */}
          <div className="flex-1 flex items-center justify-center bg-zinc-800 p-6 overflow-hidden">
            <div className="w-full" style={{ maxWidth: 'calc((100vh - 160px) * (16/9))' }}>
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative">
                {state.placements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4">
                    <Monitor className="w-12 h-12 opacity-30" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Tomt lerret</p>
                      <p className="text-xs text-zinc-700 mt-1">Klikk en modul i venstre panel for å legge til</p>
                    </div>
                  </div>
                ) : currentPlacement ? (
                  <ModuleRenderer
                    moduleKey={currentPlacement.moduleKey}
                    fields={currentPlacement.fields}
                  />
                ) : null}

                {/* Slide counter */}
                {state.placements.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {(state.placements.findIndex(p => p.id === state.selectedId) + 1) || 1} / {state.placements.length}
                  </div>
                )}
              </div>
              {currentPlacement && (
                <p className="text-center text-zinc-500 text-[11px] mt-2">
                  Viser slide {(state.placements.findIndex(p => p.id === state.selectedId) + 1) || 1} · {currentPlacement.durationSeconds}s visning · 16:9 skjermformat
                </p>
              )}
            </div>
          </div>

          {/* Bottom: slide strip */}
          <div className="bg-zinc-900 border-t border-zinc-700 px-4 py-3 flex-shrink-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={state.placements.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {state.placements.length === 0 && (
                    <div className="flex items-center gap-2 text-zinc-600">
                      <p className="text-xs">Ingen slides ennå — klikk en modul til venstre for å begynne</p>
                    </div>
                  )}
                  {state.placements.map((p, i) => (
                    <SlideThumbnail
                      key={p.id}
                      placement={p}
                      index={i}
                      isSelected={state.selectedId === p.id}
                      onSelect={() => setState(prev => ({ ...prev, selectedId: p.id }))}
                      onRemove={() => removePlacement(p.id)}
                    />
                  ))}
                  {/* Add new slide button */}
                  <button
                    onClick={() => setState(prev => ({ ...prev, selectedId: null }))}
                    className="flex-shrink-0 w-32 aspect-video border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Ny slide</span>
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  )
}
