import { Fraunces, Instrument_Sans } from "next/font/google";

const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const deckFontVariables = `${displayFont.variable} ${bodyFont.variable}`;
