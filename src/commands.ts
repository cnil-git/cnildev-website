// Commands, a tiny virtual filesystem, and tab completion.

import { ASCII_LEAF, EMAIL, FORTUNES, LINKS, PERSON, PROJECTS, STACK, TIMELINE } from "./content";
import { esc } from "./highlight";
import { DECLS, MIR, code, portrait, projectCard } from "./pages";
import { leafCount, loadGarden, mood, water } from "./plant";
import { ROUTES, routeByDir, type Route } from "./routes";

export interface Ctx {
  /** Current directory, e.g. "~/projects". */
  dir: string;
  route: Route | undefined;
  cd(dir: string, typed: string): void;
  print(html: string, cls?: string): void;
  clear(): void;
  history(): string[];
  bootedAt: number;
}

interface Command {
  desc: string;
  group: "navigate" | "read" | "garden" | "system";
  usage?: string;
  hidden?: boolean;
  run(args: string[], ctx: Ctx, raw: string): void;
  complete?(arg: string, ctx: Ctx, argIndex: number): string[];
}

/* ------------------------------------------------------------------ */
/* Filesystem                                                          */
/* ------------------------------------------------------------------ */

const run = (cmd: string, label = cmd) =>
  `<button type="button" class="cmdlink" data-run="${esc(cmd)}">${esc(label)}</button>`;

const kv = (rows: [string, string][]) =>
  `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;

type FileFn = () => string;

const SUBDIRS = ROUTES.filter((r) => r.dir !== "~").map((r) => r.dir.slice(2));

const FILES: Record<string, Record<string, FileFn>> = {
  "~": {
    "README.md": () =>
      `<span class="hl"># cyrus@monstera</span>\n\nEmbedded engineer, full stack developer, and biophile.\nFirmware captain at Longhorn Baja Racing. Building Monstera Lang.\n\nStart with ${run("cd ~/about")} or ${run("help")}.`,
    ".plantrc": () =>
      `<span class="muted"># ~/.plantrc</span>\nwater_when=top_inch_dry\nlight=bright_indirect\nhumidity=high\nrotate_weekly=true\nnever_build=weapons`,
  },
  "~/about": {
    "whoami.txt": () => whoami(),
    "cyrus.png": () => portrait(true),
    "stack.txt": () => kv(Object.entries(STACK).map(([k, v]) => [k, v.map(esc).join(", ")])),
    "log.txt": () => kv(TIMELINE.map((e) => [e.when, esc(e.what)])),
  },
  "~/projects": Object.fromEntries(PROJECTS.map((p) => [p.slug, () => projectCard(p)])),
  "~/monstera": {
    "README.mons": () =>
      `<span class="hl">Monstera Lang</span>: a safe-by-default systems language with predictable cost.\nstatus: early development, design draft 0.2. Read the full page with ${run("cd ~/monstera")}.`,
    "syntax.mon": () => code("syntax.mon", "mons", DECLS, "draft 0.2"),
    "sum.mir": () => code("sum.mir", "mir", MIR, "MIR text format"),
  },
  "~/garden": {
    "monstera.plant": () => gardenStatus(),
  },
  "~/ethos": {
    "values.txt": () =>
      `01 build for life\n02 no defense work, no weapons\n03 safe by default\n04 honest status\n05 leave it better than you found it\n\n${run("cd ~/ethos", "read the long version")}`,
  },
  "~/contact": {
    "links.txt": () => contactLinks(),
  },
};

/** Resolve a path argument against the current dir. Returns "~" style paths. */
function resolve(cwd: string, arg: string): string {
  let a = arg.trim();
  if (!a || a === "~" || a === "/" || a === "~/") return "~";
  if (a.startsWith("/home/cyrus")) a = "~" + a.slice("/home/cyrus".length);
  const parts = (a.startsWith("~") ? a.slice(1) : a.startsWith("/") ? a : cwd.slice(1) + "/" + a).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.length ? "~/" + out.join("/") : "~";
}

function isDir(path: string): boolean {
  return path === "~" || !!routeByDir(path);
}

function readFile(path: string): FileFn | undefined {
  const i = path.lastIndexOf("/");
  return FILES[path.slice(0, i)]?.[path.slice(i + 1)];
}

function listing(dir: string, all = false): { name: string; dir: boolean }[] {
  const entries: { name: string; dir: boolean }[] = [];
  if (dir === "~") SUBDIRS.forEach((d) => entries.push({ name: d, dir: true }));
  Object.keys(FILES[dir] ?? {}).forEach((f) => {
    if (all || !f.startsWith(".")) entries.push({ name: f, dir: false });
  });
  return entries;
}

