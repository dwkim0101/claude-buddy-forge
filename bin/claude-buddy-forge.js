#!/usr/bin/env node

// Claude Code runs under Bun and uses Bun.hash() (wyhash) for buddy
// generation.  If we run under Node the hash differs, producing wrong
// buddies.  Re-exec under Bun when available so Bun.hash() is accessible.
if (typeof globalThis.Bun === "undefined") {
  try {
    const { execFileSync: efs, spawnSync } = await import("node:child_process");
    const bunPath = efs("which", ["bun"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    if (bunPath) {
      const r = spawnSync(bunPath, process.argv.slice(1), { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
  } catch {
    // Bun not found — continue under Node.
    console.error(
      "⚠️  Bun runtime not found. Claude Code uses Bun.hash() for buddy generation.\n" +
      "   Without Bun, the forge may produce wrong buddy results.\n" +
      "   Install Bun: curl -fsSL https://bun.sh/install | bash\n"
    );
  }
}

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { execFileSync } from "node:child_process";
import BUDDY_DATA from "../lib/buddy-catalog.js";

const ORIGINAL_SALT = "friend-2026-401";
const DEFAULT_PROGRESS_EVERY = 500_000;
const DEFAULT_MAX_ATTEMPTS = 50_000_000;
const ULTRA_TARGET = {
  rarity: "legendary",
  shiny: true,
  species: "dragon",
  hat: "tinyduck",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Claude Buddy Forge

Usage:
  claude-buddy-forge guided
  claude-buddy-forge current
  claude-buddy-forge catalog
  claude-buddy-forge search --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
  claude-buddy-forge apply --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
  claude-buddy-forge restore

Path flags:
  --launcher <path>
  --config <path>

Search flags:
  --rarity <common|uncommon|rare|epic|legendary>
  --shiny
  --species <name>
  --eye <symbol>
  --hat <none|crown|tophat|propeller|halo|wizard|beanie|tinyduck>
  --max-attempts <n>
  --progress-every <n>`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] ?? "guided";
  const options = {
    launcherPath: undefined,
    configPath: undefined,
    rarity: undefined,
    shiny: false,
    species: undefined,
    eye: undefined,
    hat: undefined,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    progressEvery: DEFAULT_PROGRESS_EVERY,
  };

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    switch (token) {
      case "--launcher":
        options.launcherPath = args[++i];
        break;
      case "--config":
        options.configPath = args[++i];
        break;
      case "--rarity":
        options.rarity = args[++i];
        break;
      case "--shiny":
        options.shiny = true;
        break;
      case "--species":
        options.species = args[++i];
        break;
      case "--eye":
        options.eye = args[++i];
        break;
      case "--hat":
        options.hat = args[++i];
        break;
      case "--max-attempts":
        options.maxAttempts = Number(args[++i]);
        break;
      case "--progress-every":
        options.progressEvery = Number(args[++i]);
        break;
      case "--help":
      case "-h":
        usage();
        process.exit(0);
        break;
      default:
        fail(`Unknown option: ${token}`);
    }
  }

  return { command, options };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clearCompanion(configPath) {
  const config = readJson(configPath);
  delete config.companion;
  delete config.companionMuted;
  writeJson(configPath, config);
}

function getConfigPath(explicitPath) {
  if (explicitPath) return explicitPath;
  const candidates = [
    path.join(os.homedir(), ".claude.json"),
    path.join(os.homedir(), ".claude", ".config.json"),
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) fail("No Claude config file found. Pass --config.");
  return found;
}

// Regex to match the minified salt variable assignment.
// The variable name changes across builds (NV_, LN_, etc.), so we match any
// short identifier followed by the quoted salt value.
const SALT_VAR_RE = /([A-Za-z_$][A-Za-z0-9_$]{0,4})="(friend-\d{4}-\d+)"/;

function isBinaryFile(filePath) {
  const buf = Buffer.alloc(512);
  const fd = fs.openSync(filePath, "r");
  try {
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function detectLauncherPath(explicitPath) {
  const candidates = [];
  const push = value => {
    if (!value) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  push(explicitPath);
  push(process.env.CLAUDE_BIN);
  push(path.join(path.dirname(process.execPath), "claude"));

  try {
    const shellClaude = execFileSync("/bin/zsh", ["-lc", "command -v claude"], { encoding: "utf8" }).trim();
    push(shellClaude);
    if (shellClaude && fs.existsSync(shellClaude) && fs.lstatSync(shellClaude).isSymbolicLink()) {
      push(fs.realpathSync(shellClaude));
    }
  } catch {
    // Ignore and validate below.
  }

  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    try {
      // Check if this candidate contains the original salt OR was previously
      // patched (indicated by a backup file next to it).
      const buf = fs.readFileSync(candidate);
      if (buf.includes(ORIGINAL_SALT)) {
        return candidate;
      }
      // Previously patched launcher: the salt was replaced but backup exists.
      if (fs.existsSync(`${candidate}.buddy-orig.bak`)) {
        return candidate;
      }
    } catch {
      // Ignore inaccessible files and continue.
    }
  }

  fail("Could not locate a Claude launcher with a buddy salt marker. Pass --launcher.");
}

function detectSalt(launcherContent, launcherPath) {
  // launcherContent can be a string or Buffer — convert to string for regex.
  const text = typeof launcherContent === "string" ? launcherContent : launcherContent.toString("utf8");

  // Try original salt pattern first (unpatched launcher).
  const match = text.match(SALT_VAR_RE);
  if (match) return match[2];

  // For previously-patched launchers, the salt is now a hex string.
  // Find the variable name from the backup (which has the original pattern),
  // then read the current value from that same variable in the patched file.
  if (launcherPath) {
    const backupPath = `${launcherPath}.buddy-orig.bak`;
    if (fs.existsSync(backupPath)) {
      const backupText = fs.readFileSync(backupPath, isBinaryFile(backupPath) ? undefined : "utf8");
      const backupStr = typeof backupText === "string" ? backupText : backupText.toString("utf8");
      const backupMatch = backupStr.match(SALT_VAR_RE);
      if (backupMatch) {
        // Build a regex for the same variable name with any 15-char hex salt.
        const varName = backupMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const patchedRe = new RegExp(`${varName}="([0-9a-f]{${ORIGINAL_SALT.length}})"`);
        const patchedMatch = text.match(patchedRe);
        if (patchedMatch) return patchedMatch[1];
      }
    }
  }

  if (text.includes(ORIGINAL_SALT)) return ORIGINAL_SALT;
  fail("Could not detect current buddy salt in launcher.");
}

function ensureBackup(launcherPath, launcherBuf) {
  const stableBackup = `${launcherPath}.buddy-orig.bak`;
  if (fs.existsSync(stableBackup)) return stableBackup;

  if (launcherBuf.includes(ORIGINAL_SALT)) {
    fs.copyFileSync(launcherPath, stableBackup);
    return stableBackup;
  }

  const dir = path.dirname(launcherPath);
  const base = path.basename(launcherPath);
  const candidates = fs
    .readdirSync(dir)
    .filter(entry => entry.startsWith(`${base}.bak`))
    .map(entry => path.join(dir, entry))
    .filter(candidate => {
      try {
        return fs.readFileSync(candidate).includes(ORIGINAL_SALT);
      } catch {
        return false;
      }
    })
    .sort();

  if (candidates.length > 0) {
    fs.copyFileSync(candidates[candidates.length - 1], stableBackup);
    return stableBackup;
  }

  fs.copyFileSync(launcherPath, stableBackup);
  return stableBackup;
}

function patchLauncher(launcherPath, nextSalt) {
  const binary = isBinaryFile(launcherPath);

  // If a backup exists, always restore to the original state first.
  // This ensures the regex and salt detection work from a known baseline,
  // and prevents stale hex salts from blocking a re-forge.
  const stableBackup = `${launcherPath}.buddy-orig.bak`;
  if (fs.existsSync(stableBackup)) {
    fs.copyFileSync(stableBackup, launcherPath);
  }

  const launcherBuf = fs.readFileSync(launcherPath);
  const currentSalt = detectSalt(launcherBuf, launcherPath);
  const backupPath = ensureBackup(launcherPath, launcherBuf);

  if (binary) {
    // Binary launchers (Mach-O / ELF) embed JS as data.  We must:
    //  1. Locate the salt pattern as raw bytes (avoid UTF-8 round-trip).
    //  2. Replace in-place so the file size never changes.
    //  3. Patch ALL occurrences — the binary may contain duplicate code sections
    //     and a bare salt string in the Mach-O string table.
    //  4. Re-sign with an ad-hoc signature so macOS accepts the modified binary.
    const text = launcherBuf.toString("utf8");
    const match = text.match(SALT_VAR_RE);
    if (!match) fail("Failed to locate salt pattern in binary launcher.");

    // Replace the variable assignment pattern (e.g. NC4="friend-2026-401")
    const oldAssign = Buffer.from(match[0], "utf8");
    const newAssign = Buffer.from(`${match[1]}="${nextSalt}"`, "utf8");

    if (oldAssign.length !== newAssign.length) {
      fail(
        `Salt length mismatch: old ${oldAssign.length} vs new ${newAssign.length} bytes.\n` +
        "Binary patching requires identical byte lengths to preserve the executable format."
      );
    }

    let count = 0;

    // Pass 1: replace variable assignments (NC4="...")
    let idx = launcherBuf.indexOf(oldAssign);
    while (idx !== -1) {
      newAssign.copy(launcherBuf, idx);
      count++;
      idx = launcherBuf.indexOf(oldAssign, idx + newAssign.length);
    }

    // Pass 2: replace bare salt strings (e.g. in Mach-O string table)
    const oldBare = Buffer.from(currentSalt, "utf8");
    const newBare = Buffer.from(nextSalt, "utf8");
    if (oldBare.length === newBare.length) {
      idx = launcherBuf.indexOf(oldBare);
      while (idx !== -1) {
        newBare.copy(launcherBuf, idx);
        count++;
        idx = launcherBuf.indexOf(oldBare, idx + newBare.length);
      }
    }

    if (count === 0) fail("Failed to locate salt bytes in binary launcher.");

    fs.writeFileSync(launcherPath, launcherBuf);
    fs.chmodSync(launcherPath, 0o755);

    // Re-sign with ad-hoc signature so macOS accepts the modified binary.
    try {
      execFileSync("codesign", ["--remove-signature", launcherPath], { stdio: "ignore" });
      execFileSync("codesign", ["-s", "-", launcherPath], { stdio: "ignore" });
    } catch {
      // codesign may not be available on Linux; binary still works unsigned there.
    }
  } else {
    // Text launcher — safe to use string operations.
    const launcherText = launcherBuf.toString("utf8");
    const nextText = launcherText.replace(
      SALT_VAR_RE,
      (_, varName) => `${varName}="${nextSalt}"`
    );

    if (nextText === launcherText) fail("Failed to patch launcher salt.");

    fs.writeFileSync(launcherPath, nextText, "utf8");
  }

  return { currentSalt, backupPath };
}

function restoreLauncher(launcherPath) {
  const backupPath = `${launcherPath}.buddy-orig.bak`;
  if (!fs.existsSync(backupPath)) fail(`Backup not found: ${backupPath}`);
  fs.copyFileSync(backupPath, launcherPath);

  // Re-sign if the restored file is a binary, so macOS accepts it.
  if (isBinaryFile(launcherPath)) {
    try {
      execFileSync("codesign", ["--remove-signature", launcherPath], { stdio: "ignore" });
      execFileSync("codesign", ["-s", "-", launcherPath], { stdio: "ignore" });
    } catch {
      // codesign may not be available on Linux.
    }
  }

  return backupPath;
}

function getBuddyData() {
  return BUDDY_DATA;
}

function getUserId(config) {
  const id = config.oauthAccount?.accountUuid ?? config.userID ?? null;
  if (!id) {
    fail(
      "Could not detect your Claude account ID.\n" +
      "You must log in to Claude Code at least once before using this tool.\n" +
      "  Run: claude  (and complete login)\n" +
      "  Then try claude-buddy-forge again."
    );
  }
  return id;
}

function hashString(value) {
  // Claude Code uses Bun.hash() (wyhash) when running under Bun.
  // The re-exec block at the top of this file ensures we run under Bun
  // when available, so this branch is the primary path.
  if (typeof globalThis.Bun !== "undefined") {
    return Number(BigInt(Bun.hash(value)) & 0xffffffffn);
  }

  // Fallback: FNV-1a.  Only reached if Bun is not installed at all.
  // WARNING: This produces DIFFERENT buddy results than Claude Code.
  // Install Bun (https://bun.sh) for correct buddy computation.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function rollRarity(rng, data) {
  const total = Object.values(data.rarityWeights).reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  for (const rarity of data.rarities) {
    roll -= data.rarityWeights[rarity];
    if (roll < 0) return rarity;
  }
  return "common";
}

const RARITY_FLOOR = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

function rollStats(rng, rarity, data) {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, data.statNames);
  let dump = pick(rng, data.statNames);
  while (dump === peak) dump = pick(rng, data.statNames);

  const stats = {};
  for (const name of data.statNames) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

function rollWithSalt(userId, salt, data) {
  const rng = mulberry32(hashString(userId + salt));
  const rarity = rollRarity(rng, data);
  return {
    salt,
    rarity,
    species: pick(rng, data.species),
    eye: pick(rng, data.eyes),
    hat: rarity === "common" ? "none" : pick(rng, data.hats),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity, data),
  };
}

function createPreviewBones(target, data) {
  return {
    rarity: target.rarity ?? "legendary",
    species: target.species ?? data.species[0],
    eye: target.eye ?? data.eyes[0],
    hat: target.rarity === "common" ? "none" : target.hat ?? "none",
    shiny: Boolean(target.shiny),
    stats: Object.fromEntries(data.statNames.map(name => [name, 50])),
  };
}

function renderSprite(data, bones, frame = 0) {
  const frames = data.bodies[bones.species];
  const body = frames[frame % frames.length].map(line => line.replaceAll("{E}", bones.eye));
  const lines = [...body];
  if (bones.hat !== "none" && !lines[0].trim()) {
    lines[0] = data.hatLines[bones.hat];
  }
  if (!lines[0].trim() && frames.every(spriteFrame => !spriteFrame[0].trim())) {
    lines.shift();
  }
  return lines;
}

function renderPreviewStrip(data, bones) {
  const frameCount = data.bodies[bones.species].length;
  const rendered = Array.from({ length: frameCount }, (_, index) => renderSprite(data, bones, index));
  const maxHeight = Math.max(...rendered.map(lines => lines.length));

  const padded = rendered.map(lines => {
    const width = Math.max(...lines.map(line => line.length));
    return Array.from({ length: maxHeight }, (_, rowIndex) => (lines[rowIndex] ?? "").padEnd(width, " "));
  });

  return Array.from({ length: maxHeight }, (_, rowIndex) => padded.map(lines => lines[rowIndex]).join("   "));
}

function printPreview(title, data, target) {
  const bones = createPreviewBones(target, data);
  console.log(`\n${title}`);
  console.log(`rarity=${bones.rarity} shiny=${bones.shiny ? "yes" : "no"} species=${bones.species} eye=${bones.eye} hat=${bones.hat}`);
  for (const line of renderPreviewStrip(data, bones)) {
    console.log(line);
  }
}

function isMatch(result, target) {
  if (target.rarity && result.rarity !== target.rarity) return false;
  if (target.shiny && result.shiny !== true) return false;
  if (target.species && result.species !== target.species) return false;
  if (target.eye && result.eye !== target.eye) return false;
  if (target.hat) {
    if (result.rarity === "common" && target.hat !== "none") return false;
    if (result.hat !== target.hat) return false;
  }
  return true;
}

function formatProbability(probability) {
  if (probability === 0) return "impossible";
  if (probability >= 0.01) return `${(probability * 100).toFixed(4)}%`;
  return `${probability.toExponential(4)} (${Math.round(1 / probability).toLocaleString()} tries expected)`;
}

function estimateProbability(target, data) {
  let probability = 1;

  if (target.rarity) {
    probability *= data.rarityWeights[target.rarity] / 100;
  }
  if (target.shiny) {
    probability *= 0.01;
  }
  if (target.species) {
    probability *= 1 / data.species.length;
  }
  if (target.eye) {
    probability *= 1 / data.eyes.length;
  }
  if (target.hat) {
    if (target.rarity === "common") {
      probability *= target.hat === "none" ? 1 : 0;
    } else {
      probability *= 1 / data.hats.length;
    }
  }

  return probability;
}

// ANSI helpers for pretty output
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  blue: "\x1b[34m",
  inverse: "\x1b[7m",
};

const RARITY_ANSI = {
  common: c.white,
  uncommon: c.green,
  rare: c.blue,
  epic: c.magenta,
  legendary: c.yellow,
};

const SPINNERS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function findTarget(userId, target, data, options) {
  const saltLength = ORIGINAL_SALT.length;
  const startedAt = Date.now();
  const isTTY = process.stderr.isTTY;

  for (let attempts = 1; attempts <= options.maxAttempts; attempts += 1) {
    const salt = crypto.randomBytes(8).toString("hex").slice(0, saltLength);
    const result = rollWithSalt(userId, salt, data);
    if (isMatch(result, target)) {
      if (isTTY) process.stderr.write("\x1b[2K\r");
      return { ...result, attempts, elapsedMs: Date.now() - startedAt };
    }

    if (attempts % options.progressEvery === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (isTTY) {
        const spin = SPINNERS[Math.floor(attempts / options.progressEvery) % SPINNERS.length];
        const pct = ((attempts / options.maxAttempts) * 100).toFixed(1);
        const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
        process.stderr.write(
          `\x1b[2K\r  ${c.cyan}${spin}${c.reset} ${c.gray}${bar}${c.reset} ${c.white}${attempts.toLocaleString()}${c.reset}${c.gray} salts │ ${elapsed}s │ ${pct}%${c.reset}`
        );
      } else {
        console.error(`searched ${attempts.toLocaleString()} salts in ${elapsed}s...`);
      }
    }
  }

  if (isTTY) process.stderr.write("\x1b[2K\r");
  return null;
}

function assertTarget(target, data) {
  const activeCriteria = [
    target.rarity,
    target.shiny ? "shiny" : undefined,
    target.species,
    target.eye,
    target.hat,
  ].filter(Boolean);

  if (activeCriteria.length === 0) {
    fail("Provide at least one search criterion.");
  }
  if (target.rarity && !data.rarities.includes(target.rarity)) {
    fail(`Invalid rarity: ${target.rarity}`);
  }
  if (target.species && !data.species.includes(target.species)) {
    fail(`Invalid species: ${target.species}`);
  }
  if (target.eye && !data.eyes.includes(target.eye)) {
    fail(`Invalid eye: ${target.eye}`);
  }
  if (target.hat && !data.hats.includes(target.hat)) {
    fail(`Invalid hat: ${target.hat}`);
  }
  if (target.rarity === "common" && target.hat && target.hat !== "none") {
    fail("Common buddies cannot use a non-none hat target.");
  }
}

function printSpeciesCatalog(data, rarity = "legendary") {
  console.log("\nSpecies catalog:\n");
  data.species.forEach((species, index) => {
    const bones = createPreviewBones({ rarity, species, eye: data.eyes[0], hat: "none", shiny: false }, data);
    console.log(`${index + 1}. ${species}`);
    for (const line of renderSprite(data, bones, 0)) {
      console.log(`   ${line}`);
    }
    console.log("");
  });
}

async function askLine(rl, label, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function askYesNo(rl, label, defaultValue = true) {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";
  const answer = (await rl.question(`${label}${suffix}: `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  return answer === "y" || answer === "yes";
}

async function askChoice(rl, label, options, formatter = value => value) {
  options.forEach((value, index) => {
    console.log(`${index + 1}. ${formatter(value, index)}`);
  });

  while (true) {
    const raw = (await rl.question(`${label} (1-${options.length}): `)).trim();
    const index = Number(raw);
    if (Number.isInteger(index) && index >= 1 && index <= options.length) {
      return options[index - 1];
    }
    console.log("Invalid choice, try again.");
  }
}

async function chooseTargetGuided(rl, data) {
  const mode = await askChoice(rl, "Choose mode", ["ultra", "custom"], value =>
    value === "ultra" ? "Ultra preset: legendary + shiny + dragon + tinyduck" : "Custom profile",
  );

  if (mode === "ultra") {
    printPreview("Ultra preset preview", data, ULTRA_TARGET);
    return { ...ULTRA_TARGET, eye: "◉" };
  }

  const target = {};
  target.rarity = await askChoice(rl, "Pick rarity", data.rarities);
  target.shiny = await askYesNo(rl, "Require shiny", false);

  printSpeciesCatalog(data, target.rarity);
  target.species = await askChoice(rl, "Pick species", data.species);
  printPreview("Species preview", data, target);

  target.eye = await askChoice(rl, "Pick eye", data.eyes, eye => {
    const bones = createPreviewBones({ ...target, eye }, data);
    return `${eye}\n${renderSprite(data, bones, 0).map(line => `   ${line}`).join("\n")}`;
  });
  printPreview("Eye preview", data, target);

  const hatChoices = target.rarity === "common" ? ["none"] : data.hats;
  target.hat = await askChoice(rl, "Pick hat", hatChoices, hat => {
    const bones = createPreviewBones({ ...target, hat }, data);
    return `${hat}\n${renderSprite(data, bones, 0).map(line => `   ${line}`).join("\n")}`;
  });

  printPreview("Final preview", data, target);
  return target;
}

function summarizeResult(found, probability) {
  return {
    salt: found.salt,
    rarity: found.rarity,
    species: found.species,
    eye: found.eye,
    hat: found.hat,
    shiny: found.shiny,
    stats: found.stats,
    attempts: found.attempts,
    elapsedMs: found.elapsedMs,
    estimatedProbability: formatProbability(probability),
  };
}

function runInkUI(catalogOnly = false) {
  return new Promise(async (resolve, reject) => {
    try {
      const { render } = await import("ink");
      const React = await import("react");
      const { App } = await import("../lib/components/App.js");

      let resolved = false;
      const done = (value) => {
        if (resolved) return;
        resolved = true;
        instance.unmount();
        // Small delay to let ink fully clean up before printing ANSI output
        setTimeout(() => resolve(value), 100);
      };

      const h = React.createElement;
      const instance = render(
        h(App, {
          catalogOnly,
          onComplete: (target) => done(target),
          onExit: () => done(null),
        }),
      );
      instance.waitUntilExit().then(() => done(null));
    } catch (error) {
      reject(error);
    }
  });
}

async function runGuided(options) {
  const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;

  if (IS_TTY) {
    const target = await runInkUI(false);
    if (!target) {
      console.log("Cancelled.");
      return;
    }

    const data = getBuddyData();
    const launcherPath = detectLauncherPath(options.launcherPath);
    const configPath = getConfigPath(options.configPath);
    const config = readJson(configPath);
    const userId = getUserId(config);

    assertTarget(target, data);
    const probability = estimateProbability(target, data);
    const rarityColor = RARITY_ANSI[target.rarity] ?? c.white;

    console.log("");
    console.log(`  ${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.bold}⚡ Searching for your buddy...${c.reset}            ${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}╚══════════════════════════════════════════╝${c.reset}`);
    console.log("");
    console.log(`  ${c.gray}Target:${c.reset} ${rarityColor}${target.rarity}${c.reset} ${target.species} ${target.eye} ${target.hat ?? "none"}${target.shiny ? ` ${c.yellow}✨shiny${c.reset}` : ""}`);
    console.log(`  ${c.gray}Probability:${c.reset} ${c.yellow}${formatProbability(probability)}${c.reset}`);
    console.log("");

    const found = findTarget(userId, target, data, options);
    if (!found) {
      console.log(`  ${c.red}✗${c.reset} No matching salt found in ${options.maxAttempts.toLocaleString()} attempts.`);
      process.exit(1);
    }

    const patchInfo = patchLauncher(launcherPath, found.salt);
    clearCompanion(configPath);

    // Pretty result output
    const bones = createPreviewBones(found, data);
    const sprite = renderSprite(data, bones, 0);
    const elapsed = (found.elapsedMs / 1000).toFixed(1);

    console.log(`  ${c.green}✓${c.bold} Found in ${found.attempts.toLocaleString()} attempts (${elapsed}s)${c.reset}`);
    console.log("");
    console.log(`  ${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.bold}🎉 Your new buddy is ready!${c.reset}               ${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}╠══════════════════════════════════════════╣${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
    for (const line of sprite) {
      const padded = `  ${rarityColor}${line}${c.reset}`.padEnd(56);
      console.log(`  ${c.cyan}║${c.reset}${padded}${c.cyan}║${c.reset}`);
    }
    console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Rarity:${c.reset}  ${rarityColor}${c.bold}${found.rarity.toUpperCase()}${c.reset}${" ".repeat(Math.max(0, 30 - found.rarity.length))}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Species:${c.reset} ${found.species}${" ".repeat(Math.max(0, 31 - found.species.length))}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Eyes:${c.reset}    ${found.eye}${" ".repeat(Math.max(0, 32 - 1))}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Hat:${c.reset}     ${found.hat}${" ".repeat(Math.max(0, 32 - found.hat.length))}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Shiny:${c.reset}   ${found.shiny ? `${c.yellow}✨ YES${c.reset}` + " ".repeat(26) : `no${" ".repeat(30)}`}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);

    // Stats bars
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}─── Stats ────────────────────────${c.reset}      ${c.cyan}║${c.reset}`);
    for (const [name, value] of Object.entries(found.stats)) {
      const filled = Math.round(value / 10);
      const empty = 10 - filled;
      const bar = `${rarityColor}${"█".repeat(filled)}${c.gray}${"░".repeat(empty)}${c.reset}`;
      const label = name.padEnd(10);
      console.log(`  ${c.cyan}║${c.reset}  ${c.gray}${label}${c.reset} ${bar} ${c.dim}${value}${c.reset}${" ".repeat(Math.max(0, 17 - String(value).length))}${c.cyan}║${c.reset}`);
    }

    console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Salt:${c.reset}    ${c.dim}${found.salt}${c.reset}${" ".repeat(Math.max(0, 32 - found.salt.length))}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Backup:${c.reset}  ${c.dim}✓ saved${c.reset}${" ".repeat(26)}${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
    console.log(`  ${c.cyan}╚══════════════════════════════════════════╝${c.reset}`);
    console.log("");
    console.log(`  ${c.yellow}${c.bold}⚡ Restart Claude Code completely to see your new buddy!${c.reset}`);
    console.log(`  ${c.gray}Run ${c.white}claude-buddy-forge restore${c.gray} to undo at any time.${c.reset}`);
    console.log("");
    return;
  }

  // Fallback: readline-based flow for non-TTY
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const launcherPath = await askLine(rl, "Claude launcher path", detectLauncherPath(options.launcherPath));
    const configPath = await askLine(rl, "Claude config path", getConfigPath(options.configPath));

    const data = getBuddyData();
    const config = readJson(configPath);
    const userId = getUserId(config);

    console.log("\nLoaded bundled buddy catalog from this project");
    console.log(`Using launcher ${launcherPath}`);
    console.log(`Using config ${configPath}`);
    console.log(`User key prefix: ${userId.slice(0, 8)}...\n`);

    const target = await chooseTargetGuided(rl, data);
    assertTarget(target, data);

    const probability = estimateProbability(target, data);
    console.log(`\nEstimated probability: ${formatProbability(probability)}`);

    const shouldApply = await askYesNo(rl, "Search and patch this profile", true);
    if (!shouldApply) {
      console.log("Cancelled before search.");
      return;
    }

    const found = findTarget(userId, target, data, options);
    if (!found) {
      fail(`No matching salt found in ${options.maxAttempts.toLocaleString()} attempts.`);
    }

    const patchInfo = patchLauncher(launcherPath, found.salt);
    clearCompanion(configPath);
    console.log(
      JSON.stringify(
        {
          launcherPath,
          configPath,
          backupPath: patchInfo.backupPath,
          target,
          result: summarizeResult(found, probability),
          nextAction: "Restart Claude Code completely.",
        },
        null,
        2,
      ),
    );
  } finally {
    rl.close();
  }
}

function runCurrent(options) {
  const data = getBuddyData();
  const launcherPath = detectLauncherPath(options.launcherPath);
  const configPath = getConfigPath(options.configPath);
  const config = readJson(configPath);
  const launcherBuf = fs.readFileSync(launcherPath);
  const salt = detectSalt(launcherBuf, launcherPath);
  const result = rollWithSalt(getUserId(config), salt, data);
  const isTTY = process.stdout.isTTY;

  if (!isTTY) {
    console.log(JSON.stringify({ launcherPath, configPath, userId: getUserId(config), salt, result }, null, 2));
    return;
  }

  const rarityColor = RARITY_ANSI[result.rarity] ?? c.white;
  const bones = createPreviewBones(result, data);
  const sprite = renderSprite(data, bones, 0);

  console.log("");
  console.log(`  ${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.bold}🐾 Your Current Buddy${c.reset}                     ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}╠══════════════════════════════════════════╣${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
  for (const line of sprite) {
    const padded = `  ${rarityColor}${line}${c.reset}`.padEnd(56);
    console.log(`  ${c.cyan}║${c.reset}${padded}${c.cyan}║${c.reset}`);
  }
  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Rarity:${c.reset}  ${rarityColor}${c.bold}${result.rarity.toUpperCase()}${c.reset}${" ".repeat(Math.max(0, 30 - result.rarity.length))}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Species:${c.reset} ${result.species}${" ".repeat(Math.max(0, 31 - result.species.length))}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Eyes:${c.reset}    ${result.eye}${" ".repeat(Math.max(0, 32 - 1))}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Hat:${c.reset}     ${result.hat}${" ".repeat(Math.max(0, 32 - result.hat.length))}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Shiny:${c.reset}   ${result.shiny ? `${c.yellow}✨ YES${c.reset}` + " ".repeat(26) : `no${" ".repeat(30)}`}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Salt:${c.reset}    ${c.dim}${salt}${c.reset}${" ".repeat(Math.max(0, 32 - salt.length))}${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);

  // Stats bars
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}─── Stats ────────────────────────${c.reset}      ${c.cyan}║${c.reset}`);
  for (const [name, value] of Object.entries(result.stats)) {
    const filled = Math.round(value / 10);
    const empty = 10 - filled;
    const bar = `${rarityColor}${"█".repeat(filled)}${c.gray}${"░".repeat(empty)}${c.reset}`;
    const label = name.padEnd(10);
    console.log(`  ${c.cyan}║${c.reset}  ${c.gray}${label}${c.reset} ${bar} ${c.dim}${value}${c.reset}${" ".repeat(Math.max(0, 17 - String(value).length))}${c.cyan}║${c.reset}`);
  }

  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}╚══════════════════════════════════════════╝${c.reset}`);
  console.log("");
}

async function runCatalog(options) {
  const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;

  if (IS_TTY) {
    await runInkUI(true);
    return;
  }

  // Fallback: text output for non-TTY
  const data = getBuddyData();
  printSpeciesCatalog(data, "legendary");
}

function runSearchOrApply(command, options) {
  const launcherPath = detectLauncherPath(options.launcherPath);
  const configPath = getConfigPath(options.configPath);
  const data = getBuddyData();
  const config = readJson(configPath);
  const userId = getUserId(config);
  const target = {
    rarity: options.rarity,
    shiny: options.shiny,
    species: options.species,
    eye: options.eye,
    hat: options.hat,
  };

  assertTarget(target, data);
  const probability = estimateProbability(target, data);
  const found = findTarget(userId, target, data, options);
  if (!found) {
    fail(`No matching salt found in ${options.maxAttempts.toLocaleString()} attempts.`);
  }

  if (command === "search") {
    console.log(JSON.stringify({ target, result: summarizeResult(found, probability) }, null, 2));
    return;
  }

  const patchInfo = patchLauncher(launcherPath, found.salt);
  clearCompanion(configPath);
  console.log(
    JSON.stringify(
      {
        launcherPath,
        configPath,
        backupPath: patchInfo.backupPath,
        target,
        result: summarizeResult(found, probability),
        nextAction: "Restart Claude Code completely.",
      },
      null,
      2,
    ),
  );
}

function runRestore(options) {
  const launcherPath = detectLauncherPath(options.launcherPath);
  const configPath = getConfigPath(options.configPath);
  const backupPath = restoreLauncher(launcherPath);
  clearCompanion(configPath);
  const isTTY = process.stdout.isTTY;

  if (!isTTY) {
    console.log(JSON.stringify({ launcherPath, configPath, restoredFrom: backupPath, nextAction: "Restart Claude Code completely." }, null, 2));
    return;
  }

  console.log("");
  console.log(`  ${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.green}${c.bold}✓ Buddy restored to original!${c.reset}             ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}╠══════════════════════════════════════════╣${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.gray}Restored from:${c.reset}                          ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}  ${c.dim}${backupPath}${c.reset}`);
  console.log(`  ${c.cyan}║${c.reset}                                          ${c.cyan}║${c.reset}`);
  console.log(`  ${c.cyan}╚══════════════════════════════════════════╝${c.reset}`);
  console.log("");
  console.log(`  ${c.yellow}${c.bold}⚡ Restart Claude Code completely to see your original buddy!${c.reset}`);
  console.log("");
}

async function main() {
  const { command, options } = parseArgs(process.argv);

  switch (command) {
    case "guided":
      await runGuided(options);
      break;
    case "current":
      runCurrent(options);
      break;
    case "catalog":
      await runCatalog(options);
      break;
    case "search":
    case "apply":
      runSearchOrApply(command, options);
      break;
    case "restore":
      runRestore(options);
      break;
    default:
      usage();
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
