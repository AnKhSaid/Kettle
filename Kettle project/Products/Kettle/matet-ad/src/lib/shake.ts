import { prog, ease } from "./time";

/** Camera shake while the water boils (3.2-4.8 s) and a short thump on the drop (7.2 s). */
export const shake = (t: number) => {
  const amount = (t < 4.8 ? prog(t, 3.2, 4.2, ease.in2) : 0) + (t >= 7.2 ? Math.max(0, 1 - (t - 7.2) / 0.35) * 0.6 : 0);
  if (amount < 0.001) return { translate: "0px 0px", rotate: "0deg" };
  return {
    translate: `${Math.sin(t * 61.3) * Math.cos(t * 17.1) * 16 * amount}px ${Math.cos(t * 47.9) * Math.sin(t * 23.3) * 16 * amount}px`,
    rotate: `${Math.sin(t * 37.7) * 0.8 * amount}deg`,
  };
};
