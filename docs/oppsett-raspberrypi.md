# Oppsett av Raspberry Pi-spiller (Gange-Rolv infoskjerm)

Steg-for-steg for å sette opp en Raspberry Pi som Xibo-spiller mot
`https://xibo.framtidtech.no`. Følg dette per butikk. Dette er «golden image»-
oppskriften vi gjentar for alle 16 butikkene. **Hele flyten er verifisert
ende-til-ende på `gr-eurospar-moa1` (kundeskjerm) 2026-06-30.**

> 🔐 **Hemmeligheter:** ikke skriv faktiske passord inn i denne fila (den er i
> git). Login-/WiFi-/DB-passord oppbevares utenfor repo (passordhvelv / `.env.local` /
> `/opt/xibo/config.env` på serveren).

> 🤖 **Claude jobber direkte.** Det er lagt inn passordløs SSH-nøkkel på Pi-ene
> (`ssh frlund3@<ip>`) og Claude har **root på Xibo-serveren** (`ssh root@157.180.73.205`).
> Claude SSH-er inn og gjør alt selv — brukeren trenger bare fysisk håndtering
> (sette i kort, koble skjerm/strøm) og den ENE browser-bekreftelsen i Connect (steg 7).

---

## ⚠️ ENGANGS CMS-FORUTSETNING: XMR Public Address (✅ gjort 2026-06-30)

**Uten dette starter INGEN player.** Arexibo henter XMR-adressen (push-kanalen) fra
CMS-en ved registrering. Fersk Xibo-install har placeholderen `tcp://cms.example.org:9505`
→ players kveler seg på `No address associated with hostname` og avslutter umiddelbart.

Fikset i CMS-databasen (gjelder alle players, trenger IKKE gjentas per Pi):

```bash
ssh root@157.180.73.205
PW=$(grep -E '^MYSQL_PASSWORD=' /opt/xibo/config.env | cut -d= -f2-)
docker exec xibo-cms-db-1 mysql -ucms -p"$PW" cms \
  -e "UPDATE setting SET value='tcp://xibo.framtidtech.no:9505' WHERE setting='XMR_PUB_ADDRESS';"
docker exec xibo-cms-memcached-1 sh -c 'echo flush_all | nc -w1 localhost 11211'
```

- Verifiser: `SELECT setting,value FROM setting WHERE setting LIKE '%XMR%';`
  → `XMR_PUB_ADDRESS` skal være `tcp://xibo.framtidtech.no:9505`.
- Port **9505** må være åpen utenfra (er det — testet). `XMR_ADDRESS=http://cms-xmr:8081`
  er den interne CMS→XMR og skal stå som den er.

---

## ✅ Standard sjekkliste per Pi (ingen hoppes over)

Gå gjennom ALLE for hver skjerm — også de det er lett å glemme (markert ⚠️):

- [ ] **1.** Skriv minnekort (hostnavn `gr-<butikk><nr>`, land `NO`, SSH, WiFi)
- [ ] **2.** På nett + SSH inn (Claude legger inn nøkkel for passordløs aksess)
- [ ] **3.** ⚠️ **WiFi tilkoblet** (`nmcli device status` → `wlan0 connected`)
- [ ] **4.** Arexibo bygd + installert
- [ ] **5.** ⚠️ **Skjerm-avhengigheter:** `xinit` + **emoji-font** (ellers tofu-bokser □)
- [ ] **6.** Autorisert + tilordnet riktig Xibo-gruppe (Claude via API)
- [ ] **7.** ⚠️ **Auto-start (systemd kiosk)** — booter rett inn i spilleren, riktig rotasjon
- [ ] **8.** ⚠️ **Raspberry Pi Connect innmeldt** (`rpi-connect signin` + linger) — *lett å glemme!*
- [ ] **9.** Verifisert på fysisk skjerm (riktig layout, orientering, emojis i farger)

