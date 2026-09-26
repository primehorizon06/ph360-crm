#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHANGELOG = "CHANGELOG.md";
const TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "ia"];
const SECTION_BY_TYPE = {
  feat: "Added",
  ia: "Added",
  fix: "Fixed",
  docs: "Changed",
  style: "Changed",
  refactor: "Changed",
  perf: "Changed",
  test: "Changed",
  chore: "Changed",
};
const HEADER_RE = new RegExp(`^(${TYPES.join("|")})(\\(([^)]+)\\))?(!)?: (.+)$`);
const SKIP_RE = /^(Merge |Revert "|fixup! |squash! |amend! )/;

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).replace(/\r?\n$/, "");

function parseHeader(message) {
  const header = message.split(/\r?\n/)[0].trim();
  const match = HEADER_RE.exec(header);
  if (!match) return null;
  const [, type, , scope, breaking, description] = match;
  return { type, scope, breaking: Boolean(breaking), description };
}

function formatEntry({ type, scope, description }) {
  return `- **${type}**${scope ? `(${scope})` : ""}: ${description}`;
}

function insertEntry(content, section, entry) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);

  const start = lines.findIndex((l) => /^## \[Unreleased\]/i.test(l));
  if (start === -1) throw new Error(`No se encontró "## [Unreleased]" en ${CHANGELOG}`);
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;

  if (lines.slice(start, end).includes(entry)) return null;

  const sectionIdx = lines.findIndex(
    (l, i) => i > start && i < end && l.trim() === `### ${section}`,
  );

  if (sectionIdx === -1) {
    let at = end;
    while (at > start + 1 && lines[at - 1].trim() === "") at--;
    lines.splice(at, 0, "", `### ${section}`, "", entry);
  } else {
    let at = sectionIdx + 1;
    while (at < end && !/^###? /.test(lines[at])) at++;
    while (at > sectionIdx + 1 && lines[at - 1].trim() === "") at--;
    if (at === sectionIdx + 1) lines.splice(at, 0, "", entry);
    else lines.splice(at, 0, entry);
  }

  return lines.join(eol);
}

function validate(msgFile) {
  const message = readFileSync(msgFile, "utf8");
  const header = message.split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) ?? "";
  if (SKIP_RE.test(header) || parseHeader(header)) return;

  console.error(
    [
      "",
      `✖ Mensaje de commit inválido: "${header}"`,
      "",
      "  Formato: <type>(<scope>): <descripción>",
      `  Tipos:   ${TYPES.join(", ")}`,
      "  Ejemplo: feat(products): permite administrar el catálogo de productos",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

function update() {
  if (process.env.CHANGELOG_HOOK === "1") return;

  const gitDir = git("rev-parse", "--git-dir");
  if (["rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD"].some((f) => existsSync(join(gitDir, f))))
    return;

  if (git("rev-list", "--parents", "-n", "1", "HEAD").split(" ").length > 2) return;

  const subject = git("log", "-1", "--format=%s");
  if (SKIP_RE.test(subject)) return;
  const parsed = parseHeader(subject);
  if (!parsed) return;

  const touched = git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD").split(/\r?\n/);
  if (touched.includes(CHANGELOG)) return;

  if (git("status", "--porcelain", "--", CHANGELOG)) {
    console.warn(`⚠ ${CHANGELOG} tiene cambios sin commitear; no se actualiza automáticamente.`);
    return;
  }

  const section = parsed.breaking ? "Changed" : SECTION_BY_TYPE[parsed.type];
  const next = insertEntry(readFileSync(CHANGELOG, "utf8"), section, formatEntry(parsed));
  if (next === null) return;

  writeFileSync(CHANGELOG, next);
  execFileSync(
    "git",
    ["commit", "-q", "--amend", "--no-edit", "--no-verify", "--only", "--", CHANGELOG],
    { stdio: "inherit", env: { ...process.env, CHANGELOG_HOOK: "1" } },
  );
  console.log(`✔ ${CHANGELOG} actualizado en "### ${section}"`);
}

function add(message) {
  const parsed = parseHeader(message ?? "");
  if (!parsed) {
    console.error('Uso: npm run changelog -- "<type>(<scope>): <descripción>"');
    process.exit(1);
  }
  const section = parsed.breaking ? "Changed" : SECTION_BY_TYPE[parsed.type];
  const next = insertEntry(readFileSync(CHANGELOG, "utf8"), section, formatEntry(parsed));
  if (next === null) {
    console.log("La entrada ya existe en el changelog.");
    return;
  }
  writeFileSync(CHANGELOG, next);
  console.log(`✔ Agregado a "### ${section}"`);
}

const [command, arg] = process.argv.slice(2);
if (command === "validate") validate(arg);
else if (command === "update") update();
else add(command);
