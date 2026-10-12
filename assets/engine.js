/** Centimetres are the canonical internal unit. Buffer inputs use percent points. */
export const DEFAULT_BUFFERS = Object.freeze({ seamBuffer: 7, shrinkageBuffer: 0, patternMatchBuffer: 0, wastageBuffer: 5 });

function positiveNumber(value, label, allowZero = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new RangeError(`${label} must be ${allowZero ? 'non-negative' : 'positive'} and finite`);
  }
  return n;
}

export function normalizeBuffers(buffers = {}) {
  const merged = { ...DEFAULT_BUFFERS, ...buffers };
  const result = {};
  for (const key of Object.keys(DEFAULT_BUFFERS)) {
    const n = positiveNumber(merged[key], key, true);
    if (n > 100) throw new RangeError(`${key} cannot exceed 100%`);
    result[key] = n;
  }
  return result;
}

export function roundUpToIncrement(value, increment = 0.5) {
  positiveNumber(increment, 'purchaseIncrement');
  return Math.ceil((value - 1e-10) / increment) * increment;
}

/** Finds the catenary parameter from horizontal span and centre sag; stable bisection. */
export function solveCatenary(spanCm, sagCm) {
  const span = positiveNumber(spanCm, 'spanDistance');
  const sag = positiveNumber(sagCm, 'sagDepth', true);
  if (sag === 0) return { a: Infinity, t: 0, length: span };
  if (sag > 3 * span) throw new RangeError('sagDepth must not exceed three times spanDistance');
  const ratio = (2 * sag) / span;
  let lo = 0, hi = 10;
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    const candidate = mid < 1e-4 ? mid / 2 + (mid ** 3) / 24 : (Math.cosh(mid) - 1) / mid;
    if (candidate < ratio) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  const a = span / (2 * t);
  return { a, t, length: span * Math.sinh(t) / t };
}

/** Centre is -sag; ends are 0. x lies between -span/2 and +span/2. */
export function catenaryDropAt(xCm, spanCm, sagCm) {
  if (Number(sagCm) === 0) return 0;
  const { a } = solveCatenary(spanCm, sagCm);
  return a * (Math.cosh(xCm / a) - Math.cosh(spanCm / (2 * a)));
}

export function calculateBackdrop(inputs) {
  const fabricWidth = positiveNumber(inputs.fabricWidth, 'fabricWidth');
  const fullnessRatio = positiveNumber(inputs.fullnessRatio, 'fullnessRatio');
  const backdropWidth = positiveNumber(inputs.dimensions?.backdropWidth, 'backdropWidth');
  const backdropHeight = positiveNumber(inputs.dimensions?.backdropHeight, 'backdropHeight');
  const panelCount = Math.ceil((backdropWidth * fullnessRatio) / fabricWidth);
  const theoreticalLength = panelCount * backdropHeight;
  return {
    theoreticalLength,
    panelCount,
    individualCutLength: backdropHeight,
    calculatedFabricWidth: backdropWidth * fullnessRatio,
    note: 'Theoretical length covers full-height unjoined panels without allowances.'
  };
}

export function calculateCeilingDrape(inputs) {
  const fabricWidth = positiveNumber(inputs.fabricWidth, 'fabricWidth');
  const spanDistance = positiveNumber(inputs.dimensions?.spanDistance, 'spanDistance');
  const sagDepth = positiveNumber(inputs.dimensions?.sagDepth, 'sagDepth', true);
  const numberOfSwags = positiveNumber(inputs.dimensions?.numberOfSwags, 'numberOfSwags');
  if (!Number.isInteger(numberOfSwags) || numberOfSwags > 24) throw new RangeError('numberOfSwags must be an integer from 1 to 24');
  const method = inputs.dimensions?.calculationMethod === 'exact' ? 'exact' : 'brief';
  const approximatePerSwag = spanDistance * (1 + (sagDepth / spanDistance) * 0.6);
  const exactPerSwag = solveCatenary(spanDistance, sagDepth).length;
  const perSwagLength = method === 'exact' ? exactPerSwag : approximatePerSwag;
  return {
    theoreticalLength: perSwagLength * numberOfSwags,
    numberOfSwags,
    perSwagLength,
    approximatePerSwag,
    exactPerSwag,
    method,
    fabricWidth,
    note: method === 'brief' ? 'Brief formula is empirical; compare against mathematical catenary length.' : 'Exact catenary assumes equal-height endpoints.'
  };
}

export function calculateElement(element, purchaseIncrement = 0.5) {
  if (!element || !['backdrop', 'ceilingDrape'].includes(element.type)) {
    throw new Error('Only backdrop and ceilingDrape are supported in Phase 1');
  }
  const buffers = normalizeBuffers(element.buffers);
  const raw = element.type === 'backdrop' ? calculateBackdrop(element.inputs) : calculateCeilingDrape(element.inputs);
  const totalBufferPercent = Object.values(buffers).reduce((sum, n) => sum + n, 0);
  const recommendedLength = raw.theoreticalLength * (1 + totalBufferPercent / 100);
  const theoreticalMeters = raw.theoreticalLength / 100;
  const recommendedMeters = recommendedLength / 100;
  const purchaseMeters = roundUpToIncrement(recommendedMeters, purchaseIncrement);
  const result = {
    ...raw,
    recommendedLength,
    theoreticalMeters,
    recommendedMeters,
    purchaseMeters,
    totalBufferPercent,
    additionalLength: recommendedLength - raw.theoreticalLength,
    purchaseIncrement,
  };
  return {
    id: element.id || 'element-1',
    type: element.type,
    inputs: structuredClone(element.inputs),
    buffers,
    result,
    sceneParams: {
      type: element.type,
      fabricWidth: element.inputs.fabricWidth,
      fullnessRatio: element.inputs.fullnessRatio,
      dimensions: { ...element.inputs.dimensions },
      panelCount: result.panelCount,
      calculationMethod: result.method,
      color: element.sceneParams?.color || '#c4d6ec',
    },
  };
}

export function formatMeters(cm) {
  return (cm / 100).toFixed(2);
}
