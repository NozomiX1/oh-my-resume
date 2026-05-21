import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDensityClass,
  densityClassForLevel,
  getOverflowRatio,
  nextDensityLevel
} from "../src/fit.js";

test("maps density levels to CSS classes", () => {
  assert.equal(densityClassForLevel(0), "density-normal");
  assert.equal(densityClassForLevel(1), "density-tight");
  assert.equal(densityClassForLevel(2), "density-ultra");
  assert.equal(densityClassForLevel(99), "density-ultra");
});

test("clamps negative density levels to normal", () => {
  assert.equal(densityClassForLevel(-1), "density-normal");
});

test("advances density until the maximum level", () => {
  assert.equal(nextDensityLevel(0), 1);
  assert.equal(nextDensityLevel(1), 2);
  assert.equal(nextDensityLevel(2), 2);
});

test("calculates overflow ratio", () => {
  assert.equal(getOverflowRatio(100, 100), 0);
  assert.equal(getOverflowRatio(125, 100), 0.25);
  assert.equal(getOverflowRatio(90, 100), 0);
});

test("returns no overflow for invalid page height", () => {
  assert.equal(getOverflowRatio(125, 0), 0);
  assert.equal(getOverflowRatio(125, -100), 0);
});

test("returns no overflow for invalid content height", () => {
  assert.equal(getOverflowRatio(NaN, 100), 0);
  assert.equal(getOverflowRatio(Infinity, 100), 0);
});

test("applies one density class at a time", () => {
  const classes = new Set(["resume-page", "density-normal", "density-tight"]);
  const element = {
    classList: {
      add: (value) => classes.add(value),
      remove: (...values) => {
        for (const value of values) {
          classes.delete(value);
        }
      }
    }
  };

  applyDensityClass(element, 2);

  assert.deepEqual([...classes].sort(), ["density-ultra", "resume-page"]);
});
