# Oppsett av Raspberry Pi-spiller (Gange-Rolv infoskjerm)

Steg-for-steg for å sette opp en Raspberry Pi som Xibo-spiller mot
`https://xibo.framtidtech.no`. Følg dette per butikk. Dette er «golden image»-
oppskriften vi gjentar for alle 16 butikkene.

> 🔐 **Hemmeligheter:** ikke skriv faktiske passord inn i denne fila (den er i
> git). Login-/WiFi-passord oppbevares utenfor repo (passordhvelv / spør Frank).

---

## 1. Skriv minnekortet (Raspberry Pi Imager)

1. Last ned **Raspberry Pi Imager** fra raspberrypi.com/software.
2. **Choose OS:** `Raspberry Pi OS (64-bit)` — *Desktop* (vi trenger grafikk/webview).
3. **Choose Storage:** SD-kortet.
4. **Edit Settings** (tannhjul) — VIKTIG:
   - **Hostname:** `gr-<butikk>` — f.eks. `gr-eurospar-moa1` (konvensjon: `gr-` + butikknavn + skjermnr.)
   - **Enable SSH** + brukernavn `frlund3` + passord (felles eller unikt — se hvelv).
   - **Wireless LAN country:** `NO` (Norge) — ⚠️ **uten denne starter ikke WiFi-radioen.**
   - **WiFi:** SSID + passord (butikkens nett).
   - **Locale:** tidssone `Europe/Oslo`, tastatur `no`.
   - **Raspberry Pi Connect:** kan stå AV (vi bruker SSH lokalt; fjernaksess for fleet løses med Connect/Tailscale senere).
5. **Write** → sett kortet i Pi-en → strøm på.

## 2. Få Pi-en på nett + SSH inn

- **Enklest = ethernet-kabel** (Pi → ruter). Da får den IP umiddelbart, uten WiFi-trøbbel.
- Finn IP-en i **ruterens enhetsliste** (se etter hostnavnet), eller prøv `<hostname>.local`.
- SSH inn fra Mac/PC:
  ```
  ssh frlund3@<ip>          # f.eks. ssh frlund3@192.168.2.77
  # eller: ssh frlund3@gr-<butikk>.local
  ```
  Svar `yes` på fingerprint, skriv passord (usynlig mens du skriver).
- Inne når du ser: `frlund3@gr-<butikk>:~ $`

### Vanlige fallgruver (vi traff disse første gang)
- **SSH «henger»** = Pi-en er ikke nåbar → den er ikke på nett ennå, eller Mac og Pi er på **ulike subnett** (sjekk `ipconfig getifaddr en0` på Mac mot Pi-ens IP). Fix: samme ruter, eller ethernet.
- **`<hostname>` med vinkelparenteser** i terminal gir `zsh: no such file or directory` — skriv det faktiske navnet uten `< >`.
- **WiFi kobler ikke til** = nesten alltid manglende land-kode (se steg 4 / 3 under).

## 3. Sett opp / fiks WiFi (via SSH)

Pi OS bruker NetworkManager:
```
sudo raspi-config nonint do_wifi_country NO
sudo rfkill unblock wifi
sudo nmcli device wifi connect "<SSID>" password "<wifi-passord>"
nmcli device status        # wlan0 skal vise: connected
```
La gjerne ethernet stå i under oppsett — du mister ikke SSH.

## 4. Installer Xibo-spiller (Arexibo) — bygg fra kilde

For Pi + CMS 4.x er **Arexibo** (Rust-basert Xibo-spiller, QtWebEngine) riktig valg
— den offisielle Linux-spilleren er treg på Pi. Vi bygger fra kilde (beholder
oppsettet, og vi får eksakt oppskrift å automatisere). Testet på Pi 4 Model B.

```bash
# 1) System + bygge-avhengigheter (Qt6 WebEngine er stor – tar litt nedlasting)
sudo apt update
sudo apt install -y git cmake g++ cargo pkg-config libdbus-1-dev libzmq3-dev qt6-webengine-dev

# 2) Sjekk Rust ≥ 1.75 (Arexibo krever det)
cargo --version
#   < 1.75? installer nyere via rustup:
#   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
#   . "$HOME/.cargo/env"

# 3) Hent + bygg (kompilering tar ~10–20 min på Pi 4)
cd ~
git clone https://github.com/birkenfeld/arexibo.git
cd arexibo
cargo build --release            # binær: target/release/arexibo

# 4) Installer til /usr/bin
sudo cargo install --path . --root /usr   # (apt-cargo: fungerer med sudo)
#   Brukte du rustup-cargo? Da i stedet: sudo cp target/release/arexibo /usr/bin/
```

**Konfigurer spilleren (første start):**
```bash
mkdir -p ~/xibo
arexibo --host https://xibo.framtidtech.no/ --key <CMS-nøkkel> ~/xibo
# senere oppstart: arexibo ~/xibo
```
- `<CMS-nøkkel>` = CMS Secret Key fra Xibo → Settings → Displays.
- Spilleren logger til stdout og viser GUI når displayet er **autorisert** i CMS.

> TODO neste gang: lag en **systemd-tjeneste** + autologin/kiosk så spilleren
> starter automatisk ved boot, og et **klone-script** for resten av butikkene.

## 5. Registrer + tilordne i Xibo (gjøres av Claude via API)

Når spilleren har koblet til, dukker den opp som **uautorisert Display** i Xibo. Da:
1. **Autoriser** displayet.
2. **Tilordne til riktig skjermgruppe** (de finnes allerede):
   - Kundeskjerm: gruppe = **butikknavnet** eksakt, f.eks. `EUROSPAR MOA`
   - Bakrom/intern: `EUROSPAR MOA – Bakrom`
   - Avdelingsskjerm (valgfritt): `EUROSPAR MOA – <Avdeling>` (bygges med `scripts/xibo/build-avdeling-screen.mjs`)
3. Verifiser at den henter layouten (Skjermsystem-previewen i appen viser status).

## 6. Fleet / drift (16 butikker)

- **Hostnavn-konvensjon:** `gr-<butikk><nr>`.
- **Fjernaksess:** SSH funker bare lokalt. For butikker bak NAT bruk **Raspberry Pi
  Connect** (`rpi-connect on`) eller **Tailscale** — settes opp i golden image.
- **Skjerm-orientering:** kundeskjerm = **portrett (1080×1920)**; bakrom = liggende.
- Når vei A/B er bestemt: lag et **klone-script** så resten av butikkene settes opp likt.

---

## Referanser
- Arexibo (GitHub): https://github.com/birkenfeld/arexibo
- Xibo på Pi 5 via Arexibo (CNX): https://www.cnx-software.com/2026/01/12/xibo-open-source-digital-signage-solution-now-works-with-raspberry-pi-5-thanks-to-the-arexibo-project/
- Xibo: kan jeg kjøre spiller på Raspberry Pi: https://account.xibosignage.com/docs/setup/can-i-run-a-xibo-player-on-my-raspberry-pi-all-variants