> 🔁 **Claude:** påminn ALLTID om steg 7 + 8 før en Pi regnes som ferdig — de er
> de vi har glemt før.

---

## 1. Skriv minnekortet (Raspberry Pi Imager)

1. Last ned **Raspberry Pi Imager** fra raspberrypi.com/software.
2. **Choose OS:** `Raspberry Pi OS (64-bit)` — *Desktop* (vi trenger X/webview). Nyeste er Debian 13 (trixie).
3. **Choose Storage:** SD-kortet.
4. **Edit Settings** (tannhjul) — VIKTIG:
   - **Hostname:** `gr-<butikk><nr>` — f.eks. `gr-eurospar-moa1` (kunde), `gr-eurospar-moa2` (bakrom).
   - **Enable SSH** + brukernavn `frlund3` + passord (se hvelv).
   - **Wireless LAN country:** `NO` (Norge) — ⚠️ **uten denne starter ikke WiFi-radioen.**
   - **WiFi:** SSID + passord. *Under vårt oppsett:* vårt eget nett. *Ved utplassering i butikk:* `kundenett` (se under).
   - **Locale:** tidssone `Europe/Oslo`, tastatur `no`.
   - **Raspberry Pi Connect:** kan stå AV (vi melder inn via SSH i steg 8).
5. **Write** → sett kortet i Pi-en → strøm på.

> 🏪 **WiFi i butikk = `kundenett`.** Vi setter opp og verifiserer på vårt eget nett
> først. Rett før en Pi settes LIVE i butikken byttes WiFi til butikkens `kundenett`
> (samme `nmcli`-kommando som steg 3, bare nytt SSID/passord).

## 2. Få Pi-en på nett + SSH inn

- **Enklest = ethernet-kabel** (Pi → ruter). Da får den IP umiddelbart, uten WiFi-trøbbel.
- Finn IP-en i **ruterens enhetsliste** (se etter hostnavnet), eller prøv `<hostname>.local`.
- Claude legger inn passordløs nøkkel én gang (`ssh-copy-id`), deretter `ssh frlund3@<ip>` uten passord.
- Inne når du ser: `frlund3@gr-<butikk>:~ $`

### Vanlige fallgruver
- **SSH «henger»** = Pi-en er ikke nåbar → ikke på nett ennå, eller Mac og Pi på **ulike subnett**. Fix: samme ruter, eller ethernet.
- **`<hostname>` med vinkelparenteser** i terminal gir `zsh: no such file or directory` — skriv det faktiske navnet uten `< >`.
- **WiFi kobler ikke til** = nesten alltid manglende land-kode (se steg 3).

## 3. Sett opp / fiks WiFi (via SSH)

Pi OS bruker NetworkManager:
```bash
sudo raspi-config nonint do_wifi_country NO
sudo rfkill unblock wifi
sudo nmcli device wifi connect "<SSID>" password "<wifi-passord>"
nmcli device status        # wlan0 skal vise: connected
```
La gjerne ethernet stå i under oppsett — du mister ikke SSH. Ved go-live: kjør samme
kommando med `kundenett` + butikkens passord, og trekk ut ethernet.

## 4. Installer Xibo-spiller (Arexibo) — bygg fra kilde

For Pi + CMS 4.x er **Arexibo** (Rust-basert Xibo-spiller, QtWebEngine) riktig valg.
Vi bygger fra kilde. Verifisert på Pi 4 Model B (Debian 13 trixie).

```bash
# 1) Bygge-avhengigheter
sudo apt update
sudo apt install -y git cmake g++ cargo pkg-config libdbus-1-dev libzmq3-dev qt6-webengine-dev libudev-dev

# 2) Rust ≥ 1.75 kreves
cargo --version   # < 1.75? curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y ; . "$HOME/.cargo/env"

# 3) Hent + bygg (~7–8 min på Pi 4)
cd ~ && git clone https://github.com/birkenfeld/arexibo.git && cd arexibo
cargo build --release

# 4) Installer binæren
sudo cp target/release/arexibo /usr/bin/arexibo
arexibo --help | head -3
```
*(Husk `libudev-dev` i steg 1, ellers feiler `libudev-sys`.)*

