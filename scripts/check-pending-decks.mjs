/**
 * Lettvekts forsjekk for render-decks-workflowen: teller live PowerPoint-slides
 * som mangler ferdige sidebilder (pages tom, eller rendret fra en annen fil).
 * Kun Node-innebygde moduler → ingen npm install → nesten gratis å polle ofte.
 * Skriver "pending=<N>" til GITHUB_OUTPUT så workflowen kun kjører den tunge
 * LibreOffice-renderingen når det faktisk finnes et deck å gjøre.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, appendFileSync } from "node:fs"

function env(key) {
  if (process.env[key]) return process.env[key]
  try {
    const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined
  } catch {
    return undefined
  }
}

const SB = env("NEXT_PUBLIC_SUPABASE_URL")
const KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if (!SB || !KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const items = await (
  await fetch(`${SB}/rest/v1/content_items?select=id,body&type=eq.slide&status=eq.live&limit=500`, { headers: H })
).json()

const pending = (items || []).filter((x) => {
  const u = String(x.body?.imageUrl || "").toLowerCase().split("?")[0]
  if (!(u.endsWith(".pptx") || u.endsWith(".ppt"))) return false
  const havePages = Array.isArray(x.body?.pages) && x.body.pages.length > 0
  return !havePages || x.body?.pagesFor !== x.body?.imageUrl
}).length

console.log(`Ventende PowerPoint-decks: ${pending}`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pending}\n`)
