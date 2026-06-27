"use client"

import { useState } from "react"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, Tag, Store, Building2, Monitor, ChevronRight, CheckCircle2 } from "lucide-react"

const chains = ["EUROSPAR", "JOKER", "SPAR"]
const tags = ["SUNNMØRE", "NORDFJORD", "STORBY", "ØYBUTIKK", "ØRSTA-VOLDA"]
const stores = [
  "EUROSPAR BLINDHEIM", "EUROSPAR HAREID", "EUROSPAR LARSGÅRDEN",
  "EUROSPAR MOA", "EUROSPAR ÅLESUND STORSENTER", "EUROSPAR ØRSTA",
  "JOKER GODØY", "JOKER ÅHEIM",
  "SPAR ELLINGSØY", "SPAR HORNINDAL", "SPAR LANGEVÅG",
  "SPAR RAUDEBERG", "SPAR STRAUMANE", "SPAR TRESFJORD",
  "SPAR ULSTEINVIK", "SPAR FISKÅ",
]

const chainColors: Record<string, string> = {
  EUROSPAR: "#E30613",
  JOKER: "#F7A600",
  SPAR: "#007B40",
}

type TargetMode = "all" | "chains" | "tags" | "stores"

export default function PublishPage() {
  const [targetMode, setTargetMode] = useState<TargetMode>("all")
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [step, setStep] = useState(1)

  const toggle = <T,>(arr: T[], setArr: (a: T[]) => void, item: T) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item])
  }

  const targetCount =
    targetMode === "all" ? 16 :
    targetMode === "chains" ? selectedChains.length * 5 :
    targetMode === "tags" ? selectedTags.length * 3 :
    selectedStores.length

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Publiser innhold" subtitle="Velg mottakere og innhold" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {["Velg mottakere", "Velg innhold", "Bekreft"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === i + 1 ? "bg-zinc-900 text-white" : step > i + 1 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>
                  {step > i + 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 text-center">{i + 1}</span>}
                  {s}
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Hvem skal se dette innholdet?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target mode selection */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { mode: "all" as TargetMode, icon: Globe, label: "Alle butikker", sub: "16 butikker" },
                    { mode: "chains" as TargetMode, icon: Building2, label: "Kjeder", sub: "EUROSPAR, JOKER, SPAR" },
                    { mode: "tags" as TargetMode, icon: Tag, label: "Tags", sub: "Geografiske grupper" },
                    { mode: "stores" as TargetMode, icon: Store, label: "Enkeltbutikker", sub: "Velg spesifikke" },
                  ].map(({ mode, icon: Icon, label, sub }) => (
                    <button
                      key={mode}
                      onClick={() => setTargetMode(mode)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${targetMode === mode ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${targetMode === mode ? "text-white" : "text-zinc-500"}`} />
                      <p className={`text-sm font-semibold ${targetMode === mode ? "text-white" : "text-zinc-900"}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${targetMode === mode ? "text-zinc-300" : "text-zinc-400"}`}>{sub}</p>
                    </button>
                  ))}
                </div>

                {/* Chain selector */}
                {targetMode === "chains" && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-3">Velg kjede(r)</p>
                    <div className="flex gap-3">
                      {chains.map((chain) => (
                        <button
                          key={chain}
                          onClick={() => toggle(selectedChains, setSelectedChains, chain)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${selectedChains.includes(chain) ? "border-transparent text-white" : "border-zinc-200 text-zinc-700 bg-white"}`}
                          style={selectedChains.includes(chain) ? { backgroundColor: chainColors[chain], borderColor: chainColors[chain] } : {}}
                        >
                          {selectedChains.includes(chain) && <CheckCircle2 className="w-4 h-4" />}
                          {chain}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag selector */}
                {targetMode === "tags" && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-3">Velg tag(s)</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggle(selectedTags, setSelectedTags, tag)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedTags.includes(tag) ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-200 text-zinc-700 bg-white hover:border-zinc-300"}`}
                        >
                          {selectedTags.includes(tag) && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <Tag className="w-3.5 h-3.5" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Store selector */}
                {targetMode === "stores" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-zinc-700">Velg butikker</p>
                      <button
                        onClick={() => setSelectedStores(selectedStores.length === stores.length ? [] : stores)}
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        {selectedStores.length === stores.length ? "Fjern alle" : "Velg alle"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {stores.map((store) => {
                        const chain = store.startsWith("EUROSPAR") ? "EUROSPAR" : store.startsWith("JOKER") ? "JOKER" : "SPAR"
                        return (
                          <button
                            key={store}
                            onClick={() => toggle(selectedStores, setSelectedStores, store)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${selectedStores.includes(store) ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-200 bg-white"}`}
                          >
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: chainColors[chain] }} />
                            <span className="text-sm text-zinc-800 flex-1">{store}</span>
                            {selectedStores.includes(store) && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Summary & next */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-zinc-400" />
                    <p className="text-sm text-zinc-600">
                      Sender til ca. <span className="font-bold text-zinc-900">{targetMode === "all" ? 16 : targetCount}</span> skjermer
                    </p>
                  </div>
                  <Button onClick={() => setStep(2)} disabled={targetMode !== "all" && targetCount === 0}>
                    Neste: Velg innhold <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Velg innhold som skal publiseres</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 mb-4">Kommer her — kobling mot innholdsmoduler</p>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Tilbake</Button>
                  <Button onClick={() => setStep(3)}>Neste: Bekreft</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Bekreft publisering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 mb-6">Dette vil publisere valgt innhold til valgte mottakere umiddelbart.</p>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>Tilbake</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Globe className="w-4 h-4" />
                    Publiser nå
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
