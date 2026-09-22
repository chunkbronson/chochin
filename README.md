# <img src="build/icon.png" alt="chochin icon" width="64" height="64"> chochin



A modern GUI for managing the [komorebi](https://github.com/LGUG2Z/komorebi) window manager on Windows:
rules, general config, monitors & workspaces, app-specific config, live runtime controls, and a raw
JSON editor.

> Built on komorebi. Rule semantics, config paths and the `komorebic` CLI are komorebi's own.

## Requirements

- [komorebi](https://komorebi.org/) installed and running
- A `komorebi.json` and optional `applications.json` (komorebi's standard config files)

## How it finds your files

chochin never hardcodes a username or machine path. On startup it resolves, in order:

| What           | Resolution order                                                            |
| -------------- | --------------------------------------------------------------------------- |
| `komorebi.json` | `%USERPROFILE%\komorebi.json` (komorebi's default), unless overridden       |
| `applications.json` | Next to your `komorebi.json`, else `%USERPROFILE%\applications.json`    |
| `komorebic.exe` | `C:\Program Files\komorebi\bin`, Program Files (x86), WinGet Links, Scoop, or `PATH` |

If your files live somewhere else, click **Locate komorebi.json…** / **Locate komorebic.exe…** in
the sidebar. Your choices are remembered in `%APPDATA%\chochin\settings.json` and reused on next
launch.

## Using it

- **Rules** — add/remove ignore, floating, force-manage, workspace, transparency and more rules by
  kind (`Exe`/`Class`/`Title`/`Path`) and strategy. "Float focused app" adds a floating rule for the
  currently active window.
- **General / Appearance / Monitors** — form editors for behaviour enums, padding, borders,
  transparency, animation, and per-monitor workspaces.
- **App-specific** — per-application overrides for `applications.json`.
- **Runtime** — live state KPIs, controls (pause, float, retile), layout switching and workspace
  focus.
- **Raw JSON** — full-file editor; everything the forms don't cover.
- **Save file** writes the config (keeping a `.bak`), **Save & apply** additionally runs
  `komorebic replace-configuration`.

## Development

```bash
npm install        # first time
npm run dev        # hot-reload dev (vite + electron)
npm run build      # typecheck + build renderer into dist-renderer/
npm start          # run the built app
npm run dist       # package installer + portable exe into release/
```

## Layout

```
electron/    main process, IPC, komorebic wrapper, path resolution, settings store
renderer/    React + Vite UI (sidebar, forms, runtime panel)
build/       app icon (icon.png / icon.ico)
schema.json  komorebi schema (reference for the editor)
```

## License

MIT. `schema.json` / `schema.asc.json` are copied from
[LGUG2Z/komorebi](https://github.com/LGUG2Z/komorebi) (MIT) for editor reference.
