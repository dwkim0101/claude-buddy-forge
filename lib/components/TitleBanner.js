import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

const h = React.createElement;

const BANNER = [
  "╔══════════════════════════════════════════════════╗",
  "║                                                  ║",
  "║   ✦  C L A U D E   B U D D Y   F O R G E  ✦    ║",
  "║                                                  ║",
  "║       Interactive Companion Reroller              ║",
  "║                                                  ║",
  "╚══════════════════════════════════════════════════╝",
];

const SPARKLE_FRAMES = ["✦", "✧", "⋆", "✧"];
const COLORS = ["yellow", "cyan", "magenta", "green", "blue"];

export function TitleBanner({ onContinue }) {
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
    if (key.return || input === " ") onContinue();
  });

  const sparkle = SPARKLE_FRAMES[frame % SPARKLE_FRAMES.length];
  const color = COLORS[frame % COLORS.length];

  return h(
    Box,
    { flexDirection: "column", alignItems: "center", paddingTop: 1 },
    BANNER.map((line, i) =>
      h(Text, { key: i, color: i === 2 ? color : "cyan", bold: i === 2 }, line),
    ),
    h(Box, { marginTop: 1 }),
    h(
      Text,
      { dimColor: blink },
      `   ${sparkle} Press Enter to start ${sparkle}   `,
    ),
    h(Box, { marginTop: 1 }),
    h(
      Box,
      { flexDirection: "row", gap: 2 },
      h(Text, { color: "gray" }, "18 species"),
      h(Text, { color: "gray" }, "•"),
      h(Text, { color: "gray" }, "6 eyes"),
      h(Text, { color: "gray" }, "•"),
      h(Text, { color: "gray" }, "8 hats"),
      h(Text, { color: "gray" }, "•"),
      h(Text, { color: "gray" }, "5 rarities"),
    ),
  );
}
