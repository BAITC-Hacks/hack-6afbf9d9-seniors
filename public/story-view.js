import { getStory, storyText, storyOptionAvailability } from './story.js';
import { getIntro, getMeeting, getTransition, getClosing, narrativeText } from './narrative.js';
import { classifyEnding } from './story-flow.js';
import { translate } from './i18n.js';

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
  const tr = value => escape(translate(value, language));
  const e = story.sceneEvaluation || story.evaluation || data.baseline;
  const phase = story.phase || (story.step === meetings.length ? 'ending' : 'meeting');
  const ended = phase === 'ending';
  const intro = phase === 'intro';
  const visibleDecisions = Math.min(story.choices.length, story.step + 1);
  const current = getMeeting(Math.min(story.step, meetings.length - 1), story.choices, language, data);
  const introScenes = getIntro(language);
  const introStep = Math.min(Math.max(story.introStep || 0, 0), introScenes.length - 1);
  const scene = intro ? introScenes[introStep] : phase === 'transition' ? getTransition(story.step, story.choices, language, data) : null;
  const disabled = busy ? 'disabled' : '';
  const button = (action, label, symbol = '', className = 'story-secondary', attributes = '') => `<button class="${className}" data-action="${action}" ${disabled} ${attributes}>${symbol ? icon(symbol) : ''}${label}</button>`;
  const heading = `<header class="story-header"><div class="story-brand"><img src="/favicon.svg" alt=""/><div>ASTANA CITY LAB<strong>${t('title')}</strong></div></div><div class="story-header-actions">${button('story-simulator', t('simulator'), 'grid', 'story-header-button')}${button('open-settings', tr('Настройки'), 'settings', 'story-header-button')}${button('game-menu', t('menu'), 'menu', 'story-header-button')}</div></header>`;
  const status = `<div class="story-status"><div class="story-clock">${icon('clock')}<strong>${escape(ended ? '18:40' : scene?.time || current.time)}</strong><span>${ended ? n('ending') : intro ? n('intro') : phase === 'transition' ? n('transition') : t('meeting', { current: story.step + 1, total: 5 })}</span></div><div class="story-budget">${icon('wallet')}<span>${t('remaining')}</span><strong>${intro ? data.budget : e.remaining}<small> / ${data.budget}</small></strong></div></div>`;
  const progress = intro ? `<ol class="cinematic-progress" aria-label="${n('introProgress', { current: introStep + 1, total: introScenes.length })}">${introScenes.map((item, index) => `<li class="${index < introStep ? 'done' : ''} ${index === introStep ? 'current' : ''}" ${index === introStep ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><b>${escape(item.kicker)}</b></li>`).join('')}</ol>` : `<ol class="story-progress" aria-label="${t('progress', { current: visibleDecisions, total: 5 })}">${meetings.map((meeting, index) => `<li class="${visibleDecisions > index ? 'done' : ''} ${story.step === index ? 'current' : ''}" ${story.step === index ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><div><b>${escape(meeting.time)}</b><small>${escape(meeting.role)}</small></div>${visibleDecisions > index ? icon('check') : ''}</li>`).join('')}</ol>`;
  const restart = story.confirmRestart ? `<section class="story-restart" role="group" aria-label="${t('restart')}"><p><strong>${t('confirmRestart')}</strong><br/>${t('restartHint')}</p><div class="story-button-row">${button('story-restart-confirm', t('restart'), 'refresh')}${button('story-restart-cancel', t('cancel'))}</div></section>` : '';
  const footer = `<footer class="story-footnote"><span>${icon('shield')}${t('saved')}</span><span>${t('effectTiming')}</span>${button('story-restart', t('restart'), 'refresh', 'story-header-button')}</footer>`;

  if (intro || phase === 'transition') {
    const controls = intro
      ? `<span class="cinematic-page-number">${n('introProgress', { current: introStep + 1, total: introScenes.length })}</span><div class="story-button-row">${button('intro-back', n('back'), '', 'story-secondary', introStep === 0 ? 'disabled' : '')}${button('intro-next', escape(scene.cta), 'arrow', 'story-primary')}</div>`
      : `<div class="story-button-row">${button('story-back', n('back'))}${button('transition-next', scene.cta ? escape(scene.cta) : n(story.step === 4 ? 'ending' : 'nextMeeting'), 'arrow', 'story-primary')}</div>`;
    return `<main class="story-screen story-phase-${escape(phase)}" data-story-phase="${escape(phase)}" id="main" tabindex="-1">${heading}${status}${progress}${restart}${renderCinematic(scene, { data, evaluation: e, meetings, icon, num, t, n, tr, controls, transition: phase === 'transition' })}${footer}</main>`;
  }

  if (ended) {
    const classification = classifyEnding(e, data.initiatives, language);
    const closing = getClosing(story.choices, language);
    const improved = e.metrics.filter(metric => metric.delta > 0);
    const critical = e.districts.flatMap(district => Object.entries(district.metrics).filter(([, value]) => value < 40).map(([id, value]) => ({ district, id, value })));
    // Unfunded alternatives are concrete trade-offs, not invented penalties.
    const missed = meetings.map((meeting, index) => ({ meeting, choices: meeting.choices.filter((_, choice) => choice !== story.choices[index]) }));
    return `<main class="story-screen story-phase-ending" data-story-phase="ending" id="main" tabindex="-1">${heading}${status}${progress}${restart}<section class="story-ending story-ending-${escape(classification.id)}">
      <div class="story-ending-hero"><div><div class="story-chapter">${t('epilogue')} · 18:40</div><h1>${escape(classification.title)}</h1><p>${escape(classification.body)}</p></div><div class="story-ending-score"><span>ASTANA QUALITY OF LIFE SCORE</span><strong>${num(e.score)}</strong><small>${num(e.baselineScore)} → ${num(e.score)} <b>(${signed(e.delta)})</b></small></div></div>
      <section class="story-freeplay" aria-labelledby="story-freeplay-title"><div><h2 id="story-freeplay-title">${t('freePlayTitle')}</h2><p>${t('freePlayHint')}</p></div><div class="story-button-row">${button('story-open-scenario', t('freePlay'), 'play', 'story-primary')}${button('game-menu', t('menu'), 'menu')}</div></section>
      <section class="story-evening" aria-labelledby="story-evening-title"><div class="story-evening-art" aria-hidden="true"><img src="/city-map.svg" alt=""/><span>18:40</span></div><div><div class="story-chapter">${n('today')}</div><h2 id="story-evening-title">${escape(closing.title)}</h2>${closing.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div></section>
      <section class="story-ending-reasons"><h2>${n('endingReason')}</h2><ul>${classification.reasons.map(reason => `<li>${icon('check')}<span>${escape(reason)}</span></li>`).join('')}</ul><p class="cinematic-forecast">${icon('clock')}${n('forecastNotice')}</p></section>
      <div class="story-ending-grid"><section class="story-ending-card"><h2>${t('improved')}</h2>${improved.length ? improved.map(metric => `<div class="story-stat-row"><span>${tr(metric.name)}</span><b>${num(metric.before)} → ${num(metric.after)} <em>${signed(metric.delta)}</em></b></div>`).join('') : `<p>${t('noImprovements')}</p>`}</section>
      <section class="story-ending-card"><h2>${t('unresolved')}</h2><p>${t('critical')}: <strong>${e.criticalCount}</strong></p>${critical.map(item => `<div class="story-stat-row"><span>${tr(item.district.name)} · ${tr(data.indicators.find(indicator => indicator.id === item.id)?.name || item.id)}</span><b>${num(item.value)} / 100</b></div>`).join('')}<div class="story-stat-row"><span>${t('spent')}</span><b>${e.spent} / ${e.budget}</b></div><div class="story-stat-row"><span>${t('remaining')}</span><b>${e.remaining}</b></div></section>
      <section class="story-ending-card"><h2>${t('outcome')}</h2>${meetings.map((meeting, index) => { const choice = meeting.choices[story.choices[index]]; const measure = data.initiatives.find(item => item.id === choice.initiativeId); return `<div class="story-stat-row"><span>${tr(measure.title)}<small>${tr(choice.districtId ? data.districts.find(item => item.id === choice.districtId).name : 'Весь город')}</small></span><b>${measure.cost}</b></div>`; }).join('')}</section>
      <section class="story-ending-card"><h2>${t('missed')}</h2>${missed.map(({ meeting, choices }) => `<div class="story-stat-row"><span><strong>${escape(meeting.role)}</strong><small>${choices.map(choice => tr(data.initiatives.find(item => item.id === choice.initiativeId).title)).join(' · ')}</small></span></div>`).join('')}</section></div>
      <div class="story-button-row">${button('story-analyze', busy ? t('analyzing') : t('analyze'), 'sparkle', 'story-primary')}${button('story-edit', t('editChoices'), 'refresh')}</div></section>${footer}</main>`;
  }

  const accepted = story.choices[story.step] !== undefined && story.choices[story.step] === story.selected;
  const selectedChoice = current.choices[story.selected];
  const choices = current.choices.map((choice, index) => {
    const measure = data.initiatives.find(item => item.id === choice.initiativeId);
    const available = storyOptionAvailability(story.choices, story.step, index, data.initiatives, data.budget);
    const selected = story.selected === index;
    const effects = Object.entries(measure.effects).map(([code, full]) => `<span title="${tr(data.indicators.find(item => item.id === code)?.name || code)}">${code} ${signed(full * (data.horizon - measure.lag) / data.horizon)}</span>`).join(' ');
    return `<button class="story-choice ${selected ? 'selected' : ''} ${!available.allowed ? 'unavailable' : ''} ${choice.context ? 'story-choice-contextual' : ''}" data-action="story-select" data-id="${index}" aria-pressed="${selected}" ${busy || !available.allowed ? 'disabled' : ''}>
      <span class="story-choice-top"><span class="story-choice-number">${String(index + 1).padStart(2, '0')}</span><span class="story-choice-cost">${icon('wallet')}${measure.cost} / ${data.budget}</span></span>
      ${choice.context ? `<span class="story-context-badge">${icon('sparkle')}${escape(choice.context)}</span>` : ''}<span class="story-choice-reply">${escape(choice.reply)}</span><span class="story-choice-label">${tr(measure.title)} · ${tr(choice.districtId ? data.districts.find(item => item.id === choice.districtId).name : 'Весь город')}</span><span class="story-choice-effect">${effects}</span>
      ${!available.allowed ? `<span class="story-choice-reason">${t(available.reason === 'budget' ? 'locked' : available.reason)}${available.minimumTotal !== null ? ` ${t('futureCost', { cost: available.minimumTotal })}` : ''}</span>` : ''}
    </button>`;
  }).join('');
  return `<main class="story-screen story-phase-meeting" data-story-phase="meeting" id="main" tabindex="-1">${heading}${status}${progress}${restart}
    <div class="story-layout"><figure class="story-character"><div class="story-portrait"><img src="/portraits/character-${current.portrait}.png" alt="${escape(current.name)}" fetchpriority="high"/></div><figcaption><h2 class="story-character-name">${escape(current.name)}</h2><p class="story-character-role">${escape(current.role)}</p><span class="story-location">${icon('pin')}${escape(current.districtName)}</span></figcaption></figure>
    <section class="story-dialogue" aria-labelledby="story-dialogue-title"><div class="story-nameplate">${escape(current.name)}</div><div class="story-chapter">${t('meeting', { current: story.step + 1, total: 5 })} · ${escape(current.time)}</div><h1 class="story-dialogue-title" id="story-dialogue-title">${escape(current.title)}</h1><div class="story-lines">${current.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div>
    ${current.cityNote ? `<div class="story-city-note">${icon('city')}<div><b>${n('decisionContext')}</b><p>${escape(current.cityNote)}</p></div></div>` : ''}
    ${accepted ? `<div class="story-acknowledgement" role="status">${icon('check')}<p>${escape(selectedChoice.acknowledgement)}</p></div>` : ''}
    <div class="story-dialogue-footer">${story.choices.length > story.step + 1 && !accepted ? `<p class="story-change-warning">${t('changeWarning')}</p>` : ''}<div class="story-button-row">${button('story-back', t('back'), '', 'story-secondary', story.step === 0 ? 'disabled' : '')}${accepted ? button('story-next', n('shortTerm'), 'arrow', 'story-primary') : button('story-confirm', t(busy ? 'evaluating' : 'accept'), 'check', 'story-primary', !selectedChoice ? 'disabled' : '')}</div></div></section>
    <aside class="story-choices" aria-label="${n('availableReplies')}"><h2>${n('availableReplies')}</h2>${choices}</aside></div>${footer}</main>`;
}
