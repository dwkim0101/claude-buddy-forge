import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
} from "../sprite-utils.js";

const h = React.createElement;

export function EyePicker({ target, onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 400);
    return () => clearInterval(timer);
  }, []);

  const eyes = BUDDY_DATA.eyes;
  const color = RARITY_COLORS[target.rarity] ?? "white";

  useInput((input, key) => {
    if (key.leftArrow) setSelected((s) => Math.max(0, s - 1));
    if (key.rightArrow) setSelected((s) => Math.min(eyes.length - 1, s + 1));
    if (key.return) onSelect(eyes[selected]);
    if (key.escape) onBack();
  });

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "◉ Pick Eyes ◉"),
    h(
      Text,
      { color: "gray" },
      `Species: ${target.species}  │  Rarity: ${target.rarity}`,
    ),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      { flexDirection: "row", gap: 0 },
      ...eyes.map((eye, i) => {
        const isSelected = i === selected;
        const bones = createPreviewBones({
          ...target,
          eye,
          hat: "none",
        });
        const sprite = renderSprite(BUDDY_DATA, bones, frame);

        return h(
          Box,
          {
            key: eye,
            flexDirection: "column",
            alignItems: "center",
            borderStyle: isSelected ? "double" : "round",
            borderColor: isSelected ? color : "gray",
            paddingX: 1,
          },
          ...sprite.map((line, j) =>
            h(
              Text,
              { key: j, color: isSelected ? color : "white" },
              line,
            ),
          ),
          h(
            Text,
            {
              bold: isSelected,
              color: isSelected ? color : "gray",
            },
            isSelected ? `▸ ${eye} ◂` : `  ${eye}  `,
          ),
        );
      }),
    ),
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { color: "gray" },
      "← → Navigate  │  Enter Select  │  Esc Back",
    ),
  );
}
