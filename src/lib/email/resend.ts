import { Resend } from "resend"

// Avsender for system-e-post (invitasjon, passord-tilbakestilling).
// framtidtech.no er verifisert i Resend; kan overstyres via env uten kodeendring.
const FROM = process.env.RESEND_FROM_EMAIL ?? "Framtid Tech <noreply@framtidtech.no>"

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY mangler")
  return new Resend(key)
}

type InviteEmailArgs = {
  to: string
  link: string
  role: string
  storeNames: string[]
}

export async function sendInviteEmail({ to, link, role, storeNames }: InviteEmailArgs): Promise<void> {
  const access =
    storeNames.length > 0
      ? storeNames.join(", ")
      : "alle butikker"

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "Du er invitert til Infoskjerm",
    html: inviteHtml({ link, role, access }),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

type ResetEmailArgs = {
  to: string
  link: string
}

export async function sendPasswordResetEmail({ to, link }: ResetEmailArgs): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: "Tilbakestill passordet ditt — Infoskjerm",
    html: resetHtml({ link }),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

type EventSignupArgs = {
  to: string
  name: string
  eventTitle: string
  guests: number
}

export async function sendEventSignupConfirmation({ to, name, eventTitle, guests }: EventSignupArgs): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: `Påmelding bekreftet — ${eventTitle}`,
    html: signupHtml({ name, eventTitle, guests }),
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

const shell = (inner: string) => `
<!doctype html>
<html lang="no">
<body style="margin:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0;color:#10b981;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Infoskjerm</p>
        </td></tr>
        ${inner}
        <tr><td style="padding:8px 32px 32px;">
          <p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;">
            Får du ikke trykket på knappen? Kopier denne lenken inn i nettleseren.
          </p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#3f3f46;font-size:11px;">Levert av Framtid Tech · Infoskjerm-plattform</p>
    </td></tr>
  </table>
</body>
</html>`

const button = (link: string, label: string) => `
  <a href="${link}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">${label}</a>
  <p style="margin:14px 0 0;word-break:break-all;color:#71717a;font-size:12px;">${link}</p>
`

function inviteHtml({ link, role, access }: { link: string; role: string; access: string }): string {
  return shell(`
    <tr><td style="padding:8px 32px 0;">
      <h1 style="margin:0 0 12px;color:#fafafa;font-size:20px;font-weight:700;">Velkommen ombord</h1>
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:14px;line-height:1.6;">
        Du har fått tilgang til Infoskjerm-administrasjonen som <strong style="color:#fafafa;">${role}</strong>.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px;line-height:1.6;">
        Tilgang: <strong style="color:#fafafa;">${access}</strong>.
      </p>
      <p style="margin:0 0 18px;color:#a1a1aa;font-size:14px;line-height:1.6;">
        Trykk under for å sette passord og logge inn:
      </p>
      ${button(link, "Sett passord og logg inn")}
    </td></tr>
  `)
}

function resetHtml({ link }: { link: string }): string {
  return shell(`
    <tr><td style="padding:8px 32px 0;">
      <h1 style="margin:0 0 12px;color:#fafafa;font-size:20px;font-weight:700;">Tilbakestill passord</h1>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px;line-height:1.6;">
        Vi mottok en forespørsel om å tilbakestille passordet ditt. Trykk under for å velge et nytt.
        Hvis du ikke ba om dette, kan du se bort fra e-posten.
      </p>
      ${button(link, "Velg nytt passord")}
    </td></tr>
  `)
}

function signupHtml({ name, eventTitle, guests }: { name: string; eventTitle: string; guests: number }): string {
  const guestLine = guests > 0
    ? `<p style="margin:0 0 6px;color:#a1a1aa;font-size:14px;line-height:1.6;">Du har meldt på <strong style="color:#fafafa;">${guests}</strong> i følge.</p>`
    : ""
  return `
<!doctype html>
<html lang="no">
<body style="margin:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0;color:#f5c451;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">🎉 Påmelding bekreftet</p>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;">
          <h1 style="margin:0 0 12px;color:#fafafa;font-size:22px;font-weight:800;">${eventTitle}</h1>
          <p style="margin:0 0 6px;color:#a1a1aa;font-size:14px;line-height:1.6;">Hei ${name}, påmeldingen din er registrert. Vi gleder oss til å se deg!</p>
          ${guestLine}
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#3f3f46;font-size:11px;">Levert av Framtid Tech · Infoskjerm-plattform</p>
    </td></tr>
  </table>
</body>
</html>`
}
