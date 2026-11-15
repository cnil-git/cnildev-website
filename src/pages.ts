// Page bodies. Each returns HTML plus an optional mount hook for the
// interactive bits; the hook may return a cleanup function.

import { EMAIL, LINKS, PERSON, PLANTS, PROJECTS, STACK, TIMELINE, type Project } from "./content";
import { esc, highlight } from "./highlight";
import { leafSvg } from "./leaf";
import { mountPlant } from "./plant";

export interface PageView {
  html: string;
  mount?(root: HTMLElement): void | (() => void);
}

const run = (cmd: string, label = cmd) =>
  `<button type="button" class="cmdlink" data-run="${esc(cmd)}">${esc(label)}</button>`;

const tags = (list: string[], on = 0) =>
  list.map((t, i) => `<span class="tag${i < on ? " on" : ""}">${esc(t)}</span>`).join("");

const ext = (url: string, label: string) =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(label)} &#8599;</a>`;

const PERMS: Record<Project["visibility"], string> = {
  public: "drwxr-xr-x",
  private: "drwx------",
  planned: "d-w-------",
};

export function portrait(small = false): string {
  return `<figure class="portrait${small ? " small" : ""}">
    <div class="portrait-img" role="img" aria-label="Pixel portrait of Cyrus"></div>
    <figcaption>cyrus.png</figcaption>
  </figure>`;
}