**Konfigurer spilleren (registrer mot CMS):**
```bash
mkdir -p ~/xibo
arexibo --host https://xibo.framtidtech.no/ --key <CMS-nøkkel> ~/xibo
```
- `<CMS-nøkkel>` = **CMS Secret Key** (Xibo → Administration → Settings → Displays). Per 2026-06: `r0uj9yS6`.
- Skriver `display is not authorized yet ...` og avslutter — **riktig**. Registreringen ligger nå i `~/xibo/cms.json`.

## 5. Skjerm-avhengigheter (X + emoji-font)

Kiosken kjører en egen X-server (steg 7). Den trenger `xinit`, og innholdet bruker
**emojis** — uten emoji-font blir de til tomme «tofu»-bokser (□). Begge MÅ installeres:

```bash
sudo apt install -y xinit x11-xserver-utils fonts-noto-color-emoji fonts-noto-core
sudo fc-cache -f
fc-list | grep -i emoji      # skal vise NotoColorEmoji.ttf
```

## 6. Autoriser + tilordne i Xibo (Claude via API)

Etter registrering dukker Pi-en opp som **uautorisert Display** (`licensed: 0`,
navn = hostnavnet). Claude gjør resten via Xibo-API-et (`scripts/xibo/lib.mjs` →
`loadEnv()` + `getToken(env)` + `makeApi(env, token)`, kjøres fra repo-rot):

```js
const env = loadEnv(); const api = makeApi(env, await getToken(env))
await api(`/display?length=500`)                          // finn display-id (licensed:0)
await api(`/display/authorise/<id>`, { method: "PUT" })   // autoriser
const gid = await findDisplayGroupId(api, "<gruppenavn>") // finn gruppe
await api(`/displaygroup/${gid}/display/assign`, { method: "POST", form: { "displayId[]": [<id>] } })
```

**Skjermgruppe per rolle (finnes allerede):**
- **Kundeskjerm:** gruppe = **butikknavnet eksakt**, f.eks. `EUROSPAR MOA` (id 9)
- **Bakrom/intern:** `EUROSPAR MOA – Bakrom` (id 25)
- **Avdelingsskjerm** (valgfritt): `EUROSPAR MOA – <Avdeling>` (se 6.1)

### 6.1 Kundeskjerm: hele butikken vs. én avdeling

Pi-en vet ingenting om avdelinger — det styres 100 % av **hvilken Xibo-gruppe** den er
tilordnet, og hvilken `&avdeling=`-param gruppas layout embedder. I appen har hvert
kundeinnhold et `avdeling`-felt (`felles`, `frukt`, `ferskvare`, `frys`, `bakeri`,
`kjott-fisk`, `kasse`, `inngang`).

| Type | Xibo-gruppe | Layout embedder | Viser |
|------|-------------|-----------------|-------|
| **Hele butikken** | `EUROSPAR MOA` (id 9) | `/widget/tilbud?store=X` | alle kundetilbud |
| **Avdeling** | `EUROSPAR MOA – Frukt & grønt` | `/widget/tilbud?store=X&avdeling=frukt` | kun frukt + felles |

Gjøre om til avdelingsskjerm: `node scripts/xibo/build-avdeling-screen.mjs "EUROSPAR MOA" frukt`,
deretter flytt Pi-en til den nye gruppa. `gr-eurospar-moa1` står nå på id 9 → **hele butikken**.

## 7. Auto-start (systemd kiosk) — VERIFISERT OPPSKRIFT

