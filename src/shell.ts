// The interactive shell: prompt with a block cursor, history, completion,
// routing between pages, and the theme morph.

import { commonPrefix, completions, execute, type Ctx } from "./commands";
import { esc } from "./highlight";
import { leafSvg } from "./leaf";
import { renderPage } from "./pages";
import { ROUTES, SITE_NAME, routeByDir, routeByPath, type Route, type Theme } from "./routes";

const HISTORY_KEY = "cnil.history";
const BOOT_KEY = "cnil.booted";

const CHIPS: Record<string, string[]> = {
  "~": ["help", "cd ~/projects", "whoami", "neofetch", "water", "ls"],
  "~/about": ["cat stack.txt", "git log", "cd ~/projects", "neofetch"],
  "~/projects": ["cat lbr-firmware", "cat monstera-lang", "cat --all", "open github"],
  "~/monstera": ["cat sum.mir", "monstera --version", "monstera build", "cd ~/projects"],
  "~/garden": ["water", "fortune", "cat monstera.plant", "cat ~/.plantrc"],
  "~/ethos": ["cat values.txt", "cd ~/contact", "fortune"],
  "~/contact": ["open github", "cat links.txt", "sudo hire cyrus"],
};

const THEME_COLOR: Record<Theme, string> = {
  soil: "#140b04", sunlit: "#1a0f05", pcb: "#02110d", ide: "#090d0b",
  greenhouse: "#061409", dawn: "#120b14", signal: "#0d0b09",
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = () => matchMedia("(pointer: coarse)").matches;

export function ps1(dir: string): string {
  return `<span class="host"><span class="u">cyrus</span><span class="s">@</span><span class="u">monstera</span><span class="s">:</span></span><span class="d">${esc(dir)}</span><span class="s">$</span>`;
}

const echo = (dir: string, cmd: string) => `<div class="echo">${ps1(dir)} <span class="c">${esc(cmd)}</span></div>`;

export function startShell(setAmbient: (t: Theme) => void): void {
  const screen = $<HTMLElement>("screen");
  const input = $<HTMLInputElement>("cmd");
  const line = $<HTMLElement>("line");
  const promptEl = $<HTMLFormElement>("prompt");
  const ps1El = $<HTMLElement>("ps1");
  const chips = $<HTMLElement>("chips");
  const tabs = $<HTMLElement>("tabs");
  const announcer = $<HTMLElement>("announcer");
  const bootedAt = Date.now();

  let dir = "~";
  let route: Route | undefined;
  let cleanup: void | (() => void);
  let block: HTMLElement | null = null;
  let history: string[] = [];
  let hIndex = -1;
  let draft = "";
  let typing = 0;

  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]").slice(-100); } catch { history = []; }

  $<HTMLElement>("brand-logo").innerHTML = leafSvg("logo", "");
  tabs.innerHTML = ROUTES.map((r) => `<a href="${r.path}" data-nav="${r.path}">${r.label}</a>`).join("");

  // Arrows appear on whichever side of the tab strip has hidden tabs.
  const tabsWrap = $<HTMLElement>("tabs-wrap");
  const updateArrows = () => {
    const max = tabs.scrollWidth - tabs.clientWidth;
    tabsWrap.toggleAttribute("data-left", tabs.scrollLeft > 2);
    tabsWrap.toggleAttribute("data-right", tabs.scrollLeft < max - 2);
  };
  tabs.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  new ResizeObserver(updateArrows).observe(tabs);
  for (const [sel, dir] of [[".tab-arrow.left", -1], [".tab-arrow.right", 1]] as const) {
    tabsWrap.querySelector(sel)!.addEventListener("click", () => tabs.scrollBy({ left: dir * tabs.clientWidth * 0.6 }));
  }

  /* -------------------------------------------------------------- */
  /* Prompt line rendering                                           */
  /* -------------------------------------------------------------- */

  const ghost = (): string => {
    const v = input.value;
    if (!v || input.selectionStart !== v.length || document.activeElement !== input) return "";
    const { start, items } = completions(v, ctx);
    if (items.length !== 1) return "";
    return items[0].slice(v.length - start);
  };

  const renderLine = () => {
    const v = input.value;
    const pos = input.selectionStart ?? v.length;
    const g = ghost();
    line.innerHTML =
      esc(v.slice(0, pos)) +
      `<span class="cur">${pos < v.length ? esc(v[pos]) : g ? esc(g[0]) : " "}</span>` +
      (pos < v.length ? esc(v.slice(pos + 1)) : g ? `<span class="ghost">${esc(g.slice(1))}</span>` : "");
    // Keep the cursor visible on long lines.
    const cur = line.querySelector<HTMLElement>(".cur");
    if (cur) line.scrollLeft = Math.max(0, cur.offsetLeft - line.clientWidth + 24);
  };

  const setValue = (v: string) => {
    input.value = v;
    input.setSelectionRange(v.length, v.length);
    renderLine();
  };

  /* -------------------------------------------------------------- */
  /* Output                                                          */
  /* -------------------------------------------------------------- */

  const scrollToBlock = (el: HTMLElement) => {
    const smooth = reduced() ? "auto" : "smooth";
    if (el.offsetHeight > screen.clientHeight * 0.8) screen.scrollTo({ top: el.offsetTop - 16, behavior: smooth });
    else screen.scrollTo({ top: screen.scrollHeight, behavior: smooth });
  };

  const newBlock = (html = "") => {
    const b = document.createElement("div");
    b.className = "block reveal";
    b.innerHTML = html;
    screen.append(b);
    block = b;
    return b;
  };

  const print = (html: string, cls = "") => {
    if (!block || !block.isConnected) newBlock();
    const out = document.createElement("div");
    out.className = `out${cls ? " " + cls : ""}`;
    out.innerHTML = html;
    block!.append(out);
    out.style.setProperty("--i", "1");
    announcer.textContent = out.textContent?.slice(0, 300) ?? "";
    scrollToBlock(block!);
  };

  /* -------------------------------------------------------------- */
  /* Navigation                                                      */
  /* -------------------------------------------------------------- */

  const updateChrome = () => {
    ps1El.innerHTML = ps1(dir);
    for (const a of tabs.querySelectorAll("a")) {
      if (a.dataset.nav === route?.path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    const cur = tabs.querySelector<HTMLElement>('[aria-current="page"]');
    if (cur) {
      // Center the active tab within the strip without scrolling the page.
      tabs.scrollTo({ left: cur.offsetLeft - (tabs.clientWidth - cur.offsetWidth) / 2 });
    }
    window.setTimeout(updateArrows, 350);
    chips.innerHTML = (CHIPS[dir] ?? CHIPS["~"]).map((c) => `<button type="button" data-run="${esc(c)}">${esc(c)}</button>`).join("");
  };

  const navigate = (path: string, opts: { push?: boolean; typed?: { from: string; cmd: string } } = {}) => {
    const r = routeByPath(path);
    const prev = route;
    route = r;
    dir = r?.dir ?? "~";
    const theme: Theme = r?.theme ?? "soil";
    const html = document.documentElement;

    if (opts.push !== false) {
      const target = r?.path ?? path;
      if (location.pathname !== target) window.history.pushState(null, "", target);
    }
    document.title = r?.title ?? `404 - ${SITE_NAME}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", r?.description ?? "");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);

    const view = renderPage(r?.path ?? path);
    const swap = () => {
      if (typeof cleanup === "function") cleanup();
      html.dataset.theme = theme;
      const lead = opts.typed && opts.typed.cmd !== r?.intro ? echo(opts.typed.from, opts.typed.cmd) : "";
      screen.innerHTML = "";
      const b = newBlock(lead + echo(dir, r?.intro ?? `cd ${path}`) + view.html);
      b.classList.remove("reveal");
      b.querySelectorAll<HTMLElement>(".reveal > *").forEach((el, i) => el.style.setProperty("--i", String(Math.min(i, 14))));
      screen.scrollTop = 0;
      cleanup = view.mount?.(b);
      block = null;
      updateChrome();
    };

    setAmbient(theme);
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    if (prev !== undefined && vt && !reduced()) vt.call(document, swap);
    else swap();
    announcer.textContent = `${r?.label ?? "not found"} page`;
  };

  const ctx: Ctx = {
    get dir() { return dir; },
    get route() { return route; },
    cd(target, typed) {
      const r = routeByDir(target);
      if (!r) return print(`cd: no such directory: ${esc(target)}`, "err");
      if (r === route) {
        // Already here: re-render so the page is fresh at the top.
        navigate(r.path, { push: false, typed: { from: dir, cmd: typed } });
        return;
      }
      navigate(r.path, { typed: { from: dir, cmd: typed } });
    },
    print,
    clear() { screen.innerHTML = ""; block = null; },
    history: () => history,
    bootedAt,
  };

  /* -------------------------------------------------------------- */
  /* Running commands                                                */
  /* -------------------------------------------------------------- */

  const exec = (raw: string) => {
    const cmd = raw.trim();
    block = newBlock(echo(dir, cmd));
    if (!cmd) return scrollToBlock(block);
    if (history[history.length - 1] !== cmd) history.push(cmd);
    history = history.slice(-100);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
    hIndex = -1;
    execute(cmd, ctx);
    if (block?.isConnected && block.childElementCount === 1) scrollToBlock(block);
  };

  /** Type a command into the prompt like a person would, then run it. */
  const typeAndRun = async (cmd: string) => {
    const id = ++typing;
    promptEl.classList.add("busy");
    if (!reduced()) {
      setValue("");
      for (const ch of cmd) {
        if (id !== typing) return;
        setValue(input.value + ch);
        await sleep(cmd.length > 18 ? 14 : 24 + Math.random() * 22);
      }
      await sleep(90);
      if (id !== typing) return;
    }
    setValue("");
    promptEl.classList.remove("busy");
    exec(cmd);
  };

  /* -------------------------------------------------------------- */
  /* Input handling                                                  */
  /* -------------------------------------------------------------- */

  const complete = () => {
    const v = input.value.slice(0, input.selectionStart ?? input.value.length);
    const { start, items } = completions(v, ctx);
    if (!items.length) return;
    const prefix = commonPrefix(items);
    const word = v.slice(start);
    if (items.length === 1) {
      const done = items[0];
      setValue(v.slice(0, start) + done + (done.endsWith("/") ? "" : " "));
    } else if (prefix.length > word.length) {
      setValue(v.slice(0, start) + prefix);
    } else {
      block = newBlock(echo(dir, v));
      print(`<div class="cols">${items.map((i) => `<span>${esc(i)}</span>`).join("")}</div>`);
    }
  };

  promptEl.addEventListener("submit", (e) => {
    e.preventDefault();
    typing++;
    promptEl.classList.remove("busy");
    const v = input.value;
    setValue("");
    exec(v);
    if (touch() && !v.trim()) input.blur();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      if (hIndex === -1) { draft = input.value; hIndex = history.length; }
      hIndex = Math.max(0, hIndex - 1);
      setValue(history[hIndex]);
    } else if (e.key === "ArrowDown") {
      if (hIndex === -1) return;
      e.preventDefault();
      hIndex++;
      if (hIndex >= history.length) { hIndex = -1; setValue(draft); } else setValue(history[hIndex]);
    } else if (e.key === "ArrowRight" && input.selectionStart === input.value.length) {
      const g = ghost();
      if (g) { e.preventDefault(); setValue(input.value + g); }
    } else if (e.key === "Escape") {
      setValue("");
    } else if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      ctx.clear();
    } else if (e.ctrlKey && (e.key === "c" || e.key === "C") && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      typing++;
      promptEl.classList.remove("busy");
      block = newBlock(echo(dir, input.value + "^C"));
      setValue("");
    } else if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
      e.preventDefault();
      setValue(input.value.slice(input.selectionStart ?? 0));
      input.setSelectionRange(0, 0);
      renderLine();
    }
  });

  input.addEventListener("input", () => { typing++; promptEl.classList.remove("busy"); renderLine(); });
  document.addEventListener("selectionchange", () => { if (document.activeElement === input) renderLine(); });
  input.addEventListener("focus", () => { promptEl.classList.add("focused"); renderLine(); });
  input.addEventListener("blur", () => { promptEl.classList.remove("focused"); renderLine(); });

  // Typing anywhere sends keys to the prompt.
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (t === input || e.metaKey || e.ctrlKey || e.altKey) return;
    if (t.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key.length === 1 && !(e.key === " " && t.closest("a, button"))) input.focus();
  });

  // Clicking empty space in the terminal focuses the prompt (desktop only).
  screen.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (touch() || t.closest("a, button, input, pre, .code, canvas")) return;
    if (!window.getSelection()?.isCollapsed) return;
    input.focus({ preventScroll: true });
  });

  // Links and command buttons anywhere in the document.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-run], a[data-nav], a[href^='/']");
    if (!el || el.getAttribute("target") === "_blank") return;
    e.preventDefault();
    const cmd = el.dataset.run ?? routeByPath(el.dataset.nav ?? el.getAttribute("href") ?? "/")?.cmd ?? "cd ~";
    typeAndRun(cmd);
    if (!touch()) input.focus({ preventScroll: true });
  });

  window.addEventListener("popstate", () => navigate(location.pathname, { push: false }));

  /* -------------------------------------------------------------- */
  /* Clock and boot                                                  */
  /* -------------------------------------------------------------- */

  const clock = $<HTMLElement>("clock");
  const tick = () => {
    const d = new Date();
    clock.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  tick();
  window.setInterval(tick, 15000);

  const boot = async () => {
    let seen = false;
    try { seen = !!sessionStorage.getItem(BOOT_KEY); sessionStorage.setItem(BOOT_KEY, "1"); } catch { /* ignore */ }
    if (seen || reduced()) return;
    document.documentElement.dataset.theme = routeByPath(location.pathname)?.theme ?? "soil";
    const lines = [
      "monstera-os 1.0 (tty1)",
      "[ <span class=\"ok\">ok</span> ] mounting /home/cyrus",
      "[ <span class=\"ok\">ok</span> ] bringing up can0 at 500 kbit/s",
      "[ <span class=\"ok\">ok</span> ] checking soil moisture",
      "[ <span class=\"ok\">ok</span> ] unfurling leaves",
      "login: cyrus",
    ];
    screen.innerHTML = '<pre class="boot"></pre>';
    const pre = screen.querySelector("pre")!;
    for (const l of lines) {
      pre.innerHTML += (pre.innerHTML ? "\n" : "") + l;
      await sleep(70);
    }
    await sleep(160);
  };

  updateChrome();
  renderLine();
  boot().then(() => {
    navigate(location.pathname, { push: false });
    if (!touch()) input.focus({ preventScroll: true });
  });
}
