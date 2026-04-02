import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
  RARITY_LABELS,
} from "../sprite-utils.js";

const h = React.createElement;

const STAT_NAMES = BUDDY_DATA.statNames;

function StatBar({ name, value, color }) {
  const filled = Math.round(value / 5);
  const empty = 20 - filled;
  return h(
    Box,
    { flexDirection: "row", gap: 1 },
    h(Text, { color: "gray" }, name.padEnd(10)),
    h(Text, { color }, "█".repeat(filled)),
    h(Text, { color: "gray", dimColor: true }, "░".repeat(empty)),
    h(Text, { color: "gray" }, ` ${value}`),
  );
}

export function FinalPreview({ target, onConfirm, onBack }) {
  const [frame, setFrame] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => f + 1);
      setBlink((b) => !b);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.return) onConfirm();
    if (key.escape) onBack();
  });

  const bones = createPreviewBones(target);
  const sprite = renderSprite(BUDDY_DATA, bones, frame);
  const color = RARITY_COLORS[target.rarity] ?? "white";
  const isShiny = target.shiny;

  // Calculate estimated probability
  let prob = 1;
  if (target.rarity) prob *= BUDDY_DATA.rarityWeights[target.rarity] / 100;
  if (target.shiny) prob *= 0.01;
  if (target.species) prob *= 1 / BUDDY_DATA.species.length;
  if (target.eye) prob *= 1 / BUDDY_DATA.eyes.length;
  if (target.hat && target.rarity !== "common") prob *= 1 / BUDDY_DATA.hats.length;
  const probStr =
    prob >= 0.01
      ? `${(prob * 100).toFixed(4)}%`
      : `~1 in ${Math.round(1 / prob).toLocaleString()}`;

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "⚡ Final Preview ⚡"),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      {
        flexDirection: "row",
        gap: 3,
        borderStyle: "double",
        borderColor: color,
        paddingX: 3,
        paddingY: 1,
      },
      // Sprite side
      h(
        Box,
        { flexDirection: "column", alignItems: "center" },
        ...sprite.map((line, i) =>
          h(
            Text,
            {
              key: i,
              color,
              bold: isShiny && blink,
              inverse: isShiny && blink,
            },
            line,
          ),
        ),
        h(Box, { marginTop: 1 }),
        h(
          Text,
          { bold: true, color },
          `${isShiny ? "✨ " : ""}${target.species?.toUpperCase() ?? "???"}${isShiny ? " ✨" : ""}`,
        ),
      ),
      // Info side
      h(
        Box,
        { flexDirection: "column", minWidth: 30 },
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Rarity:"),
          h(
            Text,
            { color, bold: true },
            `${target.rarity?.toUpperCase() ?? "?"} ${RARITY_LABELS[target.rarity] ?? ""}`,
          ),
        ),
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Species:"),
          h(Text, { color: "white" }, target.species ?? "?"),
        ),
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Eyes:"),
          h(Text, { color: "white" }, target.eye ?? "?"),
        ),
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Hat:"),
          h(Text, { color: "white" }, target.hat ?? "none"),
        ),
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Shiny:"),
          h(
            Text,
            { color: isShiny ? "yellow" : "gray" },
            isShiny ? "✨ YES" : "no",
          ),
        ),
        h(Box, { marginTop: 1 }),
        h(Text, { color: "gray", dimColor: true }, "─── Stats Preview ───"),
        ...STAT_NAMES.map((name) =>
          h(StatBar, { key: name, name, value: bones.stats[name], color }),
        ),
        h(Box, { marginTop: 1 }),
        h(
          Box,
          { flexDirection: "row", gap: 1 },
          h(Text, { color: "gray" }, "Probability:"),
          h(Text, { color: "yellow" }, probStr),
        ),
      ),
    ),
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { color: blink ? "green" : "gray", bold: blink },
      "⏎ Press Enter to search & patch",
    ),
    h(Text, { color: "gray" }, "Esc to go back"),
  );
}
