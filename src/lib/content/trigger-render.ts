import "server-only"

/**
 * Ber GitHub Action-en «Render decks» kjøre NÅ (i stedet for å vente på daglig
 * cron), slik at et nettopp publisert deck (PowerPoint/PDF) blir rendret til
 * sidebilder innen ~1–2 min. Best-effort: mangler token eller feiler kallet,
 * faller vi stille tilbake på den daglige cron-jobben — dette skal ALDRI blokkere
 * en lagring.
 *
 * Krever secret GH_DISPATCH_TOKEN (fine-grained PAT med Actions: read/write på
 * repoet). Repo kan overstyres med GH_DISPATCH_REPO (default = prod-repoet).
 */
const DEFAULT_REPO = "Framtidmedia-no/infoskjerm"

export async function triggerDeckRender(): Promise<void> {
  const token = process.env.GH_DISPATCH_TOKEN
  if (!token) return // ingen token → daglig cron tar det

  const repo = process.env.GH_DISPATCH_REPO || DEFAULT_REPO
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "render-decks" }),
    })
    if (!res.ok) {
      console.error(`[trigger-render] dispatch feilet ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.error("[trigger-render] dispatch-feil (faller tilbake på cron):", err)
  }
}
