# VTER Fighting68 — offline configurator

Unofficial desktop build of the VTER web configurator, packaged so it runs
**completely offline** on Linux, Windows and macOS. No account, no telemetry,
no network access.

Tested with the **VTER Fighting68 HE** (`USB 0C45:8030`). Other VTER models
that use <https://vter.driveall.cn/> should work too, but are untested.

> **Not affiliated with VTER, DriveAll or MechLands.** "VTER" is used only to
> say which hardware this works with. See [NOTICE.md](NOTICE.md).

---

## Download

Take the file for your platform from the [Releases](../../releases) page.

| Platform | Asset | Type |
| --- | --- | --- |
| Linux x86_64 | `VTER-1.0.0-linux-x86_64.AppImage` | single file, no install |
| Linux x86_64 (Debian/Ubuntu) | `vter-desktop_1.0.0_amd64.deb` | system package |
| Windows x64 | `VTER-1.0.0-win-x64.exe` | portable, no install |
| macOS x64 / arm64 | `VTER-1.0.0-mac-x64.zip`, `VTER-1.0.0-mac-arm64.zip` | portable `.app` |

---

## What works

Verified by the packager on real hardware:

| Feature | Linux | Windows | macOS |
| --- | --- | --- | --- |
| App starts fully offline | ✅ tested | ⚠️ built, not run on hardware | ⚠️ built, not run on hardware |
| Keyboard detected (`0C45:8030`) | ✅ tested | ⚠️ untested | ⚠️ untested |
| Settings read from the keyboard | ✅ tested | ⚠️ untested | ⚠️ untested |
| Lighting / per-key UI | ✅ opens, writes not re-verified | ⚠️ untested | ⚠️ untested |
| Key mapping UI | ✅ opens, writes not re-verified | ⚠️ untested | ⚠️ untested |
| Macro manager | ✅ opens, writes not re-verified | ⚠️ untested | ⚠️ untested |
| Performance / RT tuning | ✅ opens, writes not re-verified | ⚠️ untested | ⚠️ untested |
| Profiles (saved locally) | ✅ tested | ⚠️ untested | ⚠️ untested |
| Music effects | ❌ not available | ❌ not available | ❌ not available |

Why "writes not re-verified": the writing code is the vendor's own, shipped
unmodified (see *Patches*). The packager verified detection, reads and the full
UI, but did not deliberately change the keyboard's configuration during
validation. Treat the first write as a test and keep your saved profile.

Why music effects are missing: the vendor implements them with a separate
**Windows-only helper** (`music.zip`, a `.dll`-based program). It cannot run on
Linux or macOS, and nothing in this build replaces it. The Music tab opens but
stays idle, and its download link returns a short explanatory `README.txt`.

### Not verified at all

- Windows and macOS runtime behaviour — those binaries are produced by CI from
  the same sources, but nobody has plugged a keyboard into them.
- Keyboards other than the Fighting68 HE.
- Wireless (2.4 GHz / Bluetooth) configuration. Use the USB cable.

---

## Install

### Linux — AppImage

```bash
chmod +x VTER-1.0.0-linux-x86_64.AppImage
./VTER-1.0.0-linux-x86_64.AppImage
```

