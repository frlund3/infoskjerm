export interface ZoneDefinition {
  id: string
  x: number // 0-100 percentage
  y: number
  w: number
  h: number
  label: string
}

export interface PredefinedLayout {
  id: string
  name: string
  description: string
  zones: ZoneDefinition[]
}

export const PREDEFINED_LAYOUTS: PredefinedLayout[] = [
  {
    id: "fullscreen",
    name: "Fullskjerm",
    description: "Én sone dekker hele skjermen — enklest å bruke",
    zones: [{ id: "main", x: 0, y: 0, w: 100, h: 100, label: "Hoved" }],
  },
  {
    id: "split-right",
    name: "Hoved + sidepanel",
    description: "Stort innhold til venstre (70%), sidepanel til høyre (30%)",
    zones: [
      { id: "main", x: 0, y: 0, w: 70, h: 100, label: "Hoved" },
      { id: "sidebar", x: 70, y: 0, w: 30, h: 100, label: "Side" },
    ],
  },
  {
    id: "ticker",
    name: "Innhold + ticker",
    description: "Stort innhold øverst (80%), ticker-linje nederst (20%)",
    zones: [
      { id: "main", x: 0, y: 0, w: 100, h: 80, label: "Hoved" },
      { id: "ticker", x: 0, y: 80, w: 100, h: 20, label: "Ticker" },
    ],
  },
  {
    id: "grid-2",
    name: "To kolonner",
    description: "To like soner side ved side",
    zones: [
      { id: "left", x: 0, y: 0, w: 50, h: 100, label: "Venstre" },
      { id: "right", x: 50, y: 0, w: 50, h: 100, label: "Høyre" },
    ],
  },
  {
    id: "banner-top",
    name: "Toppbanner + innhold",
    description: "Logo/banner øverst (15%), innhold under (85%)",
    zones: [
      { id: "banner", x: 0, y: 0, w: 100, h: 15, label: "Banner" },
      { id: "main", x: 0, y: 15, w: 100, h: 85, label: "Hoved" },
    ],
  },
]
