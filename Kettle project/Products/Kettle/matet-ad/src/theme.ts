import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const COLORS = {
  cream: "#F2EDE3",
  ink: "#1B1A18",
  muted: "#756E61",
  soft: "#D9D1C1",
  green: "#3E7A38",
  leaf: "#6AA344",
  clay: "#C8613F",
  sun: "#F0B44C",
  water: "#8FC2D8",
} as const;

export const FONTS = {
  // Bold geometric Arabic for reveals, numbers and the brand.
  sans: "Alexandria",
  // Calligraphic Ruqaa for the riddle lines (reads like handwriting).
  ruqaa: "Ruqaa",
  // Classical Naskh for the calm, literary lines of option 2.
  naskh: "Amiri",
} as const;

const ARABIC = "U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFC, U+200C-200F";
const LATIN = "U+0000-00FF, U+2000-206F";

// Each font ships as an Arabic and a Latin subset; unicode-range lets both share a family.
export const fontsLoaded = Promise.all([
  ...[200, 300, 400, 600, 800].flatMap((w) => [
    loadFont({
      family: FONTS.sans,
      url: staticFile(`fonts/alexandria-arabic-${w}-normal.woff2`),
      weight: String(w),
      unicodeRange: ARABIC,
    }),
    loadFont({
      family: FONTS.sans,
      url: staticFile(`fonts/alexandria-latin-${w}-normal.woff2`),
      weight: String(w),
      unicodeRange: LATIN,
    }),
  ]),
  loadFont({
    family: FONTS.ruqaa,
    url: staticFile("fonts/aref-ruqaa-arabic-700-normal.woff2"),
    weight: "700",
    unicodeRange: ARABIC,
  }),
  ...[400, 700].flatMap((w) => [
    loadFont({ family: FONTS.naskh, url: staticFile(`fonts/amiri-arabic-${w}-normal.woff2`), weight: String(w), unicodeRange: ARABIC }),
    loadFont({ family: FONTS.naskh, url: staticFile(`fonts/amiri-latin-${w}-normal.woff2`), weight: String(w), unicodeRange: LATIN }),
  ]),
  loadFont({
    family: FONTS.ruqaa,
    url: staticFile("fonts/aref-ruqaa-latin-700-normal.woff2"),
    weight: "700",
    unicodeRange: LATIN,
  }),
]);
