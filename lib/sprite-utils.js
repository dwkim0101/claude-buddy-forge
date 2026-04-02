import BUDDY_DATA from "./buddy-catalog.js";

export const RARITY_COLORS = {
  common: "white",
  uncommon: "green",
  rare: "blue",
  epic: "magenta",
  legendary: "yellow",
};

export const RARITY_LABELS = {
  common: "★",
  uncommon: "★★",
  rare: "★★★",
  epic: "★★★★",
  legendary: "★★★★★",
};

export function createPreviewBones(target, data = BUDDY_DATA) {
  return {
    rarity: target.rarity ?? "legendary",
    species: target.species ?? data.species[0],
    eye: target.eye ?? data.eyes[0],
    hat: target.rarity === "common" ? "none" : target.hat ?? "none",
    shiny: Boolean(target.shiny),
    stats: Object.fromEntries(data.statNames.map((name) => [name, 50])),
  };
}

export function renderSprite(data, bones, frame = 0) {
  const frames = data.bodies[bones.species];
  const body = frames[frame % frames.length].map((line) =>
    line.replaceAll("{E}", bones.eye),
  );
  const lines = [...body];
  if (bones.hat !== "none" && !lines[0].trim()) {
    lines[0] = data.hatLines[bones.hat];
  }
  if (!lines[0].trim() && frames.every((f) => !f[0].trim())) {
    lines.shift();
  }
  return lines;
}

export { BUDDY_DATA };
