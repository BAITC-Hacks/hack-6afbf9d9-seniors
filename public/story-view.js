import { getStory, storyText } from './story.js';
import { getIntro, getMeeting, getTransition, getClosing, narrativeText } from './narrative.js';
import { classifyEnding } from './story-flow.js';
import { campaignText, getBriefing, getDiscovery, enrichMeeting, getCouncil, getCampaignClosing } from './campaign.js';
import { renderCampaignPlan, renderCampaignConversation, renderCampaignChronicle } from './campaign-view.js';
import { dramaText, getCityBeat, getVisibleDecisions } from './drama.js';
import { renderHQMeeting, renderHQImpact, renderCityBeat, renderHQFinale } from './drama-view.js';
import { translate } from './i18n.js';
import { renderDecisionNews, renderCityEvent, renderIntroCountdown, liveText } from './live-city.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const districtPositions = { esil: [50, 73], almaty: [76, 36], saryarka: [23, 28], baikonur: [51, 24], nura: [22, 69] };

function renderCinematic(scene, { data, evaluation, meetings, icon, num, t, n, tr, controls, transition }) {
  const map = () => `<div class="cinematic-map"><img src="/city-map.svg" alt=""/><div class="cinematic-map-grid" aria-hidden="true"></div>${data.districts.map(district => {
    const [x, y] = districtPositions[district.id] || [50, 50];
    const result = evaluation.districts.find(item => item.id === district.id);
    return `<div class="cinematic-district" style="--map-x:${x}%;--map-y:${y}%"><i aria-hidden="true"></i><span>${tr(district.name)}<strong>${num(result?.after ?? result?.before ?? 0)}</strong></span></div>`;
  }).join('')}<span class="cinematic-map-caption">ASTANA · ${transition ? n('future') + ' · ' : ''}${t('modelNotice')}</span></div>`;
  let visual;
  if (scene.visual === 'call') {
    visual = `<div class="cinematic-art cinematic-call"><div class="cinematic-call-halo" aria-hidden="true"></div><div class="cinematic-phone"><div class="cinematic-phone-top"><span>${escape(scene.time || '08:45')}</span><span class="cinematic-signal" aria-hidden="true">▂▄▆</span></div><div class="cinematic-caller"><img src="/portraits/character-${Number.isInteger(scene.portrait) ? scene.portrait : 4}.png" alt=""/></div><strong class="cinematic-caller-name">${escape(scene.speaker || meetings[4].name)}</strong><span class="cinematic-call-label">${escape(scene.kicker)}</span><div class="cinematic-wave" aria-hidden="true">${Array.from({ length: 13 }, (_, index) => `<i style="--wave:${index % 5};--delay:${index * -.14}s"></i>`).join('')}</div><div class="cinematic-call-button" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 3 3 5c0 7 9 16 16 16l2-2-4-5-3 2c-3-2-4-3-6-6l2-3-5-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div></div><span class="cinematic-art-coordinate">51°10′ N &nbsp; 71°26′ E</span></div>`;
  } else if (scene.visual === 'lab') {
    const readings = transition ? evaluation : data.baseline;
    visual = `<div class="cinematic-art cinematic-lab"><div class="cinematic-monitor"><div class="cinematic-monitor-top"><span><i></i> ASTANA CITY LAB</span><span>${n(transition ? 'future' : 'today')}</span></div>${map()}<div class="cinematic-lab-readings"><div><span>SCORE</span><b>${num(readings.score)}</b><small>${transition ? n('future') : t('before')}</small></div><div><span>${t('district')}</span><b>05</b><small>${t('city')}</small></div><div><span>${t('critical')}</span><b>${readings.criticalCount}</b><small>&lt; 40 / 100</small></div></div></div><div class="cinematic-lab-scan" aria-hidden="true"></div></div>`;
  } else if (scene.visual === 'briefing') {
    visual = `<div class="cinematic-art cinematic-briefing"><div class="cinematic-briefing-heading"><span>09:00</span><i aria-hidden="true"></i><span>14:00</span></div><div class="cinematic-briefing-number" aria-hidden="true">5</div><div class="cinematic-briefing-label">${t('hours')}</div><div class="cinematic-briefing-stats"><div>${icon('wallet')}<strong>${data.budget}</strong><span>${t('units')}</span></div><div>${icon('flag')}<strong>5</strong><span>${t('decision')}</span></div></div><div class="cinematic-briefing-people" aria-hidden="true">${meetings.map(meeting => `<img src="/portraits/character-${meeting.portrait}.png" alt=""/>`).join('')}</div></div>`;
  } else {
    visual = `<div class="cinematic-art cinematic-city">${map()}<div class="cinematic-city-tag"><span>${n(transition ? 'future' : 'intro')}</span><b>${escape(scene.time || '08:45')}</b></div></div>`;
  }
  return `<section class="cinematic-scene cinematic-scene-${escape(scene.visual || 'map')}" aria-labelledby="cinematic-title">${visual}<div class="cinematic-narration"><div class="story-chapter">${escape(scene.kicker)}</div>${scene.speaker ? `<div class="cinematic-speaker">${escape(scene.speaker)}</div>` : ''}<h1 id="cinematic-title">${escape(scene.title)}</h1><div class="cinematic-lines">${scene.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div>${scene.cityNote ? `<div class="story-city-note">${icon('city')}<div><b>${n('decisionContext')}</b><p>${escape(scene.cityNote)}</p></div></div>` : ''}${transition ? `<p class="cinematic-forecast">${icon('clock')}${n('forecastNotice')}</p>` : ''}<div class="cinematic-controls">${controls}</div></div></section>`;
}

