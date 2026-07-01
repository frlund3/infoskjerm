import { describe, it, expect } from 'vitest'
import { resolveEffectiveTenant, ACTIVE_TENANT_COOKIE } from './admin-context'

describe('resolveEffectiveTenant', () => {
  it('vanlig bruker bruker sin egen tenant og impersonerer ikke', () => {
    expect(resolveEffectiveTenant({
      role: 'store_manager', realTenantId: 't-real', cookieTenantId: 't-other', activeTenantValid: true,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('super_admin med gyldig cookie impersonerer den valgte tenanten', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: 't-x', activeTenantValid: true,
    })).toEqual({ effectiveTenantId: 't-x', isImpersonating: true })
  })

  it('super_admin med ugyldig/arkivert cookie faller tilbake til egen tenant', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: 't-gone', activeTenantValid: false,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('super_admin uten cookie impersonerer ikke', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: null, activeTenantValid: false,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('eksporterer cookie-navnet', () => {
    expect(ACTIVE_TENANT_COOKIE).toBe('sa_active_tenant')
  })
})
