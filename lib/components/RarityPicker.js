import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { BUDDY_DATA, RARITY_COLORS, RARITY_LABELS } from "../sprite-utils.js";

const h = React.createElement;

const WEIGHTS = BUDDY_DATA.rarityWeights;

export function RarityPicker({ onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const rarities = BUDDY_DATA.rarities;

  useInput((input, key) => {
    if (key.leftArrow) setSelected((s) => Math.max(0, s - 1));
    if (key.rightArrow) setSelected((s) => Math.min(rarities.length - 1, s + 1));
    if (key.upArrow) setSelected((s) => Math.max(0, s - 1));
    if (key.downArrow) setSelected((s) => Math.min(rarities.length - 1, s + 1));
    if (key.return) onSelect(rarities[selected]);
    if (key.escape) onBack();
  });

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "✦ Pick Rarity ✦"),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      { flexDirection: "column", gap: 0 },
      ...rarities.map((rarity, i) => {
        const isSelected = i === selected;
        const color = RARITY_COLORS[rarity];
        const weight = WEIGHTS[rarity];
        const bar = "█".repeat(Math.ceil(weight / 3));
        const pointer = isSelected ? "▸ " : "  ";

        return h(
          Box,
          { key: rarity, flexDirection: "row", gap: 1 },
          h(Text, { color: isSelected ? color : "gray", bold: isSelected }, pointer),
          h(
            Text,
            {
              color: isSelected ? color : "gray",
              bold: isSelected,
              inverse: isSelected,
            },
            ` ${rarity.toUpperCase().padEnd(10)} `,
          ),
          h(Text, { color, dimColor: !isSelected }, ` ${RARITY_LABELS[rarity]} `),
          h(Text, { color: isSelected ? color : "gray" }, bar),
          h(Text, { color: "gray" }, ` ${weight}%`),
        );
      }),
    ),
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { color: "gray" },
      "↑ ↓ Navigate  │  Enter Select  │  Esc Back",
    ),
  );
}