export function projectCard(p: Project): string {
  const where =
    p.visibility === "private"
      ? `<span class="muted">source is private</span>`
      : p.url
        ? ext(p.url, p.url.replace("https://", ""))
        : "";
  const more = p.page ? `<a href="${p.page}" data-nav="${p.page}">read more &gt;</a>` : "";
  return `<article class="proj" id="p-${p.slug}">
    <header><h3>${esc(p.name)}</h3><span class="muted">${esc(p.role)} / ${esc(p.when)}</span></header>
    <p>${esc(p.body)}</p>
    ${p.points.length ? `<ul class="list">${p.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <div class="meta">${tags(p.stack, 2)}</div>
    <div class="links">${more}${where}</div>
  </article>`;
}

/* ~ ------------------------------------------------------------------ */

function home(): PageView {
  const featured = [
    { href: "/monstera", k: "building", t: "Monstera Lang", d: "A safe-by-default systems language for microcontrollers, and its compiler." },
    { run: "cat lbr-firmware", href: "/projects", k: "shipping", t: "Race car firmware", d: "Eleven CAN nodes, one shared clock, and telemetry from a Baja SAE car." },
    { href: "/garden", k: "growing", t: "The garden", d: "Houseplants, monsteras, and a plant you can water from the terminal." },
    { href: "/ethos", k: "believing", t: "Ethos", d: "I build for life. I do not build weapons." },
  ];
  return {
    html: `<section class="page reveal">
      <div class="hero">
        <div class="hero-logo">${leafSvg("logo", "Monstera leaf, Cyrus's mark")}</div>
        <div>
          <div class="kicker">hello, world</div>
          <h1>Cyrus <span class="accent">Nilforooshan</span></h1>
          <div class="role-line">&gt; <span class="hl typed" id="role">${PERSON.roles[0]}</span></div>
        </div>
      </div>
      <p class="lead">I write firmware for race cars, design a programming language for microcontrollers, and keep a small jungle of houseplants alive. I like things that <em>grow</em>: codebases, teams, and monsteras.</p>
      <dl class="kv">
        <dt>now</dt><dd>firmware captain @ <a href="${LINKS.baja}" target="_blank" rel="noopener noreferrer">Longhorn Baja Racing</a>, ${PERSON.school}</dd>
        <dt>building</dt><dd><a href="/monstera" data-nav="/monstera">Monstera Lang</a>, an embedded systems language</dd>
        <dt>growing</dt><dd>monsteras, mostly. ${run("water")} one?</dd>
        <dt>runs on</dt><dd>CachyOS, zsh, neovim</dd>
      </dl>
      <div class="grid two">
        ${featured
          .map(
            (f) => `<a class="card" href="${f.href}" ${f.run ? `data-run="${f.run}"` : `data-nav="${f.href}"`}>
              <div class="kicker">${f.k}</div><h3>${f.t}</h3><p>${f.d}</p></a>`,
          )
          .join("")}
      </div>
      <p class="muted">This site is a shell. Type ${run("help")} to see what it can do, use <kbd>Tab</kbd> to complete and <kbd>&uarr;</kbd> for history, or just click around.</p>
    </section>`,
    mount(root) {
      const el = root.querySelector<HTMLElement>("#role");
      if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let i = 0, pos = el.textContent!.length, deleting = false, wait = 26;
      const id = window.setInterval(() => {
        if (wait-- > 0) return;
        const word = PERSON.roles[i];
        if (!deleting) {
          if (pos < word.length) el.textContent = word.slice(0, ++pos);
          else { deleting = true; wait = 34; }
        } else if (pos > 0) el.textContent = word.slice(0, --pos);
        else { deleting = false; i = (i + 1) % PERSON.roles.length; wait = 4; }
      }, 55);
      return () => window.clearInterval(id);
    },
  };
}

/* ~/about ------------------------------------------------------------ */

function about(): PageView {
  return {
    html: `<section class="page reveal">
      <div class="about-hero">
        <div>
          <div class="kicker">whoami</div>
          <h1>I'm <span class="accent">Cyrus</span>.</h1>
          <p class="lead">Cyrus Nilforooshan. Taha is my legal name, but almost everyone knows me as Cyrus.</p>
        </div>
        ${portrait()}
      </div>
      <p>I'm an embedded engineer, a full stack developer, and a biophile. I lead firmware at Longhorn Baja Racing at UT Austin, where I build the systems that let an off-road race car measure itself: CAN-bus sensor nodes, logging, telemetry, dynamometer software, and the tools around them. Before that I programmed competition robots with FRC Team 10014 REBELLION.</p>
      <p>My biggest personal project is <a href="/monstera" data-nav="/monstera">Monstera Lang</a>, a systems language for embedded targets that is safe by default and honest about cost. When I'm not at a keyboard, I'm usually repotting something.</p>

      <h2>How I work</h2>
      <ul class="list">
        <li>Design before code. Write it down, argue with it, then build it.</li>
        <li>Simulate the real thing. My host tests and simulators run the exact logic that gets flashed.</li>
        <li>Sanitizers on, warnings as errors, golden fixtures for every binary format.</li>
        <li>Leave it maintainable. The next person on the team should be able to own it.</li>
        <li>Sign it. Everything I build carries a small monstera leaf.</li>
      </ul>

      <h2>Stack</h2>
      <dl class="kv">${Object.entries(STACK)
        .map(([k, v]) => `<dt>${k}</dt><dd>${v.map(esc).join(", ")}</dd>`)
        .join("")}</dl>

      <h2>Log</h2>
      <dl class="kv">${TIMELINE.map((e) => `<dt>${e.when}</dt><dd>${esc(e.what)}</dd>`).join("")}</dl>

      <p class="muted">Next: ${run("cd ~/projects", "./projects")} or ${run("cd ~/garden", "./garden")}</p>
    </section>`,
  };
}

/* ~/projects --------------------------------------------------------- */

function projects(): PageView {
  const rows = PROJECTS.map(
    (p) => `<tr>
      <td class="perm">${PERMS[p.visibility]}</td>
      <td class="date">${p.date}</td>
      <td class="name"><button type="button" data-run="cat ${p.slug}">${p.slug}/</button></td>
      <td class="desc">${esc(p.pitch)}</td>
    </tr>`,
  ).join("");
  const count = PROJECTS.length;
  return {
    html: `<section class="page reveal">
      <div class="kicker">ls -l ~/projects</div>
      <h1>Things I've <span class="accent">built</span>.</h1>
      <p class="lead">Firmware, compilers, tools, and the odd web app. Click a name, or type <code>cat &lt;name&gt;</code>.</p>
      <table class="ls">
        <thead><tr><th>mode</th><th>modified</th><th>name</th><th>about</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted">total ${count}. <span class="hl">drwxr-xr-x</span> public source, <span class="hl">drwx------</span> private (team or in development), <span class="hl">d-w-------</span> planned.</p>
      <h2>Featured</h2>
      ${PROJECTS.filter((p) => p.featured).map(projectCard).join("")}
      <p class="muted">${run("cat --all", "cat --all")} prints every project.</p>
    </section>`,
  };
}

/* ~/monstera --------------------------------------------------------- */

export const DECLS = `;; Declarations. Immutable unless you say otherwise.
int x = 1;                 ; immutable (const is the default)
var int z = 0;             ; mutable
fluid int w = 0;           ; must be reassigned on every path
comptime int N = 64;       ; compile-time constant

;; Anything that can fail is proven safe, handled, or traps.
int ratio = total / count else 0;   ; unproven divisor needs else
u8 b = u8(raw) else 255;            ; lossy cast must be handled
int t = a +| b;                     ; saturating add
int s = a +% b;                     ; wrapping add`;

export const MIR = `fn sum(%nodes: Pool(Node)^, %head: ?Id(Node)) -> i64 {
bb0:
    %total0 = const 0 : i64
    br bb1(%total0, %head)
bb1(%total: i64, %cur: ?Id(Node)):
    %some, %id = unwrap %cur
    condbr %some, bb2, bb3
bb2:
    gencheck %nodes, %id
    %n = index %nodes, %id : Node^ !nonnull
    %v = field %n, value : int
    %v64 = sext %v : i64
    %t2 = add.checked %total, %v64 : i64
    %next = field %n, next : ?Id(Node)
    br bb1(%t2, %next)
bb3:
    ret %total
}`;

export function code(file: string, lang: "mons" | "mir", src: string, note: string): string {
  return `<div class="code"><div class="code-head"><span>${file}</span><span>${note}</span></div><pre><code>${highlight(src, lang)}</code></pre></div>`;
}

function monstera(): PageView {
  const goals = [
    ["Safe by default", "Undefined behavior only inside explicit raw code."],
    ["Predictable cost", "Every allocation, check, and dynamic dispatch is visible in the source."],
    ["Readable", "One obvious way to do things."],
    ["Familiar", "If it looks like C, Rust, or Python, it means the same thing."],
    ["Optimizable", "The language hands the optimizer facts: no null, exclusive writes, known regions."],
    ["Concise", "Last on purpose."],
  ];
  const stages = [
    ["source", ".mon"], ["tokens", "lexer"], ["syntax", "lossless tree"], ["AST", ""], ["HIR", "typed"],
    ["MIR", "SSA + facts"], ["check", "memory safety"], ["opt", "+ Pruner"], ["backend", "C / Cranelift / LLVM"],
  ];
  const milestones = [
    "hello world through the C backend",
    "ring buffer and RPN calculator",
    "memory checker",
    "pools and handles",
    "strings",
    "formatter and JSON diagnostics",
    "blink an LED on a real Cortex-M or RISC-V board",
    "Cranelift backend and language server",
    "benchmarks against C and Rust, published",
  ];
  return {
    html: `<section class="page reveal">
      <div class="kicker">README.mons</div>
      <h1>Monstera <span class="accent">Lang</span></h1>
      <p class="lead">A safe-by-default systems language with predictable cost, built for embedded targets. No garbage collector, no lifetime annotations, and nothing that fails is ever undefined behavior.</p>
      <div class="callout">
        <h3>status: early development</h3>
        <p>The language design is at draft 0.2 and the compiler architecture is scaffolded in Rust. It does not compile programs yet. I'm co-building it with one other developer: I own the middle and back end (MIR, the memory checker, the optimizer, backends, runtime, and embedded targets).</p>
      </div>

      <h2>Goals, in order</h2>
      <div class="values">${goals
        .map(([t, d], i) => `<div class="value"><span class="num">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></div>`)
        .join("")}</div>

      <h2>A taste</h2>
      ${code("syntax.mon", "mons", DECLS, "draft 0.2, subject to change")}
      <p class="muted"><code>;</code> ends a statement and starts a comment. <code>//</code> is deliberately an error.</p>

      <h2>Memory without a GC or lifetimes</h2>
      <ul class="list">
        <li><b>Pointers stay local.</b> <code>T^</code> and <code>T*</code> never live in struct fields or statics.</li>
        <li><b>Derived returns.</b> A function may return a pointer only if it takes exactly one.</li>
        <li><b><code>*</code> is exclusive.</b> While a writable pointer is live, nothing else touches that place.</li>
        <li><b>Stored references are handles.</b> <code>Id(T)</code> into a Pool, <code>Ref(T)</code> into a Cluster, both generation-checked. A stale handle traps; it is never UB.</li>
      </ul>
      <p>Each function is checked on its own, using only the signatures it calls, so checking is parallel and incremental.</p>

      <h2>The pipeline</h2>
      <div class="pipeline">${stages
        .map(([b, s], i) => `${i ? '<span class="arrow">&rarr;</span>' : ""}<div class="stage"><b>${b}</b><span>${s || "&nbsp;"}</span></div>`)
        .join("")}</div>

      <h2>MIR, the part I own</h2>
      <p>SSA over basic blocks, typed values, a source span on every instruction, and facts like <code>!nonnull</code>, <code>!noalias</code>, and <code>!range</code> attached to values so they flow into LLVM. Safety checks are real instructions, so passes can hoist them out of loops or prove them away. The text format round-trips exactly, which is how I test the back end before the front end exists.</p>
      ${code("sum.mir", "mir", MIR, "walk a linked list stored in a Pool")}
      <ul class="list">
        <li><code>comptime</code> runs on a MIR interpreter, so compile time and run time agree by construction.</li>
        <li>The Pruner rewrites MIR with data-driven rules; automatic rules are proven equivalent with Z3 before they ship.</li>
        <li>Backends: C to bootstrap, Cranelift for fast debug builds, LLVM for release and embedded.</li>
      </ul>

      <h2>Embedded first</h2>
      <ul class="list">
        <li>First targets: ARM Cortex-M0+ and M4F, RISC-V ESP32-C3 and C6.</li>
        <li><code>@interrupt(NAME)</code> is checked against the target's vector table.</li>
        <li><code>monstera size</code> reports flash and RAM per function and worst-case stack per task.</li>
        <li><code>monstera flash</code> wraps probe-rs or OpenOCD. The core library needs no allocator and no OS.</li>
      </ul>

      <h2>Roadmap</h2>
      <dl class="kv">${milestones.map((m, i) => `<dt>M${i + 1}</dt><dd>${m}</dd>`).join("")}</dl>
      <p class="muted">The source is private while the foundations settle. Try ${run("monstera --version")}.</p>
    </section>`,
  };
}

/* ~/garden ----------------------------------------------------------- */

function garden(): PageView {
  return {
    html: `<section class="page reveal">
      <div class="kicker">./garden --status</div>
      <h1>The <span class="accent">garden</span></h1>
      <p class="lead">I'm a biophile: I love living things, and I'm happiest surrounded by them. Between projects, I'm usually taking care of my houseplants. Monsteras most of all, which is why the leaf ended up as my mark and the name of my language.</p>
      <div class="plant-stage">
        <div class="pot"><canvas id="plant" aria-label="A monstera that grows each time you water it" role="img"></canvas></div>
        <div>
          <dl class="kv">
            <dt>plant</dt><dd>Monstera deliciosa</dd>
            <dt>leaves</dt><dd id="g-leaves">-</dd>
            <dt>watered</dt><dd id="g-waters">-</dd>
            <dt>mood</dt><dd id="g-mood">-</dd>
          </dl>
          <div class="meter" style="margin-top:14px" aria-hidden="true"><i id="g-meter" style="width:0"></i></div>
          <p style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap">
            <button type="button" class="btn" data-run="water">water it</button>
            <button type="button" class="btn ghost" data-run="fortune">fortune</button>
          </p>
          <p class="muted" style="margin-top:10px">This one grows each time you water it, and remembers you on this device.</p>
        </div>
      </div>

      <h2>The collection</h2>
      <div class="grid">${PLANTS.map((p) => `<div class="card"><div class="kicker">${esc(p.latin)}</div><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p></div>`).join("")}</div>

      <h2>Why a biophile writes firmware</h2>
      <ul class="list">
        <li>Plants and embedded systems want the same things: stable conditions, patience, and someone paying attention.</li>
        <li>Both punish neglect slowly, then all at once.</li>
        <li>Good systems grow. You prune, you repot, you give them structure to climb.</li>
        <li>Nothing I make should be built to end life. More on that in ${run("cd ~/ethos", "./ethos")}.</li>
      </ul>
    </section>`,
    mount(root) {
      return mountPlant(root);
    },
  };
}

/* ~/ethos ------------------------------------------------------------ */

function ethos(): PageView {
  const values = [
    ["Build for life", "I love life, all of it. I want what I make to help people, teams, and living things grow."],
    ["Safe by default", "Failure should be loud, contained, and explainable. No undefined behavior, in code or in conduct."],
    ["Honest status", "Say what works, what doesn't, and what's still a plan. Demos should never pretend."],
    ["Leave it better", "Docs, tests, and tools the next person can own. A codebase is a garden; tend it."],
  ];
  return {
    html: `<section class="page reveal">
      <div class="kicker">cat ~/ethos/values.txt</div>
      <h1>What I <span class="accent">stand</span> for.</h1>
      <p class="lead">Embedded engineering decides what machines can do in the physical world. That makes it worth being clear about what I will and will not help build.</p>
      <div class="callout">
        <h3>I don't do defense work.</h3>
        <p>I won't build weapons, targeting, or military systems, and I don't work for defense contractors. Firmware, sensing, and control skills are in heavy demand there. Mine aren't for that. I'd rather build things that keep living things alive.</p>
      </div>
      <div class="values">${values
        .map(([t, d], i) => `<div class="value"><span class="num">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></div>`)
        .join("")}</div>
      <p class="muted">If your work fits, I'd love to hear about it: ${run("cd ~/contact", "./contact")}</p>
    </section>`,
  };
}

/* ~/contact ---------------------------------------------------------- */

function contact(): PageView {
  const rows = [
    ...(EMAIL ? [["email", EMAIL, `mailto:${EMAIL}`]] : []),
    ["github", LINKS.github.replace("https://", ""), LINKS.github],
    ["team", "github.com/longhorn-baja-racing", LINKS.baja],
    ["source", "this site, on github", LINKS.source],
  ];
  return {
    html: `<section class="page reveal">
      <div class="kicker">ping cyrus</div>
      <pre class="out ping" id="ping"></pre>
      <h1>Say <span class="accent">hello</span>.</h1>
      <p class="lead">Open to embedded, firmware, compiler, and full stack work that helps people and living things. Plant swaps, too.</p>
      <div class="links-big">${rows
        .map(
          ([k, v, href]) =>
            `<a href="${href}" ${href.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener noreferrer"'}><span class="k">${k}</span><span class="v">${esc(v)}</span><span class="arr">&#8599;</span></a>`,
        )
        .join("")}</div>
    </section>`,
    mount(root) {
      const pre = root.querySelector<HTMLElement>("#ping");
      if (!pre) return;
      const lines = [
        `PING cyrus (127.0.0.1) 56(84) bytes of data.`,
        ...[0, 1, 2].map((i) => `64 bytes from cyrus: icmp_seq=${i + 1} ttl=64 time=${(0.03 + Math.random() * 0.05).toFixed(3)} ms <span class="ok">ok</span>`),
        `--- cyrus ping statistics ---`,
        `3 packets transmitted, 3 received, 0% packet loss`,
      ];
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { pre.innerHTML = lines.join("\n"); return; }
      let i = 0;
      const id = window.setInterval(() => {
        pre.innerHTML = lines.slice(0, ++i).join("\n");
        if (i >= lines.length) window.clearInterval(id);
      }, 260);
      return () => window.clearInterval(id);
    },
  };
}

function notFound(path: string): PageView {
  return {
    html: `<section class="page reveal">
      <div class="kicker">404</div>
      <h1>No such <span class="accent">directory</span>.</h1>
      <p class="lead"><code>${esc(path)}</code> doesn't exist. Maybe it was pruned.</p>
      <p>Try ${run("ls")}, ${run("cd ~", "cd ~")}, or ${run("help")}.</p>
    </section>`,
  };
}

const PAGES: Record<string, () => PageView> = {
  "/": home,
  "/about": about,
  "/projects": projects,
  "/monstera": monstera,
  "/garden": garden,
  "/ethos": ethos,
  "/contact": contact,
};

export function renderPage(path: string): PageView {
  return (PAGES[path] ?? (() => notFound(path)))();
}
