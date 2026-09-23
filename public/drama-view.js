import { getStory, storyText } from './story.js';
import { campaignText } from './campaign.js';
import { plannedOptionAvailability } from './story-budget.js';
import { translate } from './i18n.js';
import { dramaText, getVisibleDecisions, getEventFeed, getConsequences, getFinalSummary, highlightDialogue } from './drama.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const positions = { esil: [50, 72], almaty: [77, 38], saryarka: [22, 29], baikonur: [52, 25], nura: [23, 68] };
const safeDistrict = (data, id) => data.districts.find(district => district.id === id) || data.districts.find(district => district.id === 'nura') || data.districts[0];
const wording = language => ({
  d: (key, vars) => esc(dramaText(key, language, vars)),
  t: (key, vars) => esc(storyText(key, language, vars)),
  c: (key, vars) => esc(campaignText(key, language, vars)),
  tr: value => esc(translate(value, language)),
});

export function renderHQMap({ data, evaluation, story, language, icon, num, signed, affected = [], full = false }) {
  const { d, t, tr } = wording(language);
  const visible = getVisibleDecisions(story);
  const selected = safeDistrict(data, story.focusDistrict ?? visible.at(-1)?.districtId);
  const details = evaluation.districts.find(district => district.id === selected.id);
  const baseline = data.baseline.districts.find(district => district.id === selected.id);
  const categoriesByDistrict = new Map(data.districts.map(district => [district.id, new Set()]));
  const transport = [];
  for (const decision of visible) {
    const measure = data.initiatives.find(item => item.id === decision.initiativeId);
    if (!measure) continue;
    const targets = measure.scope === 'city' ? data.districts.map(district => district.id) : [decision.districtId];
    for (const id of targets) categoriesByDistrict.get(id)?.add(measure.categoryId);
    if (measure.categoryId === 'transport') transport.push({ ...decision, scope: measure.scope });
  }
  const routes = transport.length ? `<svg class="hq-map-routes" data-category="transport" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${transport.map(decision => {
    if (decision.scope === 'city') return '<path data-scope="city" d="M18 30 C35 8 68 15 80 39 S72 72 49 76 S20 73 18 58"/>';
    const [x, y] = positions[decision.districtId] || [50, 50];
    return `<path data-scope="district" d="M${x - 14} ${y + 12} C${x - 7} ${y + 15} ${x - 6} ${y - 11} ${x + 9} ${y - 6}"/>`;
  }).join('')}</svg>` : '';
  return `<section class="hq-map-panel ${full ? 'hq-map-full' : ''}" aria-labelledby="hq-map-title"><div class="hq-panel-heading"><h2 id="hq-map-title">${d('mapTitle')}</h2><span>${d('future')}</span></div><div class="hq-city-map"><img src="/city-map.svg" alt=""/>${routes}${data.districts.map(district => {
    const [x, y] = positions[district.id] || [50, 50];
    const result = evaluation.districts.find(item => item.id === district.id);
    const districtCategories = [...categoriesByDistrict.get(district.id)];
    return `<button class="hq-map-district ${selected.id === district.id ? 'selected' : ''} ${affected.includes(district.id) || districtCategories.length ? 'is-affected' : ''}" style="--map-x:${x}%;--map-y:${y}%" data-action="story-map-district" data-id="${esc(district.id)}" data-category="${esc(districtCategories[districtCategories.length - 1] || '')}" data-categories="${esc(districtCategories.join(' '))}" aria-pressed="${selected.id === district.id}" aria-label="${tr(district.name)}: ${num(result.before)} → ${num(result.after)}"><i class="hq-map-dot" aria-hidden="true"></i><span><strong>${tr(district.name)}</strong><small>${num(result.after)} <em>${signed(result.delta)}</em></small><span class="hq-map-category-dots" aria-hidden="true">${districtCategories.map(category => `<i data-category="${esc(category)}"></i>`).join('')}</span></span></button>`;
  }).join('')}</div>${transport.length ? `<p class="hq-map-route-caption">${d('schematicRoutes')}</p>` : ''}<div class="hq-district-summary"><h3>${icon('pin')}${tr(selected.name)}</h3><div class="hq-before-after"><span>${d('before')} <b>${num(details.before)}</b></span>${icon('arrow')}<span>${d('forecast')} <b>${num(details.after)}</b></span></div><details class="hq-indicator-details"><summary>${d('districtDetails')}</summary>${data.indicators.map(indicator => `<div class="hq-indicator-row"><span>${tr(indicator.name)}</span><b>${num(baseline.metrics[indicator.id])} → ${num(details.metrics[indicator.id])}</b></div>`).join('')}</details></div></section>`;
}

