# cnildev-website

My personal website: an interactive terminal you can type into or click
through. Each page morphs the shell into its own theme, from rich soil to a
circuit board to a sunlit greenhouse.

## Stack

- Vite + TypeScript, no framework, no runtime dependencies besides fonts
- JetBrains Mono and Space Grotesk via Fontsource
- One canvas for the ambient backgrounds, one for the garden plant

## Develop

```sh
pnpm install
pnpm dev          # local dev server
pnpm build        # type check + production build into dist/
pnpm preview      # serve dist/
pnpm check:ascii  # fail on any non-ASCII byte in tracked text files
```

## Deploy (Hostinger, file upload)

```sh
pnpm bundle       # builds and writes site.zip with the contents of dist/
```

In hPanel: Websites > Manage > Files > File Manager, open `public_html`,
delete the old site files, upload `site.zip`, right-click it and choose
Extract (into `public_html` itself), then delete the zip. `.htaccess` is
included and sets the 404 page and caching.

The build writes one HTML file per route (`about/index.html`, ...) plus a
`404.html`, so `dist/` deploys to any static host with working deep links.

## Layout

| File | What it holds |
| --- | --- |
| `src/content.ts` | All copy: bio, projects, stack, timeline, plants, fortunes |
| `src/routes.ts` | Pages, their prompt directory, theme, and metadata |
| `src/pages.ts` | Page bodies |
| `src/commands.ts` | Commands, the virtual filesystem, tab completion |
| `src/shell.ts` | Prompt, block cursor, history, routing, page morph |
| `src/ambient.ts` | Per-theme animated backgrounds |
| `src/plant.ts` | The garden monstera that grows when watered |
| `src/styles.css` | Theme tokens and layout |

To change what the site says, edit `src/content.ts`.

## License

GPL-3.0. See `LICENSE`.
