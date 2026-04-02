import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
} from "../sprite-utils.js";

const h = React.createElement;

export function ModePicker({ onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 350);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) setSelected((s) => (s === 0 ? 1 : 0));
    if (key.return) onSelect(selected === 0 ? "ultra" : "custom");
    if (key.escape) onBack();
  });

  const ultraBones = createPreviewBones({
    rarity: "legendary",
    species: "dragon",
    eye: "◉",
    hat: "tinyduck",
    shiny: true,
  });
  const ultraSprite = renderSprite(BUDDY_DATA, ultraBones, frame);

  const customBones = createPreviewBones({
    rarity: "epic",
    species: "cat",
    eye: "✦",
    hat: "wizard",
    shiny: false,
  });
  const customSprite = renderSprite(BUDDY_DATA, customBones, frame);

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "⚡ Choose Your Mode ⚡"),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      { flexDirection: "row", gap: 4 },
      // Ultra card
      h(
        Box,
        {
          flexDirection: "column",
          alignItems: "center",
          borderStyle: selected === 0 ? "double" : "single",
          borderColor: selected === 0 ? "yellow" : "gray",
          paddingX: 2,
          paddingY: 1,
          width: 28,
        },
        h(
          Text,
          { bold: true, color: selected === 0 ? "yellow" : "white" },
          "⭐ ULTRA PRESET ⭐",
        ),
        h(Box, { marginTop: 1 }),
        ...ultraSprite.map((line, i) =>
          h(Text, { key: `u${i}`, color: "yellow" }, line),
        ),
        h(Box, { marginTop: 1 }),
        h(Text, { color: "yellow", dimColor: true }, "Legendary + Shiny"),
        h(Text, { color: "yellow", dimColor: true }, "Dragon + Tinyduck"),
      ),
      // Custom card
      h(
        Box,
        {
          flexDirection: "column",
          alignItems: "center",
          borderStyle: selected === 1 ? "double" : "single",
          borderColor: selected === 1 ? "magenta" : "gray",
          paddingX: 2,
          paddingY: 1,
          width: 28,
        },
        h(
          Text,
          { bold: true, color: selected === 1 ? "magenta" : "white" },
          "🎨 CUSTOM BUILD 🎨",
        ),
        h(Box, { marginTop: 1 }),
        ...customSprite.map((line, i) =>
          h(Text, { key: `c${i}`, color: "magenta" }, line),
        ),
        h(Box, { marginTop: 1 }),
        h(Text, { color: "magenta", dimColor: true }, "Choose everything"),
        h(Text, { color: "magenta", dimColor: true }, "Your way"),
      ),
    ),
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { color: "gray" },
      "← → Navigate  │  Enter Select  │  Esc Back",
    ),
  );
}
