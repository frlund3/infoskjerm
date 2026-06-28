import { describe, it, expect } from 'vitest'
import { formatModuleCategory, groupModulesByCategory } from './modules'

describe('formatModuleCategory', () => {
  it('formatter intern_info korrekt', () => {
    expect(formatModuleCategory('intern_info')).toBe('Intern info')
  })

  it('formatter salg_tilbud korrekt', () => {
    expect(formatModuleCategory('salg_tilbud')).toBe('Salg & tilbud')
  })

  it('formatter informasjon korrekt', () => {
    expect(formatModuleCategory('informasjon')).toBe('Informasjon')
  })

  it('formatter media korrekt', () => {
    expect(formatModuleCategory('media')).toBe('Media')
  })

  it('returnerer raw-verdi for ukjente kategorier', () => {
    expect(formatModuleCategory('ukjent')).toBe('ukjent')
  })
})

describe('groupModulesByCategory', () => {
  const mockModules = [
    { key: 'a', category: 'intern_info', name: 'A', description: null, icon: 'box', is_active: true, id: '1', created_at: null, schema: {} },
    { key: 'b', category: 'media', name: 'B', description: null, icon: 'box', is_active: true, id: '2', created_at: null, schema: {} },
    { key: 'c', category: 'intern_info', name: 'C', description: null, icon: 'box', is_active: false, id: '3', created_at: null, schema: {} },
  ]

  it('grupperer moduler på riktig kategori', () => {
    const groups = groupModulesByCategory(mockModules)
    expect(groups['intern_info']).toHaveLength(2)
    expect(groups['media']).toHaveLength(1)
  })

  it('filtrerer bort inaktive moduler når active-only er true', () => {
    const groups = groupModulesByCategory(mockModules, true)
    expect(groups['intern_info']).toHaveLength(1)
  })
})