export function renderHQConsequence({ data, evaluation, initiativeId, language, icon, num, signed }) {
  const { d, t } = wording(language);
  const consequence = initiativeId ? getConsequences(data, evaluation, initiativeId, language) : null;
  if (!consequence) return `<section class="hq-consequence-panel"><h2>${d('changes')}</h2><p class="hq-consequence-note">${d('noConfirmedDecision')}</p></section>`;
  return `<section class="hq-consequence-panel hq-category-${esc(consequence.categoryId)}"><h2>${d('lastDecision')}</h2><h3 class="hq-consequence-title">${esc(consequence.title)}</h3><div class="hq-reaction"><span>${d('now')}</span><p>${esc(consequence.reaction)}</p></div><div class="hq-consequence-lag">${icon('clock')}<span>${t('launch', { quarters: consequence.lag })} · ${d('future')}</span></div><ul class="hq-change-list">${consequence.changes.map(change => `<li class="${change.delta < 0 ? 'is-negative' : ''}"><span>${esc(change.indicatorName)}</span><b>${signed(change.delta)}</b></li>`).join('')}</ul><p class="hq-consequence-note">${d('contributionNotice')}</p></section>`;
}

export function renderHQImpact(context) {
  const visible = getVisibleDecisions(context.story);
  const last = visible[visible.length - 1];
  const consequence = last ? getConsequences(context.data, context.evaluation, last.initiativeId, context.language) : null;
  return `<div class="hq-transition-impact">${renderHQMap({ ...context, affected: consequence?.districtIds || [] })}${renderHQConsequence({ ...context, initiativeId: last?.initiativeId })}</div>`;
}

export function renderCityBeat(beat, { language, icon, step = 0 }) {
  const { d } = wording(language);
  const channel = ['camera', 'message', 'call', 'news', 'map'].includes(beat.channel) ? beat.channel : 'message';
  const symbols = { camera: 'layers', message: 'book', call: 'help', news: 'flag', map: 'pin' };
  return `<section class="hq-city-beat hq-beat-${channel}" aria-labelledby="hq-city-beat-title"><div class="hq-beat-visual" aria-hidden="true"><img src="${channel === 'call' || channel === 'message' ? `/portraits/character-${Math.min(4, Math.max(0, step))}.png` : '/city-map.svg'}" alt=""/><span class="hq-beat-indicator">${icon(symbols[channel])}<b>${esc(beat.time)}</b></span><span class="hq-beat-reticle"></span>${channel === 'call' ? '<span class="hq-call-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' : ''}</div><div class="hq-beat-copy"><div class="hq-chapter">${d('cityPulse')} · ${esc(beat.time)}</div><h2 id="hq-city-beat-title">${esc(beat.title)}</h2><p>${highlightDialogue(beat.body, language)}</p><strong>${esc(beat.speaker)}</strong></div></section>`;
}

function renderBudget(data, evaluation, language, num, icon, button) {
  const { d, c } = wording(language);
  const ratio = Math.max(0, Math.min(100, evaluation.spent / data.budget * 100));
  return `<section class="hq-budget-panel"><h2>${icon('wallet')}${d('budget')}</h2><div class="hq-budget-value"><strong>${num(evaluation.remaining)}</strong><small>/ ${num(data.budget)}</small></div><div class="hq-budget-track" aria-hidden="true"><span style="width:${ratio}%"></span></div><div class="hq-budget-meta"><span>${c('committed')} <b>${num(evaluation.spent)}</b></span><span>${c('remaining')} <b>${num(evaluation.remaining)}</b></span></div>${button ? button('story-plan-open', c('planningEdit'), 'wallet', 'story-header-button') : ''}</section>`;
}

function renderAccepted({ data, story, language, num }) {
  const { d, tr, t } = wording(language);
  const decisions = getVisibleDecisions(story);
  return `<section class="hq-decisions-panel"><h2>${d('acceptedDecisions')}<span>${decisions.length} / 5</span></h2>${decisions.length ? `<ol class="hq-decision-list">${decisions.map((decision, index) => {
    const measure = data.initiatives.find(item => item.id === decision.initiativeId);
    const district = data.districts.find(item => item.id === decision.districtId);
    return `<li class="hq-category-${esc(measure.categoryId)}"><span class="hq-decision-index">${String(index + 1).padStart(2, '0')}</span><span class="hq-decision-title"><strong>${tr(measure.title)}</strong><small>${district ? tr(district.name) : t('city')}</small></span><b class="hq-decision-cost">${num(measure.cost)}</b></li>`;
  }).join('')}</ol>` : `<p class="hq-empty">${d('noDecisions')}</p>`}</section>`;
}

