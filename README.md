# KLINIKA – Aplikacioni për Windows

Hap panelin e KLINIKA-s në një program të veçantë me ikonë, menu në shqip, printim dhe **përditësim automatik**.

## Provë në kompjuterin tuaj
```
npm install
npm start
```
Në hapjen e parë kërkon adresën e serverit (p.sh. `http://localhost:5173` kur paneli web është i nisur me `npm run dev`).

## Publikimi në GitHub (krijon KLINIKA-Setup.exe)
1. Ky dosje → repository **publik** në GitHub (p.sh. `klinika-desktop`).
2. GitHub → **Actions** → **Ndërto KLINIKA për Windows** → **Run workflow** → versioni `1.0.0`.
3. Pas ~5–10 min: **Releases** → `KLINIKA-Setup.exe`.
4. Lidhja për shkarkim: `https://github.com/<PERDORUESI>/klinika-desktop/releases/latest/download/KLINIKA-Setup.exe`

## Version i ri
Ndryshoni çfarë duhet → **Run workflow** me versionin e ri (p.sh. `1.0.1`). Programet e instaluara përditësohen vetë.

## Adresa e serverit e paracaktuar
Te `package.json` → `"klinika": { "serverUrl": "https://app.klinika.al" }` – klinikat nuk do të pyeten për adresën.
