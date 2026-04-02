import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  BUDDY_DATA,
  createPreviewBones,
  renderSprite,
  RARITY_COLORS,
} from "../sprite-utils.js";

const h = React.createElement;

export function ShinyToggle({ rarity, onSelect, onBack }) {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 350);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) setSelected((s) => (s === 0 ? 1 : 0));
    if (key.return) onSelect(selected === 1);
    if (key.escape) onBack();
  });

  const color = RARITY_COLORS[rarity] ?? "white";
  const bones = createPreviewBones({
    rarity,
    species: "dragon",
    eye: "✦",
    hat: rarity === "common" ? "none" : "crown",
    shiny: false,
  });
  const normalSprite = renderSprite(BUDDY_DATA, bones, frame);
  const shinySprite = renderSprite(BUDDY_DATA, { ...bones, shiny: true }, frame);
  const shinyInverse = frame % 2 === 0;

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    h(Text, { bold: true, color: "cyan" }, "✧ Shiny Mode? ✧"),
    h(Text, { color: "gray" }, "Shiny buddies have a 1% chance per roll"),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      { flexDirection: "row", gap: 4 },
      h(
        Box,
        {
          flexDirection: "column",
          alignItems: "center",
          borderStyle: selected === 0 ? "double" : "single",
          borderColor: selected === 0 ? color : "gray",
          paddingX: 2,
          paddingY: 1,
          width: 24,
        },
        h(
          Text,
          { bold: true, color: selected === 0 ? color : "gray" },
          "Normal",
        ),
        h(Box, { marginTop: 1 }),
        ...normalSprite.map((line, i) =>
          h(Text, { key: `n${i}`, color: selected === 0 ? color : "gray" }, line),
        ),
      ),
      h(
        Box,
        {
          flexDirection: "column",
          alignItems: "center",
          borderStyle: selected === 1 ? "double" : "single",
          borderColor: selected === 1 ? "yellow" : "gray",
          paddingX: 2,
          paddingY: 1,
          width: 24,
        },
        h(
          Text,
          {
            bold: true,
            color: selected === 1 ? "yellow" : "gray",
          },
          "✨ Shiny ✨",
        ),
        h(Box, { marginTop: 1 }),
        ...shinySprite.map((line, i) =>
          h(
            Text,
            {
              key: `s${i}`,
              color: "yellow",
              bold: selected === 1 && shinyInverse,
              inverse: selected === 1 && shinyInverse,
            },
            line,
          ),
        ),
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