function renderFeed(story, language, icon) {
  const { d } = wording(language);
  const events = getEventFeed(story, language);
  return `<section class="hq-feed" aria-label="${d('cityFeed')}"><h2>${icon('city')}${d('cityFeed')}</h2><div class="hq-feed-list">${events.length ? events.map(event => `<div class="hq-feed-item hq-category-${esc(event.categoryId)}"><time>${esc(event.time)}</time><p>${highlightDialogue(event.text, language)}</p></div>`).join('') : `<p class="hq-empty">${d('noDecisions')}</p>`}</div></section>`;
}

function renderReplayControls(story, language, button) {
  const { d } = wording(language);
  return `<div class="hq-replay-banner"><p>${d('replayNotice')}</p><div class="hq-replay-controls">${button('story-replay-prev', d('replayPrev'), '', 'story-secondary', story.replayIndex === 0 ? 'disabled' : '')}${button('story-replay-next', d('replayNext'), 'arrow', 'story-primary', story.replayIndex === 4 ? 'disabled' : '')}${button('story-replay-close', d('replayClose'), 'close')}</div></div>`;
}

export function renderHQMeeting({ data, story, evaluation, current, language, icon, num, signed, busy, button, readOnly = false }) {
  const { d, c, t, tr } = wording(language);
  const meetings = getStory(language);
  const step = readOnly ? story.replayIndex : story.step;
  const selected = readOnly ? story.choices[step] : story.selected;
  const accepted = story.choices[step] !== undefined && (readOnly || story.choices[step] === selected);
  const choice = current.choices[selected];
  const category = current.choices[0].categoryId;
  const visible = getVisibleDecisions(story);
  const last = visible[visible.length - 1];
  const consequences = last ? getConsequences(data, evaluation, last.initiativeId, language) : null;
  const agenda = `<aside class="hq-agenda"><div class="hq-clock">${icon('clock')}<strong>${esc(current.time)}</strong><span>${d(readOnly ? 'replayTitle' : 'agenda')}</span></div><ol class="hq-agenda-list">${meetings.map((meeting, index) => `<li class="hq-agenda-item ${index === step ? 'is-current' : ''} ${index < visible.length ? 'is-done' : ''}" ${index === step ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><div><time>${esc(index === 0 ? '09:15' : meeting.time)}</time><strong>${esc(meeting.role)}</strong><small>${esc(meeting.name)}</small></div>${index < visible.length ? icon('check') : ''}</li>`).join('')}</ol><p class="hq-agenda-note">${t('hours')}</p></aside>`;
  const replies = readOnly ? `<div class="hq-replay-reply"><span>${d('selectedReply')}</span><p>${highlightDialogue(choice.reply, language)}</p></div>` : `<section class="hq-answers" aria-label="${d('chooseReply')}"><div class="hq-answers-heading"><h2>${d('chooseReply')}</h2>${story.allocations ? `<span>${c('categoryCap')} <b>${num(story.allocations[category])}</b></span>` : ''}</div>${current.choices.map((answer, index) => {
    const measure = data.initiatives.find(item => item.id === answer.initiativeId);
    const available = plannedOptionAvailability(story.choices, step, index, data.initiatives, data.budget, story.allocations);
    const district = data.districts.find(item => item.id === answer.districtId);
    const reason = available.allowed ? '' : available.reason === 'allocation' ? c('allocationLocked') : t(available.reason === 'budget' ? 'locked' : available.reason);
    return `<div class="hq-answer ${selected === index ? 'selected' : ''} ${!available.allowed ? 'unavailable' : ''}"><button class="hq-answer-button" data-action="story-select" data-id="${index}" aria-pressed="${selected === index}" ${reason ? `aria-describedby="hq-answer-reason-${index}"` : ''} ${busy || !available.allowed ? 'disabled' : ''}><span class="hq-answer-number">${index + 1}</span><span class="hq-answer-reply">${highlightDialogue(answer.reply, language)}</span><span class="hq-answer-cost">${num(measure.cost)}<small>${t('units')}</small></span></button>${answer.context ? `<span class="hq-answer-context">${icon('sparkle')}${esc(answer.context)}</span>` : ''}${reason ? `<p class="hq-answer-reason" id="hq-answer-reason-${index}">${reason}${available.reason !== 'allocation' && available.minimumTotal !== null ? ` ${t('futureCost', { cost: available.minimumTotal })}` : ''}</p>` : ''}<details class="hq-answer-detail"><summary>${d('details')}</summary><p><strong>${tr(measure.title)}</strong> · ${district ? tr(district.name) : t('city')}</p><p>${t('launch', { quarters: measure.lag })}. ${t('effectTiming')}</p></details></div>`;
  }).join('')}</section>`;
  const dialogue = `<div class="hq-dialogue"><div class="hq-chapter">${t('meeting', { current: step + 1, total: 5 })} · ${esc(current.districtName)}</div><h1 id="hq-dialogue-title">${esc(current.title)}</h1><div class="hq-dialogue-lines">${current.lines.map((line, index) => `<p class="hq-dialogue-line ${story.dialogueExpanded || readOnly || index < 2 ? 'is-revealed' : ''}" style="--line-index:${index}">${highlightDialogue(line, language)}</p>`).join('')}</div>${!readOnly && !story.dialogueExpanded && current.lines.length > 2 ? `<div class="hq-dialogue-controls">${button('story-dialogue-reveal', d('showAll'), 'chevron', 'story-header-button')}</div>` : ''}${current.cityNote ? `<div class="hq-context-note">${icon('city')}<p>${highlightDialogue(current.cityNote, language)}</p></div>` : ''}${replies}${accepted && choice ? `<div class="hq-resident-reaction" role="status"><span>${d('now')} · ${esc(current.name)}</span><p>${highlightDialogue(choice.acknowledgement, language)}</p></div>` : ''}${readOnly ? '' : `<div class="story-button-row hq-dialogue-actions">${button('story-back', t('back'))}${accepted ? button('story-next', d('cityPulse'), 'arrow', 'story-primary') : button('story-confirm', t(busy ? 'evaluating' : 'accept'), 'check', 'story-primary', choice ? '' : 'disabled')}${story.choices.length > step ? button('story-replan', c('replanFromHere'), 'refresh', 'story-header-button') : ''}</div>`}</div>`;
  return `${readOnly ? renderReplayControls(story, language, button) : ''}<div class="hq-shell">${agenda}<section class="hq-stage hq-category-${esc(category)} hq-pose-${step} ${accepted ? 'is-accepted' : ''}" aria-labelledby="hq-dialogue-title"><figure class="hq-character"><img src="/portraits/character-${current.portrait}.png" alt="${esc(current.name)}" fetchpriority="high"/><figcaption class="hq-character-plaque"><strong>${esc(current.name)}</strong><span>${esc(current.role)}</span></figcaption></figure>${dialogue}</section><aside class="hq-sidebar">${renderBudget(data, evaluation, language, num, icon, readOnly ? null : button)}${renderAccepted({ data, story, language, num })}${renderHQMap({ data, evaluation, story, language, icon, num, signed, affected: consequences?.districtIds || [] })}${renderHQConsequence({ data, evaluation, initiativeId: last?.initiativeId, language, icon, num, signed })}</aside></div>${renderFeed(story, language, icon)}`;
}

export function renderHQFinale({ data, evaluation, story, language, icon, num, signed, button }) {
  const { d, t } = wording(language);
  const summary = getFinalSummary(data, evaluation, story, language);
  return `<div class="hq-finale hq-ending-${esc(summary.style.id)}"><section class="hq-final-hero"><div class="hq-final-address"><div class="hq-chapter">18:40 · ${d('address')}</div><h1>${esc(summary.style.title)}</h1>${summary.address.map(line => `<p>${highlightDialogue(line, language)}</p>`).join('')}</div><div class="hq-final-score"><span>ASTANA QUALITY OF LIFE SCORE</span><strong>${num(evaluation.score)}</strong><p>${num(evaluation.baselineScore)} → ${num(evaluation.score)} <b>${signed(evaluation.delta)}</b></p><small>${d('future')}</small></div></section><div class="hq-final-map">${renderHQMap({ data, evaluation, story, language, icon, num, signed, full: true })}</div><div class="hq-final-grid"><section class="hq-achievements"><h2>${d('achievements')}</h2>${summary.achievements.map(item => `<article class="hq-achievement">${icon('check')}<div><h3>${esc(item.label)}</h3><p>${esc(item.detail)}</p></div></article>`).join('')}</section><section class="hq-problems"><h2>${d('problems')}</h2>${summary.problems.map(item => `<article class="hq-problem">${icon('info')}<div><h3>${esc(item.label)}</h3><p>${esc(item.detail)}</p></div></article>`).join('')}</section></div><section class="hq-playstyle"><div class="hq-chapter">${d('style')}</div><h2>${esc(summary.style.title)}</h2><p>${esc(summary.style.body)}</p><ul>${summary.style.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul></section><div class="story-button-row hq-final-actions">${button('story-replay', d('replay'), 'clock', 'story-primary')}${button('story-analyze', t('analyze'), 'sparkle')}</div></div>`;
}
