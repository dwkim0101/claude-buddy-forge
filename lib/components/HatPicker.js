import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
} from "../sprite-utils.js";

const h = React.createElement;

export function HatPicker({ target, onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const { stdout } = useStdout();

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 400);
    return () => clearInterval(timer);
  }, []);

  const hats = target.rarity === "common" ? ["none"] : BUDDY_DATA.hats;
  const color = RARITY_COLORS[target.rarity] ?? "white";

  const cols = useMemo(() => {
    const termWidth = stdout?.columns ?? 80;
    return Math.max(2, Math.min(4, Math.floor(termWidth / 20)));
  }, [stdout?.columns]);

  const rows = Math.ceil(hats.length / cols);

  useInput((input, key) => {
    if (key.leftArrow) setSelected((s) => (s % cols > 0 ? s - 1 : s));
    if (key.rightArrow) setSelected((s) => (s % cols < cols - 1 && s + 1 < hats.length ? s + 1 : s));
    if (key.upArrow) setSelected((s) => (s - cols >= 0 ? s - cols : s));
    if (key.downArrow) setSelected((s) => (s + cols < hats.length ? s + cols : s));
    if (key.return) onSelect(hats[selected]);
    if (key.escape) onBack();
  });

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const rowCells = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= hats.length) break;
      const hat = hats[idx];
      const isSelected = idx === selected;
      const bones = createPreviewBones({ ...target, hat });
      const sprite = renderSprite(BUDDY_DATA, bones, frame);

      rowCells.push(
        h(
          Box,
          {
            key: hat,
            flexDirection: "column",
            alignItems: "center",
            borderStyle: isSelected ? "double" : "round",
            borderColor: isSelected ? color : "gray",
            paddingX: 1,
            width: 18,
          },
          ...sprite.map((line, j) =>
            h(Text, { key: j, color: isSelected ? color : "white" }, line),
          ),
          h(
            Text,
            { bold: isSelected, color: isSelected ? color : "gray" },
            isSelected ? `▸${hat.toUpperCase()}` : ` ${hat}`,
          ),
        ),
      );
    }
    grid.push(
      h(Box, { key: `row-${r}`, flexDirection: "row", gap: 0 }, ...rowCells),
    );
  }

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "🎩 Pick a Hat 🎩"),
    h(
      Text,
      { color: "gray" },
      `Species: ${target.species}  │  Eyes: ${target.eye}  │  Rarity: ${target.rarity}`,
    ),
    h(Box, { marginTop: 1 }),
    ...grid,
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { color: "gray" },
      "← → ↑ ↓ Navigate  │  Enter Select  │  Esc Back",
    ),
  );
}
