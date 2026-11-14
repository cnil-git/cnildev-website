// Route table. Kept free of DOM and other imports so vite.config.ts can read
// it at build time to emit one static HTML file per route.

export type Theme = "soil" | "sunlit" | "pcb" | "ide" | "greenhouse" | "dawn" | "signal";

export interface Route {
  /** URL path. */
  path: string;
  /** Directory shown in the prompt. */
  dir: string;
  /** Short label used in navigation. */
  label: string;
  /** Command typed when this page is opened from the nav. */
  cmd: string;
  /** Command echoed at the top of the page. */
  intro: string;
  title: string;
  description: string;
  theme: Theme;
}

export const SITE_NAME = "Cyrus Nilforooshan";

export const ROUTES: Route[] = [
  {
    path: "/",
    dir: "~",
    label: "home",
    cmd: "cd ~",
    intro: "neofetch --short",
    title: "Cyrus Nilforooshan",
    description:
      "Cyrus Nilforooshan: embedded engineer, full stack developer, and biophile. Building Monstera Lang, a programming language for embedded systems.",
    theme: "soil",
  },
  {
    path: "/about",
    dir: "~/about",
    label: "about",
    cmd: "cd ~/about",
    intro: "whoami --verbose",
    title: "About - Cyrus Nilforooshan",
    description: "Who I am, what I work on, and the tools I reach for.",
    theme: "sunlit",
  },
  {
    path: "/projects",
    dir: "~/projects",
    label: "projects",
    cmd: "cd ~/projects",
    intro: "ls -l ~/projects",
    title: "Projects - Cyrus Nilforooshan",
    description: "Firmware, tooling, and software projects by Cyrus Nilforooshan.",
    theme: "pcb",
  },
  {
    path: "/monstera",
    dir: "~/monstera",
    label: "monstera",
    cmd: "cd ~/monstera",
    intro: "cat ~/monstera/README.mons",
    title: "Monstera Lang - Cyrus Nilforooshan",
    description: "Monstera Lang: a programming language for embedded systems.",
    theme: "ide",
  },
  {
    path: "/garden",
    dir: "~/garden",
    label: "garden",
    cmd: "cd ~/garden",
    intro: "./garden --status",
    title: "Garden - Cyrus Nilforooshan",
    description: "Houseplants, monsteras, and why a biophile writes firmware.",
    theme: "greenhouse",
  },
  {
    path: "/ethos",
    dir: "~/ethos",
    label: "ethos",
    cmd: "cd ~/ethos",
    intro: "cat ~/ethos/values.txt",
    title: "Ethos - Cyrus Nilforooshan",
    description: "What I build, what I will not build, and why.",
    theme: "dawn",
  },
  {
    path: "/contact",
    dir: "~/contact",
    label: "contact",
    cmd: "cd ~/contact",
    intro: "ping cyrus",
    title: "Contact - Cyrus Nilforooshan",
    description: "How to reach Cyrus Nilforooshan.",
    theme: "signal",
  },
];

export function routeByPath(path: string): Route | undefined {
  const clean = path.replace(/\/+$/, "") || "/";
  return ROUTES.find((r) => r.path === clean);
}

export function routeByDir(dir: string): Route | undefined {
  return ROUTES.find((r) => r.dir === dir);
}
