import React from "react";
import { clamp01 } from "../lib/time";
import { FONTS } from "../theme";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const COL_W = 0.64;

const Column: React.FC<{ position: number; width?: number }> = ({ position, width = 1 }) => (
  <div style={{ height: "1em", overflow: "hidden", width: `${COL_W * width}em`, opacity: width, position: "relative" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", translate: `0px ${-position}em` }}>
      {DIGITS.map((d, i) => (
        <div key={i} style={{ height: "1em" }}>
          {d}
        </div>
      ))}
    </div>
  </div>
);

/** A rolling mechanical counter: digits roll like a car odometer as `value` changes. */
export const Odometer: React.FC<{ value: number; color: string; fontSize: number }> = ({ value, color, fontSize }) => {
  const ones = value % 10;
  const tens = (Math.floor(value / 10) % 10) + clamp01((value % 10) - 9);
  const hundreds = Math.floor(value / 100) + clamp01((value % 100) - 99);
  const showHundreds = clamp01(value - 99);
  return (
    <div
      style={{
        display: "flex",
        direction: "ltr",
        alignItems: "center",
        fontFamily: FONTS.sans,
        fontWeight: 800,
        fontSize,
        lineHeight: 1,
        letterSpacing: -8,
        color,
      }}
    >
      <Column position={hundreds} width={showHundreds} />
      <Column position={tens} />
      <Column position={ones} />
      <div style={{ fontWeight: 300, alignSelf: "flex-start", marginTop: "-0.02em", marginLeft: "0.02em" }}>°</div>
    </div>
  );
};