Målet: Pi-en booter **rett inn i spilleren** i fullskjerm, riktig rotert, og
restarter seg selv ved kræsj/strømbrudd. Arexibo er en QtWebEngine-app som må kjøre
i en X-sesjon. Vi kjører en **egen, ren X-server med kun arexibo** (ingen skrivebord).

**Tre fallgruver vi løste (ikke endre uten å forstå hvorfor):**
1. En systemd-tjeneste som `User=frlund3` eier ingen virtuell konsoll → X feiler med
   `xf86OpenConsole: Cannot open virtual console 2 (Permission denied)`.
   **Fix:** `PAMName=login` + `TTYPath` (logind lager en ekte sesjon som eier VT-en) + `-keeptty` (X gjenbruker den TTY-en).
2. Wayland-skrivebordet okkuperer skjermen → boot til **konsoll** (`do_boot_behaviour B1`).
3. X må få startes av brukeren → `/etc/X11/Xwrapper.config: allowed_users=anybody`.

```bash
# a) Tillat at X startes av tjenesten
printf 'allowed_users=anybody\nneeds_root_rights=yes\n' | sudo tee /etc/X11/Xwrapper.config

# b) Boot til konsoll (ikke skrivebord)
sudo raspi-config nonint do_boot_behaviour B1

# c) Rotasjon per rolle (kundeskjerm=portrett, bakrom=liggende)
echo right > ~/.kiosk-rotate        # kunde: right (portrett). bakrom: echo normal. opp-ned: left.

# d) Kiosk-launcher: roter, så start arexibo
cat > ~/kiosk.sh <<'SH'
#!/bin/sh
ROT=$(cat /home/frlund3/.kiosk-rotate 2>/dev/null || echo normal)
xrandr -o "$ROT" 2>/dev/null || true
exec /usr/bin/arexibo /home/frlund3/xibo
SH
chmod +x ~/kiosk.sh

# e) systemd-tjeneste
sudo tee /etc/systemd/system/arexibo.service >/dev/null <<'UNIT'
[Unit]
Description=Arexibo Xibo-spiller (kiosk)
After=systemd-user-sessions.service network-online.target getty@tty2.service
Wants=network-online.target
Conflicts=getty@tty2.service

[Service]
Type=simple
User=frlund3
PAMName=login
TTYPath=/dev/tty2
TTYReset=yes
TTYVHangup=yes
StandardInput=tty
StandardOutput=journal
StandardError=journal
UtmpIdentifier=tty2
UtmpMode=user
ExecStart=/usr/bin/xinit /home/frlund3/kiosk.sh -- :0 vt2 -keeptty -nolisten tcp -s 0 -dpms
Restart=always
RestartSec=10
Environment=NO_AT_BRIDGE=1

[Install]
WantedBy=multi-user.target
UNIT

# f) aktiver + reboot
sudo systemctl daemon-reload && sudo systemctl enable arexibo.service && sudo reboot
```

**Verifiser etter boot:**
```bash
systemctl is-active arexibo                                   # active
systemctl show arexibo -p NRestarts --value                  # 0 (stabil, ikke loop)
journalctl -u arexibo -b | grep -iE "collection successful|showing layout"
```
Skjermen skal vise riktig layout i fullskjerm. Feilsøke? Kjør med debug:
`arexibo --debug ~/xibo` via wrapper, eller se **Feilsøking** under.

## 8. Raspberry Pi Connect — fjernaksess «uansett hvor den er» (⚠️ obligatorisk)

Connect lar oss nå Pi-en (remote shell + skjerm) fra hvilken som helst nettleser,
**selv bak butikkens NAT** — Pi-en dialer UT til Raspberry Pis sky. Dette ER
fjernaksess-løsningen for flåten. `rpi-connect` er forhåndsinstallert.

