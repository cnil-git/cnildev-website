// Tiny syntax highlighter for Monstera source and its MIR text format.

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MONS_KW = new Set([
  "fn", "return", "var", "const", "fluid", "comptime", "static", "atomic", "if", "else", "while",
  "for", "in", "mux", "struct", "soa", "packed", "raw", "try", "freeze", "true", "false", "never",
]);
const MONS_TYPES = /^(int|uint|bool|flo|f32|f64|[iu](?:[1-9]\d?|1[0-2]\d)|Pool|Cluster|Id|Ref|Mutex|Trap|SrcLoc)$/;

const MIR_KW = new Set([
  "fn", "const", "copy", "move", "br", "condbr", "ret", "unwrap", "field", "index", "load", "store",
  "gencheck", "boundscheck", "trap", "call", "sext", "switch", "unreachable",
]);

type Lang = "mons" | "mir";

const TOKEN = /(;;.*$|;\*[\s\S]*?\*;|;.*$)|("(?:[^"\\]|\\.)*")|(@[A-Za-z_]\w*)|(%[\w.]+|bb\d+)|(0x[\da-fA-F_]+|\d[\d_]*(?:\.\d+)?)|([A-Za-z_]\w*(?:\.(?:checked|wrap|sat))?)|(!\w+|->|[{}()[\],:=+\-*/<>^?!|%]+)/gm;

export function highlight(src: string, lang: Lang): string {
  const lines = src.split("\n").map((line) => {
    let out = "";
    let last = 0;
    line.replace(TOKEN, (m, com, str, attr, reg, num, word, op, at: number) => {
      out += esc(line.slice(last, at));
      last = at + m.length;
      let cls = "";
      if (com) cls = "t-com";
      else if (str) cls = "t-str";
      else if (attr) cls = "t-attr";
      else if (reg) cls = lang === "mir" ? "t-type" : "t-op";
      else if (num) cls = "t-num";
      else if (word) {
        const base = word.split(".")[0];
        if ((lang === "mons" ? MONS_KW : MIR_KW).has(base)) cls = "t-kw";
        else if (MONS_TYPES.test(word) || /^[A-Z]/.test(word)) cls = "t-type";
        else if (line.slice(at + m.length).startsWith("(")) cls = "t-fn";
      } else if (op) cls = op.startsWith("!") && op.length > 1 ? "t-attr" : "t-op";
      out += cls ? `<span class="${cls}">${esc(m)}</span>` : esc(m);
      return m;
    });
    out += esc(line.slice(last));
    return `<span class="ln">${out || " "}</span>`;
  });
  return lines.join("");
}
