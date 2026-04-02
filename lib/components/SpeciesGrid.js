import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
} from "../sprite-utils.js";

const h = React.createElement;

const CELL_WIDTH = 18;

function SpriteCell({ species, rarity, eye, isSelected, frame, color }) {
  const bones = createPreviewBones({
    rarity,
    species,
    eye: eye ?? BUDDY_DATA.eyes[0],
    hat: "none",
    shiny: false,
  });
  const lines = renderSprite(BUDDY_DATA, bones, frame);

  return h(
    Box,
    {
      flexDirection: "column",
      alignItems: "center",
      borderStyle: isSelected ? "double" : "round",
      borderColor: isSelected ? color : "gray",
      width: CELL_WIDTH,
      paddingX: 0,
    },
    ...lines.map((line, i) =>
      h(
        Text,
        { key: i, color: isSelected ? color : "white" },
        line,
      ),
    ),
    h(
      Text,
      {
        bold: isSelected,
        color: isSelected ? color : "gray",
        wrap: "truncate",
      },
      isSelected ? `▸${species.toUpperCase()}` : ` ${species}`,
    ),
  );
}

export function SpeciesGrid({ rarity, readOnly, onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const { stdout } = useStdout();

  const cols = useMemo(() => {
    const termWidth = stdout?.columns ?? 80;
    return Math.max(2, Math.min(6, Math.floor(termWidth / CELL_WIDTH)));
  }, [stdout?.columns]);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 400);
    return () => clearInterval(timer);
  }, []);

  const species = BUDDY_DATA.species;
  const rows = Math.ceil(species.length / cols);
  const color = RARITY_COLORS[rarity] ?? "yellow";

  useInput((input, key) => {
    if (key.leftArrow) {
      setSelected((s) => (s % cols > 0 ? s - 1 : s));
    }
    if (key.rightArrow) {
      setSelected((s) => (s % cols < cols - 1 && s + 1 < species.length ? s + 1 : s));
    }
    if (key.upArrow) {
      setSelected((s) => (s - cols >= 0 ? s - cols : s));
    }
    if (key.downArrow) {
      setSelected((s) => (s + cols < species.length ? s + cols : s));
    }
    if (key.return) {
      if (readOnly) {
        onSelect?.(species[selected]);
      } else {
        onSelect(species[selected]);
      }
    }
    if (key.escape) onBack?.();
    if (input === "q" && readOnly) onBack?.();

    // number quick-jump
    const num = Number(input);
    if (num >= 1 && num <= 9 && num <= species.length) {
      setSelected(num - 1);
    }
  });

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const rowCells = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= species.length) break;
      rowCells.push(
        h(SpriteCell, {
          key: species[idx],
          species: species[idx],
          rarity,
          isSelected: idx === selected,
          frame,
          color,
        }),
      );
    }
    grid.push(
      h(Box, { key: `row-${r}`, flexDirection: "row", gap: 0 }, ...rowCells),
    );
  }

  const title = readOnly
    ? "✦ Species Catalog ✦"
    : "✦ Choose Your Species ✦";

  const hint = readOnly
    ? "← → ↑ ↓ Browse  │  q Quit"
    : "← → ↑ ↓ Navigate  │  Enter Select  │  Esc Back";

  return h(
    Box,
    { flexDirection: "column", alignItems: "center" },
    h(Text, { bold: true, color: "cyan" }, title),
    h(
      Text,
      { color },
      `Rarity: ${rarity}  │  ${species.length} species available`,
    ),
    h(Box, { marginTop: 1 }),
    ...grid,
    h(Box, { marginTop: 1 }),
    h(Text, { color: "gray" }, hint),
  );
}
