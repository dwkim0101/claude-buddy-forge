import React, { useState, useCallback } from "react";
import { Box, Text, useApp } from "ink";
import { TitleBanner } from "./TitleBanner.js";
import { ModePicker } from "./ModePicker.js";
import { RarityPicker } from "./RarityPicker.js";
import { ShinyToggle } from "./ShinyToggle.js";
import { SpeciesGrid } from "./SpeciesGrid.js";
import { EyePicker } from "./EyePicker.js";
import { HatPicker } from "./HatPicker.js";
import { FinalPreview } from "./FinalPreview.js";
import { BUDDY_DATA } from "../sprite-utils.js";

const h = React.createElement;

const ULTRA_TARGET = {
  rarity: "legendary",
  shiny: true,
  species: "dragon",
  hat: "tinyduck",
  eye: "◉",
};

const STEPS = [
  "title",
  "mode",
  "rarity",
  "shiny",
  "species",
  "eye",
  "hat",
  "final",
];

export function App({ onComplete, catalogOnly }) {
  const { exit } = useApp();
  const [step, setStep] = useState(catalogOnly ? "catalog" : "title");
  const [target, setTarget] = useState({});

  const advance = useCallback(
    (nextStep, updates) => {
      if (updates) setTarget((prev) => ({ ...prev, ...updates }));
      setStep(nextStep);
    },
    [],
  );

  if (step === "catalog") {
    return h(SpeciesGrid, {
      rarity: "legendary",
      readOnly: true,
      onSelect: () => exit(),
      onBack: () => exit(),
    });
  }

  if (step === "title") {
    return h(TitleBanner, { onContinue: () => advance("mode") });
  }

  if (step === "mode") {
    return h(ModePicker, {
      onSelect: (mode) => {
        if (mode === "ultra") {
          setTarget(ULTRA_TARGET);
          setStep("final");
        } else {
          advance("rarity");
        }
      },
      onBack: () => advance("title"),
    });
  }

  if (step === "rarity") {
    return h(RarityPicker, {
      onSelect: (rarity) => advance("shiny", { rarity }),
      onBack: () => advance("mode"),
    });
  }

  if (step === "shiny") {
    return h(ShinyToggle, {
      rarity: target.rarity,
      onSelect: (shiny) => advance("species", { shiny }),
      onBack: () => advance("rarity"),
    });
  }

  if (step === "species") {
    return h(SpeciesGrid, {
      rarity: target.rarity,
      readOnly: false,
      onSelect: (species) => advance("eye", { species }),
      onBack: () => advance("shiny"),
    });
  }

  if (step === "eye") {
    return h(EyePicker, {
      target,
      onSelect: (eye) => advance("hat", { eye }),
      onBack: () => advance("species"),
    });
  }

  if (step === "hat") {
    const hatChoices =
      target.rarity === "common" ? ["none"] : BUDDY_DATA.hats;
    if (hatChoices.length === 1) {
      advance("final", { hat: "none" });
      return null;
    }
    return h(HatPicker, {
      target,
      onSelect: (hat) => advance("final", { hat }),
      onBack: () => advance("eye"),
    });
  }

  if (step === "final") {
    return h(FinalPreview, {
      target,
      onConfirm: () => {
        onComplete(target);
        exit();
      },
      onBack: () => {
        if (target === ULTRA_TARGET) {
          advance("mode");
        } else {
          advance("hat");
        }
      },
    });
  }

  return null;
}
