"use client"

import { useDraggable } from "@dnd-kit/core"
import { motion } from "framer-motion"
import { formatModuleCategory, categoryOrder } from "@/lib/admin/modules"
import type { ModuleRow } from "@/lib/admin/modules"
import { Search } from "lucide-react"
import { useState } from "react"

interface ModulePaletteProps {
  modules: ModuleRow[]
}

function DraggableModuleItem({ mod }: { mod: ModuleRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${mod.key}`,
    data: { type: 'module', moduleKey: mod.key, moduleName: mod.name },
  })

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      whileHover={isDragging ? {} : { scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-2.5 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors ${
        isDragging ? 'opacity-30 scale-95' : 'hover:border-zinc-300 hover:shadow-sm'
      }`}
    >
      <span className="text-xs text-zinc-500 leading-tight font-medium">{mod.name}</span>
    </motion.div>
  )
}

export function ModulePalette({ modules }: ModulePaletteProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = modules.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !activeCategory || m.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categories = categoryOrder.filter((c) => modules.some((m) => m.category === c))

  return (
    <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-100">
      <div className="px-3 py-3 border-b border-zinc-100 bg-white">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Moduler</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Søk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-zinc-100 border border-zinc-200 rounded-lg pl-7 pr-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1 bg-white border-b border-zinc-100">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${!activeCategory ? 'border-zinc-600 bg-zinc-700 text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
        >
          Alle
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${activeCategory === cat ? 'border-zinc-600 bg-zinc-700 text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
          >
            {formatModuleCategory(cat)}
          </button>
        ))}
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-4">Ingen moduler funnet</p>
        )}
        {filtered.map((mod) => <DraggableModuleItem key={mod.key} mod={mod} />)}
      </div>

      <div className="px-3 py-2 border-t border-zinc-100 bg-white">
        <p className="text-[10px] text-zinc-400 text-center">Dra moduler inn i canvas →</p>
      </div>
    </div>
  )
}
