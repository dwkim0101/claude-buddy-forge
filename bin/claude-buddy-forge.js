#!/usr/bin/env node

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
      const text = fs.readFileSync(candidate, "utf8");
      if (/NV_="([^"]+)"/.test(text) || text.includes(ORIGINAL_SALT)) {
        return candidate;
      }
    } catch {
      // Ignore binary launchers and continue.
    }
  }

  fail("Could not locate a Claude launcher with a buddy salt marker. Pass --launcher.");
}

function detectSalt(launcherText) {
  const match = launcherText.match(/NV_="([^"]+)"/);
  if (match) return match[1];
  if (launcherText.includes(ORIGINAL_SALT)) return ORIGINAL_SALT;
  fail("Could not detect current buddy salt in launcher.");
}

function ensureBackup(launcherPath, launcherText) {
  const stableBackup = `${launcherPath}.buddy-orig.bak`;
  if (fs.existsSync(stableBackup)) return stableBackup;

  if (launcherText.includes(ORIGINAL_SALT)) {
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
        return fs.readFileSync(candidate, "utf8").includes(ORIGINAL_SALT);
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
  const launcherText = fs.readFileSync(launcherPath, "utf8");
  const currentSalt = detectSalt(launcherText);
  const backupPath = ensureBackup(launcherPath, launcherText);
  const nextText = launcherText.replace(/NV_="([^"]+)"/, `NV_="${nextSalt}"`);

  if (nextText === launcherText) fail("Failed to patch launcher salt.");

  fs.writeFileSync(launcherPath, nextText, "utf8");
  return { currentSalt, backupPath };
}

function restoreLauncher(launcherPath) {
  const backupPath = `${launcherPath}.buddy-orig.bak`;
  if (!fs.existsSync(backupPath)) fail(`Backup not found: ${backupPath}`);
  fs.copyFileSync(backupPath, launcherPath);
  return backupPath;
}

function getBuddyData() {
  return BUDDY_DATA;
}

function getUserId(config) {
  return config.oauthAccount?.accountUuid ?? config.userID ?? "anon";
}

function hashString(value) {
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

function findTarget(userId, target, data, options) {
  const saltLength = ORIGINAL_SALT.length;
  const startedAt = Date.now();

  for (let attempts = 1; attempts <= options.maxAttempts; attempts += 1) {
    const salt = crypto.randomBytes(8).toString("hex").slice(0, saltLength);
    const result = rollWithSalt(userId, salt, data);
    if (isMatch(result, target)) {
      return { ...result, attempts, elapsedMs: Date.now() - startedAt };
    }

    if (attempts % options.progressEvery === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.error(`searched ${attempts.toLocaleString()} salts in ${elapsed}s...`);
    }
  }

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

      const h = React.createElement;
      const instance = render(
        h(App, {
          catalogOnly,
          onComplete: (target) => {
            instance.unmount();
            resolve(target);
          },
        }),
      );
      instance.waitUntilExit().then(() => {
        if (!catalogOnly) resolve(null);
      });
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

    console.log(`\nSearching for: ${JSON.stringify(target)}`);
    console.log(`Estimated probability: ${formatProbability(probability)}\n`);

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
  const launcherText = fs.readFileSync(launcherPath, "utf8");
  const salt = detectSalt(launcherText);
  const result = rollWithSalt(getUserId(config), salt, data);

  console.log(
    JSON.stringify(
      {
        launcherPath,
        configPath,
        userId: getUserId(config),
        salt,
        result,
      },
      null,
      2,
    ),
  );
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
  console.log(
    JSON.stringify(
      {
        launcherPath,
        configPath,
        restoredFrom: backupPath,
        nextAction: "Restart Claude Code completely.",
      },
      null,
      2,
    ),
  );
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