```bash
sudo loginctl enable-linger frlund3   # Connect lever uten innlogget skrivebord (kiosk = konsoll!)
rpi-connect on
rpi-connect signin                     # skriver URL + kode → åpne i nettleser, logg inn på ORGANISASJONEN, bekreft
rpi-connect status                     # skal vise: Signed in + screen sharing/remote shell allowed
```
> ⚠️ `enable-linger` er kritisk — uten den mister kiosken Connect så snart ingen er innlogget.

Etterpå: i Connect-konsollen **tagg enheten** med butikk + `gangerolv`.
Connect for Organisations: ~$0,50/enhet/mnd (~$8/mnd for 16), bulk provisioning + Management API.

## 9. Status — Pi-er satt opp (EUROSPAR MOA)

| Hostnavn | Rolle | Display-id | Gruppe | Rotasjon | Auto-start | Emoji | Connect |
|----------|-------|-----------|--------|----------|-----------|-------|---------|
| `gr-eurospar-moa1` | **Kundeskjerm** | 1 | `EUROSPAR MOA` (id 9) | `right` (portrett) | ✅ | ✅ | ⬜ gjenstår |
| `gr-eurospar-moa2` | **Bakrom/intern** | 2 | `EUROSPAR MOA – Bakrom` (id 25) | `normal` | ⬜ | ⬜ | ⬜ |

`gr-eurospar-moa1` viser alt perfekt (innhold, portrett, emojis i farger). Gjenstår: Connect (steg 8).
`gr-eurospar-moa2` er av — fullføres med samme oppskrift (rotasjon `normal`).

## Feilsøking (symptomer vi traff — og fiksen)

| Symptom i logg/skjerm | Årsak | Fix |
|-----------------------|-------|-----|
| `setting up XMR ZMQ connection ... No address associated with hostname`, `Using ZMQ XMR at tcp://cms.example.org:9505` | CMS XMR Public Address er placeholder | Sett `XMR_PUB_ADDRESS` i CMS-DB (se topp-seksjonen) — engangs |
| `xf86OpenConsole: Cannot open virtual console 2 (Permission denied)` | systemd-tjeneste eier ingen VT | `PAMName=login` + `TTYPath=/dev/tty2` + `-keeptty` i unit (steg 7) |
| Tjeneste `activating (auto-restart)`, arexibo exit 0, ingen logg | (etter VT-fix) arexibo kveler på XMR, men logger ikke uten tty | kjør `arexibo --debug ~/xibo` via wrapper for å se ekte feil |
| Emojis = tomme bokser □ | mangler emoji-font | `sudo apt install -y fonts-noto-color-emoji` + `fc-cache -f` + restart arexibo |
| Portrett-layout vises som smal stripe (`scale: ... result 607x1080`) | skjerm liggende, layout portrett | roter: `echo right > ~/.kiosk-rotate` (steg 7) |
| WiFi-radio død | mangler land-kode | `sudo raspi-config nonint do_wifi_country NO` |

## Konvensjoner + golden image
- **Hostnavn:** `gr-<butikk><nr>` (kunde = `1`, bakrom = `2`).
- **Rotasjon:** kunde = `right` (portrett 1080×1920); bakrom = `normal` (liggende). Justeres i `~/.kiosk-rotate`.
- **Golden image:** når en Pi er komplett (Arexibo + skjerm-deps + systemd + Connect) og verifisert,
  klon SD-kortet. Per klon endres bare: hostnavn, `~/.kiosk-rotate`, WiFi (`kundenett`),
  ny Xibo-registrering (`rm ~/xibo/cms.json` → re-registrer) + autoriser/tilordne, ny Connect-signin.

---

## Referanser
- Arexibo (GitHub): https://github.com/birkenfeld/arexibo
- Xibo Pi via Arexibo (CNX): https://www.cnx-software.com/2026/01/12/xibo-open-source-digital-signage-solution-now-works-with-raspberry-pi-5-thanks-to-the-arexibo-project/
- Xibo player på Pi: https://account.xibosignage.com/docs/setup/can-i-run-a-xibo-player-on-my-raspberry-pi-all-variants
