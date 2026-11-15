import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { ROUTES } from "./src/routes.ts";

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Write one HTML file per route (about/index.html, ...) with its own title
 * and description, plus a 404.html, so any static host serves deep links.
 */
function staticRoutes(): Plugin {
  let outDir = "dist";
  return {
    name: "static-routes",
    apply: "build",
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const base = readFileSync(resolve(outDir, "index.html"), "utf8");
      const page = (title: string, description: string, theme: string) =>
        base
          .replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`)
          .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, `$1${attr(description)}"`)
          .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${attr(title)}"`)
          .replace(/data-theme="[^"]*"/, `data-theme="${theme}"`);
      for (const r of ROUTES) {
        if (r.path === "/") continue;
        const dir = resolve(outDir, r.path.slice(1));
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, "index.html"), page(r.title, r.description, r.theme));
      }
      writeFileSync(resolve(outDir, "404.html"), page("404 - Cyrus Nilforooshan", "Page not found.", "soil"));
    },
  };
}

export default defineConfig({
  plugins: [staticRoutes()],
  build: { target: "es2022" },
});
