import { requireRole } from "@/lib/admin/require-role"
import { xiboFetchBinary } from "@/lib/xibo/client"

/**
 * Proxies a display's latest screenshot from the Xibo engine. The browser can't
 * call Xibo directly (no token, engine not public), so this route fetches the
 * image server-side with the OAuth token and streams it back. 404 when the
 * player hasn't uploaded a screenshot yet.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export async function GET(_req: Request, { params }: { params: Promise<{ displayId: string }> }) {
  await requireRole([...VIEW_ROLES])

  const { displayId } = await params
  const id = Number(displayId)
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Ugyldig skjerm-id", { status: 400 })
  }

  const image = await xiboFetchBinary(`/display/screenshot/${id}`)
  if (!image) {
    return new Response("Ingen skjermbilde tilgjengelig ennå", { status: 404 })
  }

  return new Response(image.buffer, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "no-store",
    },
  })
}