/** Story presentation consumes the same server evaluation as the simulator. */
export function renderStory({ data, story, language, busy, icon, num, signed }) {
  const meetings = getStory(language);
  const t = (key, vars) => escape(storyText(key, language, vars));
  const n = (key, vars) => escape(narrativeText(key, language, vars));
  const c = (key, vars) => escape(campaignText(key, language, vars));
  const d = (key, vars) => escape(dramaText(key, language, vars));
  const tr = value => escape(translate(value, language));
  const readOnly = Number.isInteger(story.replayIndex) && story.replayIndex >= 0 && story.replayIndex < meetings.length;
  const e = readOnly ? story.replayEvaluation || data.baseline : story.sceneEvaluation || story.evaluation || data.baseline;
  const phase = story.phase || (story.step === meetings.length ? 'ending' : 'meeting');
  const ended = phase === 'ending';
  const intro = phase === 'intro';
  const visibleDecisions = getVisibleDecisions(story).length;
  const renderStep = readOnly ? story.replayIndex : Math.min(story.step, meetings.length - 1);
  const narrativeStory = readOnly ? { ...story, step: renderStep, choices: story.choices.slice(0, renderStep + 1), inquiries: (story.inquiries || []).map((value, index) => index <= renderStep ? value : null), council: renderStep >= 3 ? story.council : null } : story;
  const current = enrichMeeting(getMeeting(renderStep, narrativeStory.choices, language, data), narrativeStory, language);
  const introScenes = getIntro(language);
  const introStep = Math.min(Math.max(story.introStep || 0, 0), introScenes.length - 1);
  const scene = intro ? introScenes[introStep] : phase === 'transition' ? getTransition(story.step, story.choices, language, data) : phase === 'discovery' ? getDiscovery(story.step, story, language) : null;
  const council = phase === 'council';
  const briefing = phase === 'briefing';
  const conversation = council ? getCouncil(story, language) : briefing ? getBriefing(story.step, story, language) : null;
  const sceneTime = ended ? '18:40' : conversation?.time || (briefing ? ['08:58', '09:55', '10:55', '11:55', '12:55'][story.step] : phase === 'planning' && !story.planReturn ? '08:56' : scene?.time || current.time);
  const phaseLabel = ended ? n('ending') : intro ? n('intro') : ['planning', 'briefing', 'discovery', 'council'].includes(phase) ? c(phase) : phase === 'transition' ? n('transition') : t('meeting', { current: story.step + 1, total: 5 });
  const disabled = busy ? 'disabled' : '';
  const button = (action, label, symbol = '', className = 'story-secondary', attributes = '') => `<button class="${className}" data-action="${action}" ${disabled} ${attributes}>${symbol ? icon(symbol) : ''}${label}</button>`;
  const heading = `<header class="story-header"><div class="story-brand"><img src="/favicon.svg" alt=""/><div>ASTANA CITY LAB<strong>${t('title')}</strong></div></div><div class="story-header-actions">${button('story-simulator', t('simulator'), 'grid', 'story-header-button')}${button('about-simulator', escape(liveText('about', language)), 'info', 'story-header-button')}${button('open-settings', tr('Настройки'), 'settings', 'story-header-button')}${button('game-menu', t('menu'), 'menu', 'story-header-button')}</div></header>${intro ? renderIntroCountdown(story, language) : ''}${!['intro', 'planning'].includes(phase) ? renderCityEvent({data, story, language, num, signed, busy}) : ''}`;
  const status = `<div class="story-status"><div class="story-clock">${icon('clock')}<strong>${escape(sceneTime)}</strong><span>${phaseLabel}</span></div><div class="story-status-actions">${['meeting', 'discovery'].includes(phase) ? button('story-plan-open', c('planningEdit'), 'wallet', 'story-header-button') : ''}<div class="story-budget">${icon('wallet')}<span>${t('remaining')}</span><strong>${intro ? data.budget : e.remaining}<small> / ${data.budget}</small></strong></div></div></div>`;
  const progress = intro ? `<ol class="cinematic-progress" aria-label="${n('introProgress', { current: introStep + 1, total: introScenes.length })}">${introScenes.map((item, index) => `<li class="${index < introStep ? 'done' : ''} ${index === introStep ? 'current' : ''}" ${index === introStep ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><b>${escape(item.kicker)}</b></li>`).join('')}</ol>` : `<ol class="story-progress" aria-label="${t('progress', { current: visibleDecisions, total: 5 })}">${meetings.map((meeting, index) => `<li class="${visibleDecisions > index ? 'done' : ''} ${story.step === index ? 'current' : ''}" ${story.step === index ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><div><b>${escape(meeting.time)}</b><small>${escape(meeting.role)}</small></div>${visibleDecisions > index ? icon('check') : ''}</li>`).join('')}</ol>`;
  const restart = story.confirmRestart ? `<section class="story-restart" role="group" aria-label="${t('restart')}"><p><strong>${t('confirmRestart')}</strong><br/>${t('restartHint')}</p><div class="story-button-row">${button('story-restart-confirm', t('restart'), 'refresh')}${button('story-restart-cancel', t('cancel'))}</div></section>` : '';
  const footer = `<footer class="story-footnote"><span>${icon('shield')}${t('saved')}</span><span>${t('effectTiming')}</span>${button('story-restart', t('restart'), 'refresh', 'story-header-button')}</footer>`;
  const replan = phase === 'meeting' && story.choices.length > story.step && story.confirmReplan ? `<section class="story-restart story-replan-warning" role="group" aria-label="${c('replanFromHere')}"><p><strong>${c('replanFromHere')}</strong><br/>${c('replanWarning')}</p><div class="story-button-row">${button('story-replan-confirm', c('replanConfirm'), 'refresh', 'story-primary')}${button('story-replan-cancel', t('cancel'))}</div></section>` : '';

  if (phase === 'meeting' || readOnly) return `<main class="story-screen hq-screen ${readOnly ? 'hq-readonly-replay' : 'story-phase-meeting'}" data-story-phase="${readOnly ? 'replay' : 'meeting'}" data-i18n-skip id="main" tabindex="-1">${heading}${readOnly ? '' : restart + replan}${renderHQMeeting({ data, story, evaluation: e, current, language, icon, num, signed, busy, button, readOnly })}${readOnly ? `<footer class="story-footnote"><span>${d('replayNotice')}</span></footer>` : footer}</main>`;

  if (phase === 'planning') return `<main class="story-screen story-phase-planning" data-story-phase="planning" data-i18n-skip id="main" tabindex="-1">${heading}${status}${progress}${restart}${renderCampaignPlan({ data, story, language, busy, icon, num, button })}${footer}</main>`;

  if (briefing || council) {
    return `<main class="story-screen story-phase-${phase}" data-story-phase="${phase}" data-i18n-skip id="main" tabindex="-1">${heading}${status}${progress}${restart}${briefing ? renderCityBeat(getCityBeat(story.step, story, language), { language, icon, step: story.step }) : ''}${renderCampaignConversation({ scene: conversation, story, language, icon, busy, council, button })}${footer}</main>`;
  }

  if (intro || phase === 'transition' || phase === 'discovery') {
    const controls = intro
      ? `<span class="cinematic-page-number">${n('introProgress', { current: introStep + 1, total: introScenes.length })}</span><div class="story-button-row">${button('intro-back', n('back'), '', 'story-secondary', introStep === 0 ? 'disabled' : '')}${button('intro-next', escape(scene.cta), 'arrow', 'story-primary')}</div>`
      : `<div class="story-button-row">${button('story-back', n('back'))}${button(phase === 'discovery' ? 'discovery-next' : 'transition-next', scene.cta ? escape(scene.cta) : n(story.step === 4 ? 'ending' : 'nextMeeting'), 'arrow', 'story-primary')}</div>`;
    return `<main class="story-screen story-phase-${escape(phase)}" data-story-phase="${escape(phase)}" data-i18n-skip id="main" tabindex="-1">${heading}${status}${progress}${restart}${phase === 'transition' ? renderDecisionNews({data, evaluation:e, story, language}) : ''}${renderCinematic(scene, { data, evaluation: e, meetings, icon, num, t, n, tr, controls, transition: phase === 'transition' || phase === 'discovery' })}${intro ? '' : renderHQImpact({ data, evaluation: e, story, language, icon, num, signed })}${footer}</main>`;
  }

  if (ended) {
    const classification = classifyEnding(e, data.initiatives, language);
    const closing = getClosing(story.choices, language);
    const improved = e.metrics.filter(metric => metric.delta > 0);
    const critical = e.districts.flatMap(district => Object.entries(district.metrics).filter(([, value]) => value < 40).map(([id, value]) => ({ district, id, value })));
    // Unfunded alternatives are concrete trade-offs, not invented penalties.
    const missed = meetings.map((meeting, index) => ({ meeting, choices: meeting.choices.filter((_, choice) => choice !== story.choices[index]) }));
    return `<main class="story-screen story-phase-ending" data-story-phase="ending" data-i18n-skip id="main" tabindex="-1">${heading}${status}${progress}${restart}<section class="story-ending story-ending-${escape(classification.id)}">
      ${renderHQFinale({ data, evaluation: e, story, language, icon, num, signed, button })}
      <section class="story-freeplay" aria-labelledby="story-freeplay-title"><div><h2 id="story-freeplay-title">${t('freePlayTitle')}</h2><p>${t('freePlayHint')}</p></div><div class="story-button-row">${button('story-open-scenario', t('freePlay'), 'play', 'story-primary')}${button('game-menu', t('menu'), 'menu')}</div></section>
      <details class="hq-final-stats"><summary class="hq-details-title">${d('finalDetails')}</summary><section class="story-evening" aria-labelledby="story-evening-title"><div class="story-evening-art" aria-hidden="true"><img src="/city-map.svg" alt=""/><span>18:40</span></div><div><div class="story-chapter">${n('today')}</div><h2 id="story-evening-title">${escape(closing.title)}</h2>${closing.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div></section>
      ${renderCampaignChronicle(getCampaignClosing(story, language), language, icon)}
      <section class="story-ending-reasons"><h2>${n('endingReason')}</h2><ul>${classification.reasons.map(reason => `<li>${icon('check')}<span>${escape(reason)}</span></li>`).join('')}</ul><p class="cinematic-forecast">${icon('clock')}${n('forecastNotice')}</p></section>
      <div class="story-ending-grid"><section class="story-ending-card"><h2>${t('improved')}</h2>${improved.length ? improved.map(metric => `<div class="story-stat-row"><span>${tr(metric.name)}</span><b>${num(metric.before)} → ${num(metric.after)} <em>${signed(metric.delta)}</em></b></div>`).join('') : `<p>${t('noImprovements')}</p>`}</section>
      <section class="story-ending-card"><h2>${t('unresolved')}</h2><p>${t('critical')}: <strong>${e.criticalCount}</strong></p>${critical.map(item => `<div class="story-stat-row"><span>${tr(item.district.name)} · ${tr(data.indicators.find(indicator => indicator.id === item.id)?.name || item.id)}</span><b>${num(item.value)} / 100</b></div>`).join('')}<div class="story-stat-row"><span>${t('spent')}</span><b>${e.spent} / ${e.budget}</b></div><div class="story-stat-row"><span>${t('remaining')}</span><b>${e.remaining}</b></div></section>
      <section class="story-ending-card"><h2>${t('outcome')}</h2>${meetings.map((meeting, index) => { const choice = meeting.choices[story.choices[index]]; const measure = data.initiatives.find(item => item.id === choice.initiativeId); return `<div class="story-stat-row"><span>${tr(measure.title)}<small>${tr(choice.districtId ? data.districts.find(item => item.id === choice.districtId).name : 'Весь город')}</small></span><b>${measure.cost}</b></div>`; }).join('')}</section>
      <section class="story-ending-card"><h2>${t('missed')}</h2>${missed.map(({ meeting, choices }) => `<div class="story-stat-row"><span><strong>${escape(meeting.role)}</strong><small>${choices.map(choice => tr(data.initiatives.find(item => item.id === choice.initiativeId).title)).join(' · ')}</small></span></div>`).join('')}</section></div>
      <div class="story-button-row">${button('story-analyze', busy ? t('analyzing') : t('analyze'), 'sparkle', 'story-primary')}${button('story-edit', t('editChoices'), 'refresh')}</div></details></section>${footer}</main>`;
  }

  throw new Error('Unknown story phase');
}