/* ------------------------------------------------------------------ */
/* Output helpers                                                      */
/* ------------------------------------------------------------------ */

function whoami(): string {
  return `<span class="hl">cyrus</span>  ${PERSON.name} <span class="muted">(Taha on paper, Cyrus everywhere else)</span>\n${PERSON.roles.slice(0, 3).join(", ")}.\nmore: ${run("cd ~/about")}`;
}

function gardenStatus(): string {
  const s = loadGarden();
  return kv([
    ["plant", "Monstera deliciosa"],
    ["leaves", `${leafCount(s)} / 13`],
    ["watered", s.waters ? `${s.waters}x by you` : "not yet"],
    ["mood", mood(s)],
  ]);
}

function contactLinks(): string {
  const rows: [string, string][] = [];
  if (EMAIL) rows.push(["email", `<a href="mailto:${EMAIL}">${esc(EMAIL)}</a>`]);
  rows.push(
    ["github", `<a href="${LINKS.github}" target="_blank" rel="noopener noreferrer">${LINKS.github.replace("https://", "")}</a>`],
    ["team", `<a href="${LINKS.baja}" target="_blank" rel="noopener noreferrer">github.com/longhorn-baja-racing</a>`],
  );
  return kv(rows);
}

function asciiLeaf(): string {
  return esc(ASCII_LEAF).replace(/(#+)|(:+)|(%+)/g, (_m, a, b, c) =>
    a ? `<span class="a1">${a}</span>` : b ? `<span class="a2">${b}</span>` : `<span class="a3">${c}</span>`,
  );
}

function uptime(since: number): string {
  const s = Math.floor((Date.now() - since) / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m} min${m === 1 ? "" : "s"}, ${s % 60} secs` : `${s} secs`;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

const completePath = (arg: string, ctx: Ctx, dirsOnly: boolean): string[] => {
  const slash = arg.lastIndexOf("/");
  const head = slash >= 0 ? arg.slice(0, slash + 1) : "";
  const base = resolve(ctx.dir, head || ".");
  const names = listing(base, arg.slice(slash + 1).startsWith("."))
    .filter((e) => !dirsOnly || e.dir)
    .map((e) => head + e.name + (e.dir ? "/" : ""));
  if (dirsOnly && !head && !arg.startsWith(".")) names.push("..", "~");
  return names;
};

const goto = (dir: string) => (_a: string[], ctx: Ctx, raw: string) => ctx.cd(dir, raw);

export const COMMANDS: Record<string, Command> = {
  help: {
    desc: "list commands",
    group: "system",
    run(_a, ctx) {
      const groups: Command["group"][] = ["navigate", "read", "garden", "system"];
      const rows = groups
        .map(
          (g) =>
            `<span class="h">${g}</span>` +
            Object.entries(COMMANDS)
              .filter(([, c]) => c.group === g && !c.hidden)
              .map(([n, c]) => `<span>${run(c.usage ? n : n, c.usage ?? n)}</span><span class="muted">${esc(c.desc)}</span>`)
              .join(""),
        )
        .join("");
      ctx.print(`<div class="help">${rows}</div>`);
      ctx.print(`<span class="muted">tips: <kbd>Tab</kbd> completes, <kbd>&uarr;</kbd><kbd>&darr;</kbd> history, <kbd>Ctrl</kbd>+<kbd>L</kbd> clears. Some commands are hidden.</span>`);
    },
  },
  ls: {
    desc: "list a directory",
    usage: "ls [dir]",
    group: "navigate",
    run(args, ctx) {
      const all = args.some((a) => /^-\w*a/.test(a));
      const target = resolve(ctx.dir, args.find((a) => !a.startsWith("-")) ?? ".");
      if (!isDir(target)) {
        if (readFile(target)) return ctx.print(esc(target.split("/").pop()!));
        return ctx.print(`ls: cannot access '${esc(target)}': No such file or directory`, "err");
      }
      const items = listing(target, all).map((e) => {
        const path = target === ctx.dir ? e.name : `${target}/${e.name}`;
        const cmd = e.dir ? `cd ${path}` : `cat ${path}`;
        return `<button type="button" class="${e.dir ? "dir" : "file"}" data-run="${esc(cmd)}">${esc(e.name)}${e.dir ? "/" : ""}</button>`;
      });
      ctx.print(`<div class="ls-out">${all ? '<span class="dir">./</span><span class="dir">../</span>' : ""}${items.join("")}</div>`);
    },
    complete: (arg, ctx) => completePath(arg, ctx, true),
  },
  cd: {
    desc: "change directory (that is, change page)",
    usage: "cd <dir>",
    group: "navigate",
    run(args, ctx, raw) {
      const target = resolve(ctx.dir, args[0] ?? "~");
      if (isDir(target)) return ctx.cd(target, raw);
      if (readFile(target)) return ctx.print(`cd: not a directory: ${esc(args[0])}. try ${run(`cat ${args[0]}`)}`, "err");
      ctx.print(`cd: no such file or directory: ${esc(args[0])}`, "err");
    },
    complete: (arg, ctx) => completePath(arg, ctx, true),
  },
  pwd: {
    desc: "print working directory",
    group: "navigate",
    run: (_a, ctx) => ctx.print("/home/cyrus" + ctx.dir.slice(1)),
  },
  tree: {
    desc: "show the whole filesystem",
    group: "navigate",
    run(_a, ctx) {
      const lines = ['<span class="dir">~</span>'];
      const top = listing("~");
      top.forEach((e, i) => {
        const last = i === top.length - 1;
        lines.push(`${last ? "`-- " : "|-- "}${e.dir ? `<span class="dir">${e.name}/</span>` : esc(e.name)}`);
        if (e.dir) {
          const kids = listing(`~/${e.name}`);
          kids.forEach((k, j) => lines.push(`${last ? "    " : "|   "}${j === kids.length - 1 ? "`-- " : "|-- "}${esc(k.name)}`));
        }
      });
      ctx.print(`<div class="tree">${lines.join("\n")}</div>`);
    },
  },
  cat: {
    desc: "print a file or project",
    usage: "cat <file>",
    group: "read",
    run(args, ctx) {
      if (!args.length) return ctx.print("cat: missing file operand. try " + run("ls"), "err");
      if (args.includes("--all")) return ctx.print(PROJECTS.map(projectCard).join(""));
      for (const a of args) {
        let path = resolve(ctx.dir, a.replace(/\/$/, ""));
        // Projects can be read from anywhere by bare name.
        if (!readFile(path) && FILES["~/projects"][a.replace(/\/$/, "")]) path = `~/projects/${a.replace(/\/$/, "")}`;
        const f = readFile(path);
        if (f) ctx.print(f());
        else if (isDir(path)) ctx.print(`cat: ${esc(a)}: Is a directory. try ${run(`cd ${a}`)}`, "err");
        else ctx.print(`cat: ${esc(a)}: No such file or directory`, "err");
      }
    },
    complete(arg, ctx) {
      const local = completePath(arg, ctx, false);
      return arg.includes("/") ? local : [...new Set([...local, ...PROJECTS.map((p) => p.slug), "--all"])];
    },
  },
  open: {
    desc: "open a project or link in a new tab",
    usage: "open <name>",
    group: "read",
    run(args, ctx) {
      const name = (args[0] ?? "").replace(/\/$/, "");
      const links: Record<string, string> = { github: LINKS.github, baja: LINKS.baja, source: LINKS.source };
      const p = PROJECTS.find((x) => x.slug === name);
      if (p?.page) return ctx.cd(routeByDir(`~${p.page}`)!.dir, `open ${name}`);
      const url = links[name] ?? (p && p.visibility !== "private" ? p.url : undefined);
      if (p && !url) return ctx.print(`open: ${esc(name)}: Permission denied (private repository). try ${run(`cat ${name}`)}`, "err");
      if (!url) return ctx.print(`open: ${esc(name || "(nothing)")}: not found. try: ${["github", "baja", "source", ...PROJECTS.filter((x) => x.url).map((x) => x.slug)].map((n) => run(`open ${n}`, n)).join(" ")}`, "err");
      window.open(url, "_blank", "noopener,noreferrer");
      ctx.print(`opening <a href="${url}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`);
    },
    complete: () => ["github", "baja", "source", ...PROJECTS.map((p) => p.slug)],
  },
  whoami: {
    desc: "who is this",
    group: "read",
    run: (_a, ctx) => ctx.print(whoami()),
  },
  neofetch: {
    desc: "system info, garden edition",
    group: "read",
    run(_a, ctx) {
      const info = kv([
        ["host", '<span class="hl">cyrus</span>@<span class="hl">monstera</span>'],
        ["os", "CachyOS Linux"],
        ["shell", "zsh"],
        ["editor", "neovim"],
        ["focus", "embedded, firmware, compilers"],
        ["langs", "C, C++, Rust"],
        ["building", "Monstera Lang"],
        ["hobbies", "houseplants"],
        ["uptime", uptime(ctx.bootedAt)],
      ]);
      ctx.print(`<div class="neo"><div class="ascii">${asciiLeaf()}</div>${info}</div>`);
    },
  },
  history: {
    desc: "previous commands",
    group: "system",
    run(_a, ctx) {
      const h = ctx.history();
      ctx.print(h.length ? h.map((c, i) => `${String(i + 1).padStart(4)}  ${esc(c)}`).join("\n") : "(empty)");
    },
  },
  clear: {
    desc: "clear the screen",
    group: "system",
    run: (_a, ctx) => ctx.clear(),
  },
  echo: { desc: "print text", group: "system", hidden: true, run: (a, ctx) => ctx.print(esc(a.join(" "))) },
  date: { desc: "print the date", group: "system", hidden: true, run: (_a, ctx) => ctx.print(esc(new Date().toString())) },
  uname: {
    desc: "system name",
    group: "system",
    hidden: true,
    run: (a, ctx) => ctx.print(a.includes("-a") ? "Linux monstera 6.x-cachyos x86_64 GNU/Linux (photosynthetic)" : "Linux"),
  },
  water: {
    desc: "water the monstera",
    group: "garden",
    run(_a, ctx) {
      const { state, grew, tooSoon } = water();
      const n = leafCount(state);
      if (tooSoon) return ctx.print(`<span class="muted">easy, the soil is still wet.</span>`);
      const msg = grew
        ? `The monstera unfurled a new leaf. <span class="hl">${n} / 13</span>`
        : n >= 13
          ? `Fully grown, and very happy about it. (${state.waters} waterings)`
          : "Watered.";
      const hint = ctx.dir === "~/garden" ? "" : `\n<span class="muted">see it: ${run("cd ~/garden")}</span>`;
      ctx.print(`<span style="color:#96d2ff">  .  ' .\n ' . ' .'</span>\n${msg}${hint}`);
    },
  },
  fortune: {
    desc: "a small piece of advice",
    group: "garden",
    run: (_a, ctx) => ctx.print(`<span class="hl">&gt;</span> ${esc(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])}`),
  },
  git: {
    desc: "inspect history",
    usage: "git log",
    group: "read",
    run(args, ctx) {
      if (args[0] === "log") {
        ctx.print(
          [...TIMELINE]
            .reverse()
            .map((e) => `<span style="color:var(--warn)">commit ${hash(e.what)}</span>\nDate:   ${e.when}\n\n    ${esc(e.what)}\n`)
            .join("\n"),
        );
      } else if (args[0] === "status") {
        ctx.print("On branch main\nnothing to commit, working tree clean\n<span class=\"muted\">(the monstera, however, could use some water)</span>");
      } else if (args[0] === "blame") {
        ctx.print("every line: Cyrus Nil. every leaf: also Cyrus Nil.");
      } else ctx.print(`usage: ${run("git log")} | ${run("git status")}`);
    },
    complete: () => ["log", "status", "blame"],
  },
  monstera: {
    desc: "the Monstera Lang toolchain",
    usage: "monstera --version",
    group: "read",
    run(args, ctx) {
      const sub = args[0] ?? "";
      if (sub === "--version" || sub === "-V") return ctx.print("monstera 0.0.0-dev (design draft 0.2)\ntargets: cortex-m0+, cortex-m4f, esp32-c3, esp32-c6 (planned)");
      if (["build", "run", "flash", "size", "check"].includes(sub))
        return ctx.print(`<span style="color:var(--warn)">error[E0000]</span>: the compiler is still growing\n  = note: design is at draft 0.2; the CLI does not compile anything yet\n  = help: read ${run("cd ~/monstera")} in the meantime`);
      ctx.print(`usage: monstera &lt;command&gt;\n\n  build    compile a program\n  flash    flash a board through probe-rs or OpenOCD\n  size     flash, RAM, and stack per function\n  --version`);
    },
    complete: () => ["--version", "build", "flash", "size"],
  },
  ping: {
    desc: "reach out",
    usage: "ping cyrus",
    group: "navigate",
    run: (_a, ctx, raw) => ctx.cd("~/contact", raw),
  },
  sudo: {
    desc: "",
    group: "system",
    hidden: true,
    run(args, ctx, raw) {
      if (args[0] === "water") return COMMANDS.water.run([], ctx, raw);
      if (args.join(" ") === "hire cyrus" || args[0] === "hire") return ctx.cd("~/contact", raw);
      ctx.print("cyrus is not in the sudoers file. This incident will be reported to the head gardener.", "err");
    },
  },
  rm: {
    desc: "",
    group: "system",
    hidden: true,
    run(args, ctx) {
      if (args.some((a) => a.startsWith("-") && a.includes("r")) && args.some((a) => a === "/" || a === "~" || a === "/*"))
        return ctx.print("rm: refusing to uproot the garden. roots run deep.", "err");
      ctx.print(`rm: cannot remove '${esc(args.filter((a) => !a.startsWith("-")).join(" ") || "")}': Read-only file system`, "err");
    },
  },
  exit: {
    desc: "",
    group: "system",
    hidden: true,
    run: (_a, ctx) => ctx.print("logout\n<span class=\"muted\">there is no exit from the garden. (closing the tab works, though)</span>"),
  },
  vim: { desc: "", group: "system", hidden: true, run: (_a, ctx) => ctx.print("nvim is the editor here, and it's already open somewhere. (this is a website, though)") },
  emacs: {
    desc: "",
    group: "system",
    hidden: true,
    run: (_a, ctx) => ctx.print("Emacs is a great operating system. It just lacks a decent text editor.\n<span class=\"muted\">nvim &gt; emacs</span>"),
  },
  nano: { desc: "", group: "system", hidden: true, run: (_a, ctx) => ctx.print("nano: respectable. still not nvim.") },
  reboot: {
    desc: "",
    group: "system",
    hidden: true,
    run(_a, ctx) {
      ctx.print("rebooting...");
      try { sessionStorage.removeItem("cnil.booted"); } catch { /* ignore */ }
      window.setTimeout(() => location.reload(), 400);
    },
  },
  contact: { desc: "how to reach me", group: "navigate", run: goto("~/contact") },
  hire: { desc: "", group: "navigate", hidden: true, run: goto("~/contact") },
};

