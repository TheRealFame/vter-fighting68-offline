#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/dist/linux-unpacked"
VERSION="${VERSION:-1.0.0}"
MAINTAINER="${MAINTAINER:-VTER Offline Configurator <noreply@localhost>}"
OUT="$HERE/dist/vter-desktop_${VERSION}_amd64.deb"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/opt/VTER"
cp -a "$APP/." "$STAGE/opt/VTER/"

mkdir -p "$STAGE/usr/bin" \
         "$STAGE/usr/share/applications" \
         "$STAGE/usr/share/icons/hicolor/512x512/apps" \
         "$STAGE/DEBIAN"

ln -s /opt/VTER/vter-desktop "$STAGE/usr/bin/vter-desktop"
cp "$HERE/build/icon.png" "$STAGE/usr/share/icons/hicolor/512x512/apps/vter-desktop.png"

cat > "$STAGE/usr/share/applications/vter-desktop.desktop" << 'DESKTOP'
[Desktop Entry]
Name=VTER
Comment=Configure VTER keyboards
Exec=/opt/VTER/vter-desktop %U
Terminal=false
Type=Application
Icon=vter-desktop
StartupWMClass=VTER
Categories=Utility;
DESKTOP

cat > "$STAGE/DEBIAN/control" << CONTROL
Package: vter-desktop
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Maintainer: $MAINTAINER
Homepage: https://vter.driveall.cn
Installed-Size: 0
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Description: Unofficial offline configurator for VTER keyboards
 Configure lighting, key mapping, macros and sensitivity for VTER
 keyboards. Runs fully offline and needs no account.
CONTROL

cat > "$STAGE/DEBIAN/postinst" << 'POSTINST'
#!/bin/sh
set -e
if [ -f /opt/VTER/chrome-sandbox ]; then
  chown root:root /opt/VTER/chrome-sandbox || true
  chmod 4755 /opt/VTER/chrome-sandbox || true
fi
exit 0
POSTINST
chmod 755 "$STAGE/DEBIAN/postinst"

SIZE=$(du -sk "$STAGE" | cut -f1)
sed -i "s/^Installed-Size:.*/Installed-Size: $SIZE/" "$STAGE/DEBIAN/control"

dpkg-deb --build --root-owner-group "$STAGE" "$OUT"
echo "BUILT: $OUT"
