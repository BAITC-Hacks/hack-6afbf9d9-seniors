import { getStory, storyDecisions, storyOptionAvailability } from './story.js';

/** Envelopes are player-defined spending ceilings, not new project prices.
 * Every project still uses the catalogue and is evaluated by the server.
 */
export const STORY_CATEGORIES = Object.freeze(['social', 'green', 'transport', 'safety', 'services']);
const meetings = getStory();
const starterIds = Object.freeze({ social: 'M7', green: 'M6', transport: 'M2', safety: 'M10', services: 'M14' });
const emptyTotals = () => Object.fromEntries(STORY_CATEGORIES.map(category => [category, 0]));

function validChoices(choices) {
  if (!Array.isArray(choices) || choices.length > meetings.length) return false;
  for (let step = 0; step < choices.length; step += 1) {
    if (!Number.isInteger(choices[step]) || choices[step] < 0 || choices[step] >= meetings[step].choices.length) return false;
  }
  return true;
}

/** Structural normalization is deliberately independent of decisions. The
 * catalogue argument keeps the same call shape as the budget helpers; use
 * allocationSummary to check committed spending and future minimums as well.
 */
export function normalizeAllocations(value, initiatives, budget = 100) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isInteger(budget) || budget < 0) return null;
  if (Object.keys(value).some(key => !STORY_CATEGORIES.includes(key))) return null;
  const normalized = emptyTotals();
  for (const category of STORY_CATEGORIES) {
    if (!Object.hasOwn(value, category) || !Number.isInteger(value[category]) || value[category] < 0 || value[category] > budget) return null;
    normalized[category] = value[category];
  }
  return Object.values(normalized).reduce((total, value) => total + value, 0) <= budget ? normalized : null;
}

export function allocationSummary(allocations, choices, initiatives, budget = 100) {
  const normalized = normalizeAllocations(allocations, initiatives, budget);
  const allocated = normalized ? Object.values(normalized).reduce((sum, value) => sum + value, 0) : 0;
  const spentByCategory = emptyTotals();
  const minimumByCategory = emptyTotals();
  const result = reason => ({ allocated, reserve: budget - allocated, spentByCategory, minimumByCategory, valid: !reason, reason });
  if (!validChoices(choices) || !Number.isInteger(budget) || budget < 0) return result('invalid');
  if (!Array.isArray(initiatives)) return result('unavailable');
  const catalogue = new Map(initiatives.filter(item => item && typeof item.id === 'string').map(item => [item.id, item]));
  const costOf = decision => {
    const item = catalogue.get(decision.initiativeId);
    return item && Number.isInteger(item.cost) && item.cost >= 0 && item.categoryId === decision.categoryId
      && item.scope === (decision.districtId ? 'district' : 'city') ? item.cost : null;
  };
  for (const decision of storyDecisions(choices)) {
    const cost = costOf(decision);
    if (cost === null) return result('unavailable');
    spentByCategory[decision.categoryId] += cost;
    minimumByCategory[decision.categoryId] += cost;
  }
  for (let step = choices.length; step < meetings.length; step += 1) {
    const costs = meetings[step].choices.map(costOf).filter(value => value !== null);
    if (!costs.length) return result('unavailable');
    minimumByCategory[meetings[step].choices[0].categoryId] += Math.min(...costs);
  }
  if (!normalized) return result('invalid');
  for (const category of STORY_CATEGORIES) {
    if (normalized[category] < spentByCategory[category]) return result('committed');
    if (normalized[category] < minimumByCategory[category]) return result('minimum');
  }
  return result('');
}

/** A reproducible opening plan, adjusted to cover an existing route. */
export function defaultAllocations(initiatives, budget = 100, choices = []) {
  const probe = allocationSummary(emptyTotals(), choices, initiatives, budget);
  if (['invalid', 'unavailable'].includes(probe.reason)) throw new TypeError('Cannot plan without valid story choices and catalogue costs');
  if (Object.values(probe.minimumByCategory).reduce((sum, value) => sum + value, 0) > budget) throw new RangeError('The story cannot be completed within this budget');
  const allocations = {};
  for (const category of STORY_CATEGORIES) {
    const measure = initiatives.find(item => item?.id === starterIds[category]);
    if (!measure || measure.categoryId !== category || !Number.isInteger(measure.cost) || measure.cost < 0) throw new TypeError('Opening plan requires catalogue costs');
    allocations[category] = Math.max(probe.minimumByCategory[category], measure.cost);
  }
  let excess = Object.values(allocations).reduce((sum, value) => sum + value, 0) - budget;
  while (excess > 0) {
    const category = STORY_CATEGORIES.reduce((best, candidate) => allocations[candidate] - probe.minimumByCategory[candidate]
      > allocations[best] - probe.minimumByCategory[best] ? candidate : best);
    allocations[category] -= 1;
    excess -= 1;
  }
  return allocations;
}

/** Keep the existing completion/compatibility guard, then enforce the player's
 * envelopes on the candidate prefix. Revisited later answers are not charged.
 */
export function plannedOptionAvailability(choices, step, index, initiatives, budget = 100, allocations = null) {
  const base = storyOptionAvailability(choices, step, index, initiatives, budget);
  if (!base.allowed || allocations === null) return base;
  const prefix = [...choices.slice(0, step), index];
  const summary = allocationSummary(allocations, prefix, initiatives, budget);
  return summary.valid ? base : { ...base, allowed: false, reason: 'allocation' };
}