// Page names work as commands too: typing "projects" goes there.
for (const r of ROUTES) {
  if (r.dir === "~" || COMMANDS[r.label]) continue;
  COMMANDS[r.label] = { desc: `go to ${r.dir}`, group: "navigate", hidden: true, run: goto(r.dir) };
}
COMMANDS.home = { desc: "go home", group: "navigate", hidden: true, run: goto("~") };
COMMANDS.nvim = { ...COMMANDS.vim };
COMMANDS["cd.."] = { desc: "", group: "navigate", hidden: true, run: (_a, ctx, raw) => COMMANDS.cd.run([".."], ctx, raw) };
COMMANDS.man = {
  desc: "describe a command",
  usage: "man <cmd>",
  group: "system",
  run(args, ctx) {
    const c = COMMANDS[args[0] ?? ""];
    if (!c || !c.desc) return ctx.print(`No manual entry for ${esc(args[0] ?? "(nothing)")}`, "err");
    ctx.print(`<span class="hl">${esc(args[0])}</span> - ${esc(c.desc)}\nusage: ${esc(c.usage ?? args[0])}`);
  },
  complete: () => Object.keys(COMMANDS).filter((n) => !COMMANDS[n].hidden),
};

/* ------------------------------------------------------------------ */
/* Dispatch and completion                                             */
/* ------------------------------------------------------------------ */

