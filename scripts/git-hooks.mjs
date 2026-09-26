#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const SCHEMA = "prisma/schema.prisma";
const MIGRATION_RE = /^prisma\/migrations\/[^/]+\/migration\.sql$/;
const PRISMA_CLI = "node_modules/prisma/build/index.js";
const NULL_SHA = /^0+$/;

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).replace(/\r?\n$/, "");

const lines = (s) => (s ? s.split(/\r?\n/) : []);

function stagedFiles() {
  return lines(git("diff", "--cached", "--name-status", "--diff-filter=ACMRD")).map((l) => {
    const [status, ...paths] = l.split("\t");
    return { status: status[0], path: paths[paths.length - 1] };
  });
}

const stripPrismaComments = (src) =>
  src
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter(Boolean)
    .join("\n");

function showOrEmpty(ref) {
  try {
    return git("show", ref);
  } catch {
    return "";
  }
}

function checkPrisma(staged) {
  const errors = [];
  const schema = staged.find((f) => f.path === SCHEMA && f.status !== "D");
  if (!schema) return errors;

  if (existsSync(PRISMA_CLI)) {
    const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "postgresql://u:p@localhost:5432/db" };
    try {
      execFileSync(process.execPath, [PRISMA_CLI, "validate"], { env, stdio: "pipe" });
    } catch (e) {
      errors.push(`El esquema de Prisma no es válido:\n${String(e.stdout || "") + String(e.stderr || "")}`.trim());
      return errors;
    }

    if (git("diff", "--name-only", "--", SCHEMA)) {
      console.warn(`⚠ ${SCHEMA} tiene cambios sin agregar; no se formatea automáticamente.`);
    } else {
      execFileSync(process.execPath, [PRISMA_CLI, "format"], { env, stdio: "pipe" });
      if (git("diff", "--name-only", "--", SCHEMA)) {
        git("add", "--", SCHEMA);
        console.log(`✔ ${SCHEMA} formateado con prisma format`);
      }
    }
  } else {
    console.warn("⚠ Prisma CLI no está instalado en node_modules; se omite validate/format.");
  }

  const hasHead = Boolean(showOrEmpty("HEAD"));
  const before = stripPrismaComments(showOrEmpty(`HEAD:${SCHEMA}`));
  const after = stripPrismaComments(showOrEmpty(`:${SCHEMA}`));
  const hasMigration = staged.some((f) => f.status === "A" && MIGRATION_RE.test(f.path));

  if (hasHead && before !== after && !hasMigration) {
    errors.push(
      [
        `Cambiaste ${SCHEMA} pero no hay una migración nueva en el commit.`,
        "  Créala en el contenedor y agrégala:",
        "    docker-compose exec nextjs-dev npx prisma migrate dev --name <descripcion>",
        "    git add prisma/migrations",
      ].join("\n"),
    );
  }

  return errors;
}

const ENV_FILE_RE = /(^|\/)\.env(\.[^/]*)?$/;
const PLACEHOLDER_RE = /placeholder|example|changeme|change-me|your[-_]|dummy|xxx|development|\$\{|<[^>]+>/i;
const SECRET_PATTERNS = [
  { name: "llave privada", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "secreto de la app",
    re: /\b(ENCRYPTION_KEY|NEXTAUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|JWT_SECRET)\b\s*[:=]\s*["']?([^"'\s]{12,})/,
    value: 2,
  },
  { name: "token JWT (p. ej. llave de Supabase)", re: /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/ },
  {
    name: "cadena de conexión con contraseña",
    re: /\bpostgres(?:ql)?:\/\/[^:\s/"']+:([^@\s"']+)@(?!localhost|127\.0\.0\.1|postgres[:/])/,
    value: 1,
  },
];
const SKIP_SCAN_RE = /(^|\/)(package-lock\.json|CHANGELOG\.md)$/;

function checkSecrets(staged) {
  const errors = [];

  for (const f of staged) {
    if (f.status !== "D" && ENV_FILE_RE.test(f.path) && !f.path.endsWith(".env.example"))
      errors.push(`No se deben commitear archivos de entorno: ${f.path}`);
  }

  let file = null;
  let lineNo = 0;
  for (const l of lines(git("diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR"))) {
    if (l.startsWith("+++ ")) {
      file = l.startsWith("+++ b/") ? l.slice(6) : null;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (!file || !l.startsWith("+")) continue;
    const content = l.slice(1);
    if (!SKIP_SCAN_RE.test(file)) {
      for (const p of SECRET_PATTERNS) {
        const m = p.re.exec(content);
        if (m && !(p.value && PLACEHOLDER_RE.test(m[p.value])))
          errors.push(`Posible ${p.name} en ${file}:${lineNo}`);
      }
    }
    lineNo++;
  }

  if (errors.length)
    errors.push("  Si es un falso positivo, commitea con --no-verify.");
  return errors;
}

function preCommit() {
  const staged = stagedFiles();
  const errors = [...checkPrisma(staged), ...checkSecrets(staged)];
  if (!errors.length) return;
  console.error(`\n✖ Commit bloqueado:\n\n${errors.join("\n")}\n`);
  process.exit(1);
}

function reportChanges(from, to) {
  if (!from || !to || NULL_SHA.test(from) || from === to) return;
  let changed;
  try {
    changed = lines(git("diff", "--name-only", from, to));
  } catch {
    return;
  }

  const notes = [];
  if (changed.some((p) => p === "package.json" || p === "package-lock.json"))
    notes.push("Cambiaron las dependencias → npm install (WSL) y npm run docker:install");
  if (changed.some((p) => MIGRATION_RE.test(p)))
    notes.push("Hay migraciones nuevas → npm run docker:migrate && docker restart crm-nextjs-dev");
  else if (changed.includes(SCHEMA))
    notes.push("Cambió el esquema de Prisma → docker-compose exec nextjs-dev npx prisma generate");

  if (notes.length) console.log(`\n⚠ ${notes.join("\n⚠ ")}\n`);
}

function readOrigHead() {
  try {
    return git("rev-parse", "--verify", "-q", "ORIG_HEAD");
  } catch {
    return "";
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === "pre-commit") preCommit();
else if (command === "post-merge") reportChanges(readOrigHead(), git("rev-parse", "HEAD"));
else if (command === "post-rewrite" && args[0] === "rebase") reportChanges(readOrigHead(), git("rev-parse", "HEAD"));
else if (command === "post-checkout" && args[2] === "1") reportChanges(args[0], args[1]);
else if (command && !["post-rewrite", "post-checkout"].includes(command)) {
  console.error(`Comando desconocido: ${command}`);
  process.exit(1);
}
