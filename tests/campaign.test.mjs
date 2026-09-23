/** Run with node tests/campaign.test.mjs; no API or browser required. */
import assert from 'node:assert/strict';
import { getStory } from '../public/story.js';
import { getMeeting } from '../public/narrative.js';
import { campaignText, getBriefing, getDiscovery, enrichMeeting, getCouncil, getCampaignClosing } from '../public/campaign.js';

const languages = ['ru', 'kk', 'en'];
const choices = [0, 1, 0, 0, 0];
const keys = ['start', 'modeTitle', 'modeHint', 'storyMode', 'freeMode', 'backMenu', 'storyModeHint', 'freeModeHint',
  'planningTitle', 'planningIntro', 'planningApply', 'planningCancel', 'planningEdit', 'planned', 'allocated', 'reserve',
  'committed', 'minimum', 'remaining', 'planInvalid', 'allocationLocked', 'budgetHint', 'inquiryChoose', 'inquiryContinue',
  'councilKeep', 'councilReview', 'approach', 'chronicle', 'inquiryHint', 'councilHint', 'presetBalanced', 'presetSocial',
  'presetGreen', 'planningReset', 'projectCosts', 'categoryCap', 'currentPlan', 'planning', 'briefing', 'council', 'discovery',
  'replanFromHere', 'replanWarning', 'replanConfirm'];
const routes = Array.from({ length: 32 }, (_, value) => Array.from({ length: 5 }, (_, step) => (value >> step) & 1));

