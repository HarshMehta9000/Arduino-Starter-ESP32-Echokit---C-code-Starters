/**
 * A small C++ tokenizer, enough for the two files in this repository.
 *
 * Shipping a full highlighter for 95 lines would be a poor trade. This handles
 * the token classes those files actually contain: comments, preprocessor lines,
 * strings, numbers, keywords, Arduino built-ins and identifiers.
 */

export type TokenKind =
  | "comment"
  | "preproc"
  | "string"
  | "number"
  | "keyword"
  | "builtin"
  | "type"
  | "punct"
  | "plain";

export type Token = { kind: TokenKind; text: string };

const KEYWORDS = new Set([
  "if", "else", "for", "while", "return", "break", "continue", "static",
  "const", "void", "true", "false", "switch", "case", "default", "struct",
  "class", "sizeof", "typedef", "enum",
]);

const TYPES = new Set([
  "int", "bool", "char", "long", "unsigned", "float", "double", "short",
  "byte", "word", "uint8_t", "uint16_t", "uint32_t", "size_t",
]);

/** Arduino core identifiers that appear in these files. */
const BUILTINS = new Set([
  "pinMode", "digitalRead", "digitalWrite", "analogRead", "analogWrite",
  "millis", "delay", "map", "Serial", "begin", "println", "print",
  "setup", "loop", "HIGH", "LOW", "INPUT", "OUTPUT", "INPUT_PULLUP", "A0",
]);

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;

export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;

  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind) prev.text += text;
    else out.push({ kind, text });
  };

  // A preprocessor directive owns the whole line.
  if (/^\s*#/.test(line)) {
    return [{ kind: "preproc", text: line }];
  }

  while (i < line.length) {
    const ch = line[i];
    const two = line.slice(i, i + 2);

    if (two === "//") {
      push("comment", line.slice(i));
      break;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      push("string", line.slice(i, Math.min(j + 1, line.length)));
      i = j + 1;
      continue;
    }

    if (DIGIT.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.xXa-fA-F]/.test(line[j])) j++;
      push("number", line.slice(i, j));
      i = j;
      continue;
    }

    if (IDENT_START.test(ch)) {
      let j = i;
      while (j < line.length && IDENT_CHAR.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) push("keyword", word);
      else if (TYPES.has(word)) push("type", word);
      else if (BUILTINS.has(word)) push("builtin", word);
      else push("plain", word);
      i = j;
      continue;
    }

    if (/[{}()[\];,.<>=!+\-*/%&|^~?:]/.test(ch)) {
      push("punct", ch);
      i++;
      continue;
    }

    push("plain", ch);
    i++;
  }

  return out;
}

export const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: "text-ink-faint italic",
  preproc: "text-alarm",
  string: "text-ok",
  number: "text-led",
  keyword: "text-trace",
  builtin: "text-trace-soft",
  type: "text-trace",
  punct: "text-ink-dim",
  plain: "text-ink",
};
