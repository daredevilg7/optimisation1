(function (root) {
  'use strict';

  // Рисуем только уже вычисленные точки выбранного метода поверх графика.
  function renderSearchPoints(steps, stepIndex, scale) {
    if (!Array.isArray(steps) || !steps.length || !scale) return '';
    const lastStep = Math.min(Math.max(0, stepIndex), steps.length - 1);
    const sx = x => scale.left + (x - scale.xMin) / (scale.xMax - scale.xMin) * (scale.width - scale.left - scale.right);
    const sy = y => scale.height - scale.bottom - (y - scale.yMin) / (scale.yMax - scale.yMin) * (scale.height - scale.top - scale.bottom);
    return steps.slice(0, lastStep + 1).flatMap((step, index) =>
      (step.points || []).map(point => {
        const current = index === lastStep ? ' current' : '';
        const title = `Шаг ${index + 1}: x = ${point.x}, f(x) = ${point.y}`;
        const escaped = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
        return `<circle class="search-point${current}" cx="${sx(point.x).toFixed(2)}" cy="${sy(point.y).toFixed(2)}" r="4"><title>${escaped}</title></circle>`;
      }),
    ).join('');
  }

  root.OptimizationPlot = { renderSearchPoints };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OptimizationPlot;
})(typeof globalThis !== 'undefined' ? globalThis : window);
