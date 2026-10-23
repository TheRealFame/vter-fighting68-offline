# Third-party notice

This project is **unofficial** and is not affiliated with, endorsed by, or
sponsored by VTER, DriveAll or MechLands. The VTER name is used only to
describe which hardware this tool works with.

## Vendored web application

Everything under `site/` is the web configurator published at
<https://vter.driveall.cn/>. It is the property of its authors (VTER /
DriveAll) and is **not** covered by any license granted by this repository.

It is included here with written permission from MechLands, the official
distributor of VTER products, granted by email on 2026-10-23. The permission
covers publishing this build, including the web configurator, free of charge,
on the following conditions:

- credit VTER / DriveAll and link to <https://vter.driveall.cn/>;
- make no claim to their trademarks;
- remove the build on request.

The only modification to that code is described in `README.md` ("Patches"):
one compatibility line in the device-name lookup, plus one URL for the unused
music-helper download, which is redirected to a local placeholder.

## Vendor data

`mock/supplier.json` is a cached response from the vendor's supplier API, used
so the brand lookup works without a network connection. It has been reduced to
the three fields the app reads (numeric id, brand slug, display URL); account,
contact and session fields present in the original response were stripped
before this repository existed.

## This repository's own code

`main.js`, `preload.js`, `patch-app.js`, `build-deb.sh` and the packaging
files are original work. **No license is granted** for them; all rights are
reserved by the author.

## Removal

If you are a rights holder and want this build taken down, open an issue or
contact the repository owner and it will be removed.