export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

export function execute(raw: string, ctx: Ctx): void {
  // Support "a && b" and "a; b" chains.
  const parts = raw.split(/\s*(?:&&|;)\s*/).filter(Boolean);
  for (const part of parts) {
    const [name, ...args] = tokenize(part);
    const cmd = COMMANDS[name.toLowerCase()];
    if (cmd) {
      cmd.run(args, ctx, part);
      continue;
    }
    const near = Object.keys(COMMANDS)
      .filter((n) => !COMMANDS[n].hidden)
      .map((n) => [n, lev(name.toLowerCase(), n)] as const)
      .filter(([, d]) => d <= 2)
      .sort((a, b) => a[1] - b[1])[0];
    ctx.print(
      `command not found: ${esc(name)}${near ? `. did you mean ${run([near[0], ...args].join(" "), near[0])}?` : `. try ${run("help")}`}`,
      "err",
    );
    return;
  }
}

/** Candidates for the word under the cursor. */
export function completions(line: string, ctx: Ctx): { start: number; items: string[] } {
  const start = line.lastIndexOf(" ") + 1;
  const word = line.slice(start);
  const before = tokenize(line.slice(0, start));
  if (!before.length) {
    const names = Object.keys(COMMANDS).filter((n) => !COMMANDS[n].hidden || n.length > 3);
    return { start, items: names.filter((n) => n.startsWith(word)).sort() };
  }
  const cmd = COMMANDS[before[0]];
  const items = cmd?.complete?.(word, ctx, before.length - 1) ?? [];
  return { start, items: items.filter((i) => i.startsWith(word)) };
}

export function commonPrefix(items: string[]): string {
  if (!items.length) return "";
  let p = items[0];
  for (const s of items) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
}
