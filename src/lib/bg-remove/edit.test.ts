import { expect, it } from "vitest";
import { initialRect, scaleEdit } from "./edit";

it("initialRect leaves a 5 % margin", () => {
  expect(initialRect({ width: 1000, height: 600 })).toEqual({ x: 50, y: 30, width: 900, height: 540 });
  expect(initialRect({ width: 1, height: 1 }).width).toBe(1);
});

it("scaleEdit scales the rectangle, the points and the brush", () => {
  const out = scaleEdit({ rect: { x: 10, y: 20, width: 100, height: 200 }, strokes: [{ kind: "keep", radius: 8, points: [[4, 6]] }] }, 0.5);
  expect(out).toEqual({ rect: { x: 5, y: 10, width: 50, height: 100 }, strokes: [{ kind: "keep", radius: 4, points: [[2, 3]] }] });
});
