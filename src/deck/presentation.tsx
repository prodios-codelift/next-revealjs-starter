"use client";

import { Deck, Slide } from "@revealjs/react";
import "reveal.js/reveal.css";
import "./reveal-base.css";
import "./theme.css";

export function Presentation() {
  return (
    <Deck
      className="deck-theme"
      config={{
        width: 1920,
        height: 1080,
        margin: 0,
        minScale: 0.05,
        maxScale: 4,
        center: false,
        display: "flex",
        hash: true,
        transition: "fade",
      }}
    >
      <Slide className="slide-title">
        <div className="rule" />
        <h1>Presentation title</h1>
        <p className="subtitle">A placeholder deck. The slides skill replaces it.</p>
      </Slide>
      <Slide>
        <h2>Second slide</h2>
        <p>Placeholder content.</p>
      </Slide>
      <Slide>
        <h2>Third slide</h2>
        <p>Placeholder content.</p>
      </Slide>
    </Deck>
  );
}