function verifyText(value, language) {
  assert.equal(typeof value, 'string');
  assert.ok(value.trim());
  assert.doesNotMatch(value, /\b(?:undefined|null)\b|\{\w+\}/);
  if (language === 'en') assert.doesNotMatch(value, /[А-Яа-яЁёӘІҢҒҮҰҚӨҺәіңғүұқөһ]/u);
}
function verifyScene(scene, language) {
  assert.ok(scene);
  for (const key of ['title', 'kicker', 'speaker', 'id']) verifyText(scene[key], language);
  assert.match(scene.time, /^\d{2}:\d{2}$/);
  assert.ok(Number.isInteger(scene.portrait) && scene.portrait >= 0 && scene.portrait < 5);
  assert.ok(['map', 'lab', 'call'].includes(scene.visual));
  assert.ok(scene.lines.length >= 2);
  scene.lines.forEach(line => verifyText(line, language));
  if (scene.cta) verifyText(scene.cta, language);
  if (scene.options) {
    assert.equal(scene.options.length, 2);
    for (const option of scene.options) {
      verifyText(option.title, language);
      verifyText(option.description, language);
    }
  }
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
const identity = choice => ({ initiativeId: choice.initiativeId, categoryId: choice.categoryId, districtId: choice.districtId });

let checks = 0;
for (const language of languages) {
  keys.forEach(key => {
    const value = campaignText(key, language);
    verifyText(value, language);
    assert.notEqual(value, key, `${language} copy missing for ${key}`);
  });
  const originalStory = getStory(language);
  const discoveryIds = new Set();
  const discoveryTitles = new Set();
  const discoveryBodies = new Set();
  for (let step = 0; step < 5; step += 1) {
    const briefing = getBriefing(step, {}, language);
    verifyScene(briefing, language);
    assert.equal(briefing.portrait, step);
    assert.notEqual(briefing.options[0].title, briefing.options[1].title);
    for (const inquiry of [0, 1]) {
      const inquiries = Array(5).fill(null);
      inquiries[step] = inquiry;
      const discovery = getDiscovery(step, { inquiries }, language);
      verifyScene(discovery, language);
      discoveryIds.add(discovery.id);
      discoveryTitles.add(discovery.title);
      discoveryBodies.add(discovery.lines.join(' '));
      assert.ok(discovery.time > briefing.time);
      const base = getMeeting(step, choices, language);
      const enriched = enrichMeeting(base, { inquiries }, language);
      assert.ok(enriched.time > discovery.time, 'The meeting cannot happen before its investigation.');
      assert.deepEqual(enriched.choices.map(identity), base.choices.map(identity));
      assert.ok(enriched.lines.length > base.lines.length);
      assert.ok(enriched.choices.every((choice, index) => choice.reply !== base.choices[index].reply));
      for (const choice of enriched.choices) {
        verifyText(choice.reply, language);
        verifyText(choice.context, language);
      }
      const alternative = [...inquiries];
      alternative[step] = 1 - inquiry;
      const other = enrichMeeting(base, { inquiries: alternative }, language);
      assert.notDeepEqual(enriched.lines, other.lines, 'Every inquiry changes the current dialogue.');
      assert.ok(enriched.choices.every((choice, index) => choice.reply !== other.choices[index].reply));
      if (step < 4) {
        const next = getMeeting(step + 1, choices, language);
        assert.notDeepEqual(enrichMeeting(next, { inquiries }, language).lines,
          enrichMeeting(next, { inquiries: alternative }, language).lines,
          'The next person must react to the inquiry approach.');
      }
      checks += 1;
    }
    assert.equal(getDiscovery(step, {}, language), null);
    assert.equal(getDiscovery(step, { inquiries: Array(5).fill(2) }, language), null);
    assert.equal(getDiscovery(step, { inquiries: Array(5).fill('0') }, language), null);
  }
  assert.equal(discoveryIds.size, 10);
  assert.equal(discoveryTitles.size, 10);
  assert.equal(discoveryBodies.size, 10);

  for (const inquiries of routes) {
    const state = freeze({ inquiries: [...inquiries], choices: [...choices], council: 'review',
      allocations: { social: 24, green: 25, transport: 18, safety: 12, services: 21 } });
    for (let step = 0; step < 5; step += 1) {
      const base = freeze(getMeeting(step, choices, language));
      const full = enrichMeeting(base, state, language);
      const prefix = { ...state, inquiries: inquiries.slice(0, step + 1), choices: choices.slice(0, step) };
      assert.deepEqual(full, enrichMeeting(base, prefix, language), 'Future investigation choices cannot leak into an earlier meeting.');
      assert.deepEqual(getDiscovery(step, state, language), getDiscovery(step, prefix, language), 'Discovery must ignore later data.');
      assert.deepEqual(getBriefing(step, state, language), getBriefing(step, prefix, language));
      assert.deepEqual(full.choices.map(identity), base.choices.map(identity), 'Campaign cannot change initiative identity, targets or ordering.');
      full.lines.forEach(line => verifyText(line, language));
      // A council outcome belongs only to the safety and services chapters.
      if (step < 3) assert.deepEqual(full, enrichMeeting(base, { ...state, council: 'hold' }, language));
      checks += 4;
    }
    const council = getCouncil(state, language);
    verifyScene(council, language);
    assert.equal(council.time, '11:50');
    assert.deepEqual(council, getCouncil({ ...state, inquiries: inquiries.slice(0, 3), choices: choices.slice(0, 3) }, language),
      'A mid-day council cannot refer to safety or services investigations.');
    const closing = getCampaignClosing(state, language);
    verifyText(closing.title, language);
    assert.equal(closing.lines.length, 6);
    closing.lines.forEach(line => verifyText(line, language));
    assert.notDeepEqual(closing, getCampaignClosing({ ...state, council: 'hold' }, language));
    for (let step = 0; step < 5; step += 1) {
      const alternative = [...inquiries];
      alternative[step] = 1 - alternative[step];
      assert.notEqual(closing.lines[step], getCampaignClosing({ ...state, inquiries: alternative }, language).lines[step],
        'Every inquiry must have an evening callback.');
    }
    checks += 7;
  }
  assert.deepEqual(getStory(language), originalStory, 'Campaign copy cannot mutate the canonical story.');
  const baseAdvisor = getMeeting(4, choices, language);
  assert.notDeepEqual(enrichMeeting(baseAdvisor, { inquiries: [0, 0, 0, 0, 0] }, language).lines,
    enrichMeeting(baseAdvisor, { inquiries: [1, 0, 0, 0, 0] }, language).lines, 'The advisor must remember the morning inquiry.');
}

for (const step of [-1, 5, 1.5, NaN, null, '0']) {
  assert.equal(getBriefing(step), null);
  assert.equal(getDiscovery(step, { inquiries: [0, 0, 0, 0, 0] }), null);
}
assert.equal(enrichMeeting(null), null);
assert.deepEqual(getCampaignClosing().lines, []);
assert.equal(campaignText('unknown-key'), 'unknown-key');
assert.equal(campaignText('start', 'unsupported'), campaignText('start', 'ru'));
assert.deepEqual(getBriefing(0, {}, 'unsupported'), getBriefing(0, {}, 'ru'));
console.log(`Campaign checks passed: 3 languages, 10 discoveries, 32 investigation routes, ${checks} continuity and isolation checks.`);