If FUSE is unavailable:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 ./VTER-1.0.0-linux-x86_64.AppImage
```

### Linux — deb

```bash
sudo apt install ./vter-desktop_1.0.0_amd64.deb
vter-desktop
```

### Linux — HID permissions

Chromium's HID stack normally gets access through systemd's `uaccess` ACL, and
no extra step was needed on the test machine. If the keyboard is not detected,
add a udev rule and replug:

```bash
sudo cp udev/99-vter.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=hidraw --action=add
```

The rule grants the logged-in user access to SONiX vendor HID devices
(`idVendor 0c45`). It does not install anything else.

### Windows

Run `VTER-1.0.0-win-x64.exe`. It is a portable executable — no installer, no
background service. SmartScreen will warn because the binary is unsigned;
choose *More info → Run anyway*.

### macOS

Unzip, drag `VTER.app` wherever you like, then clear the quarantine flag
(the build is unsigned):

```bash
xattr -dr com.apple.quarantine VTER.app
open VTER.app
```

Alternatively: right-click → *Open* → *Open*.

---

## Usage

1. Connect the keyboard with the USB cable and switch it to wired mode.
2. Start the app.
3. Click **Initialize Keyboard**.
4. Click **Allow browser access** when the page asks.
5. The configurator loads with your keyboard selected.

Settings are written to the keyboard itself. Named profiles are stored in the
app's local data directory (`~/.config/VTER` on Linux, `%APPDATA%\VTER` on
Windows, `~/Library/Application Support/VTER` on macOS). Because the local
server prefers a fixed port (8080, then 18080), profiles survive restarts.

---

## Build

Requirements: Node.js 20+ and npm. No Python needed.

```bash
npm ci
npm run dist:linux   # dist/VTER-1.0.0-linux-x86_64.AppImage
npm run deb          # dist/vter-desktop_1.0.0_amd64.deb  (Linux, dpkg-deb)
npm run dist:win     # dist/VTER-1.0.0-win-x64.exe        (Windows host or CI)
npm run dist:mac     # dist/VTER-1.0.0-mac-*.zip          (macOS host or CI)
```

`npm run patch` is executed automatically by each build script.

Windows and macOS binaries are built by the workflow in
`.github/workflows/build.yml` on native runners, because electron-builder needs
the target OS for those formats.

### Layout

```
main.js            Electron main process: local HTTP server + WebHID setup
preload.js         Error logging only
patch-app.js       Applies the two compatibility patches to site/
build-deb.sh       Hand-built .deb (electron-builder's fpm path fails here)
site/              Vendored web configurator (see NOTICE.md)
mock/supplier.json Cached supplier list so the brand dropdown works offline
udev/99-vter.rules Optional Linux HID permission rule
```

---

## How it works

The vendor's configurator is a normal web app that talks to the keyboard over
**WebHID**. Electron supports WebHID, WebKitGTK (Tauri) does not — which is why
this is an Electron wrapper.

1. `main.js` starts a small HTTP server on `127.0.0.1` (port 8080, then 18080,
   then any free port) and serves `site/`.
2. The same server answers the vendor's API calls from local data
   (`/api/supplier/index`, `/api/fileinfo/index`, `/api/keyboard/*`,
   `/update.json`), so nothing reaches the internet.
3. Only requests for those local endpoints exist; the production API
   (`cp.driveall.cn`) is only selected by the vendor's code when the hostname
   contains `.cn`, which never happens here.
4. WebHID permission handlers auto-approve the HID interface and preselect the
   SONiX device (`vendorId 0c45`, usage page `0xFF68`/`0xFF00`).
5. Two requests the vendor hardcodes to `127.0.0.1:8080` are redirected to the
   actual port when 8080 is busy.

### Patches

`patch-app.js` changes exactly two things in the vendored bundle:

1. **Device name match.** The device database stores `Fighting68`; the keyboard
   reports `KEYBOARD Fighting68`. The lookup strips the prefix, otherwise the
   app aborts the connect flow.
2. **Music helper URL.** `https://dev.driveall.cn/music.zip` becomes the local
   `/music.zip` placeholder.

No protocol, firmware or feature code is modified.

---

## Credits

- Web configurator and keyboard protocol: VTER / DriveAll —
  <https://vter.driveall.cn/>
- Includes their web application with written permission from MechLands, the
  official VTER distributor (2026-10-23). Credit and link as requested; no
  trademark claim; removed on request.
- Electron and electron-builder.

## License

No license is granted for this repository's own code. All rights reserved.

The vendored web application in `site/` is **not** covered by that statement
and remains the property of its authors; it is included only under the
permission described above. See [NOTICE.md](NOTICE.md).
