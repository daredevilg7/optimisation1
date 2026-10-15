const test = require('node:test');
const assert = require('node:assert/strict');
const { renderSearchPoints } = require('../dist/plot.js');

const scale = { width: 680, height: 320, left: 58, right: 18, top: 18, bottom: 40, xMin: -1, xMax: 0, yMin: 0, yMax: 1 };
const steps = [
  { points: [{ x: -0.75, y: 0.7 }, { x: -0.25, y: 0.2 }] },
  { points: [{ x: -0.5, y: 0.3 }] },
];

test('plot shows search points through the selected step and marks the current step', () => {
  const svg = renderSearchPoints(steps, 1, scale);
  assert.equal((svg.match(/<circle\b/g) || []).length, 3);
  assert.equal((svg.match(/class="search-point current"/g) || []).length, 1);
  assert.match(svg, /Шаг 2/);
});

test('plot does not show points from steps after the selected step', () => {
  const svg = renderSearchPoints(steps, 0, scale);
  assert.equal((svg.match(/<circle\b/g) || []).length, 2);
  assert.doesNotMatch(svg, /Шаг 2/);
});
