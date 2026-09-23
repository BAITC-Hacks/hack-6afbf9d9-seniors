import { getStory, storyText, storyOptionAvailability } from './story.js';
import { translate } from './i18n.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Story presentation consumes the same server evaluation as the simulator. */
export function renderStory({ data, story, language, busy, icon, num, signed }) {
  const meetings = getStory(language);
  const t = (key, vars) => escape(storyText(key, language, vars));
  const tr = value => escape(translate(value, language));
  const e = story.evaluation || data.baseline;
  const ended = story.step === meetings.length;
  const current = meetings[Math.min(story.step, meetings.length - 1)];
  const disabled = busy ? 'disabled' : '';
  const button = (action, label, symbol = '', className = 'story-secondary', attributes = '') => `<button class="${className}" data-action="${action}" ${disabled} ${attributes}>${symbol ? icon(symbol) : ''}${label}</button>`;
  const heading = `<header class="story-header"><div class="story-brand"><img src="/favicon.svg" alt=""/><div>ASTANA CITY LAB<strong>${t('title')}</strong></div></div><div class="story-header-actions">${button('story-simulator', t('simulator'), 'grid', 'story-header-button')}${button('open-settings', tr('Настройки'), 'settings', 'story-header-button')}${button('game-menu', t('menu'), 'menu', 'story-header-button')}</div></header>`;
  const status = `<div class="story-status"><div class="story-clock">${icon('clock')}<strong>${ended ? '14:00' : current.time}</strong><span>${ended ? t('complete') : t('meeting', { current: story.step + 1, total: 5 })}</span></div><div class="story-budget">${icon('wallet')}<span>${t('remaining')}</span><strong>${e.remaining}<small> / ${data.budget}</small></strong></div></div>`;
  const progress = `<ol class="story-progress" aria-label="${t('progress', { current: story.choices.length, total: 5 })}">${meetings.map((meeting, index) => `<li class="${story.choices.length > index ? 'done' : ''} ${story.step === index ? 'current' : ''}" ${story.step === index ? 'aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><div><b>${escape(meeting.time)}</b><small>${escape(meeting.role)}</small></div>${story.choices.length > index ? icon('check') : ''}</li>`).join('')}</ol>`;
  const restart = story.confirmRestart ? `<section class="story-restart" role="group" aria-label="${t('restart')}"><p><strong>${t('confirmRestart')}</strong><br/>${t('restartHint')}</p><div class="story-button-row">${button('story-restart-confirm', t('restart'), 'refresh')}${button('story-restart-cancel', t('cancel'))}</div></section>` : '';
  const footer = `<footer class="story-footnote"><span>${icon('shield')}${t('saved')}</span><span>${t('effectTiming')}</span>${button('story-restart', t('restart'), 'refresh', 'story-header-button')}</footer>`;

  if (ended) {
    const improved = e.metrics.filter(metric => metric.delta > 0);
    const critical = e.districts.flatMap(district => Object.entries(district.metrics).filter(([, value]) => value < 40).map(([id, value]) => ({ district, id, value })));
    // Unfunded alternatives are concrete trade-offs, not invented penalties.
    const missed = meetings.map((meeting, index) => ({ meeting, choices: meeting.choices.filter((_, choice) => choice !== story.choices[index]) }));
    return `<main class="story-screen" id="main" tabindex="-1">${heading}${status}${progress}${restart}<section class="story-ending">
      <div class="story-ending-hero"><div><div class="story-chapter">${t('epilogue')} · 14:00</div><h1>${t('endingTitle')}</h1><p>${t('endingBody')}</p></div><div class="story-ending-score"><span>ASTANA QUALITY OF LIFE SCORE</span><strong>${num(e.score)}</strong><small>${num(e.baselineScore)} → ${num(e.score)} <b>(${signed(e.delta)})</b></small></div></div>
      <div class="story-ending-grid"><section class="story-ending-card"><h2>${t('improved')}</h2>${improved.length ? improved.map(metric => `<div class="story-stat-row"><span>${tr(metric.name)}</span><b>${num(metric.before)} → ${num(metric.after)} <em>${signed(metric.delta)}</em></b></div>`).join('') : `<p>${t('noImprovements')}</p>`}</section>
      <section class="story-ending-card"><h2>${t('unresolved')}</h2><p>${t('critical')}: <strong>${e.criticalCount}</strong></p>${critical.map(item => `<div class="story-stat-row"><span>${tr(item.district.name)} · ${tr(data.indicators.find(indicator => indicator.id === item.id)?.name || item.id)}</span><b>${num(item.value)} / 100</b></div>`).join('')}<div class="story-stat-row"><span>${t('spent')}</span><b>${e.spent} / ${e.budget}</b></div><div class="story-stat-row"><span>${t('remaining')}</span><b>${e.remaining}</b></div></section>
      <section class="story-ending-card"><h2>${t('outcome')}</h2>${meetings.map((meeting, index) => { const choice = meeting.choices[story.choices[index]]; const measure = data.initiatives.find(item => item.id === choice.initiativeId); return `<div class="story-stat-row"><span>${tr(measure.title)}<small>${tr(choice.districtId ? data.districts.find(item => item.id === choice.districtId).name : 'Весь город')}</small></span><b>${measure.cost}</b></div>`; }).join('')}</section>
      <section class="story-ending-card"><h2>${t('missed')}</h2>${missed.map(({ meeting, choices }) => `<div class="story-stat-row"><span><strong>${escape(meeting.role)}</strong><small>${choices.map(choice => tr(data.initiatives.find(item => item.id === choice.initiativeId).title)).join(' · ')}</small></span></div>`).join('')}</section></div>
      <div class="story-button-row">${button('story-analyze', busy ? t('analyzing') : t('analyze'), 'sparkle', 'story-primary')}${button('story-edit', t('editChoices'), 'refresh')}${button('story-open-scenario', t('viewReport'), 'chart')}</div></section>${footer}</main>`;
  }

  const accepted = story.choices[story.step] !== undefined && story.choices[story.step] === story.selected;
  const selectedChoice = current.choices[story.selected];
  const choices = current.choices.map((choice, index) => {
    const measure = data.initiatives.find(item => item.id === choice.initiativeId);
    const available = storyOptionAvailability(story.choices, story.step, index, data.initiatives, data.budget);
    const selected = story.selected === index;
    const effects = Object.entries(measure.effects).map(([code, full]) => `<span title="${tr(data.indicators.find(item => item.id === code)?.name || code)}">${code} ${signed(full * (data.horizon - measure.lag) / data.horizon)}</span>`).join(' ');
    return `<button class="story-choice ${selected ? 'selected' : ''} ${!available.allowed ? 'unavailable' : ''}" data-action="story-select" data-id="${index}" aria-pressed="${selected}" ${busy || !available.allowed ? 'disabled' : ''}>
      <span class="story-choice-top"><span class="story-choice-number">${String(index + 1).padStart(2, '0')}</span><span class="story-choice-cost">${icon('wallet')}${measure.cost} / ${data.budget}</span></span>
      <span class="story-choice-reply">${escape(choice.reply)}</span><span class="story-choice-label">${tr(measure.title)} · ${tr(choice.districtId ? data.districts.find(item => item.id === choice.districtId).name : 'Весь город')}</span><span class="story-choice-effect">${effects}</span>
      ${!available.allowed ? `<span class="story-choice-reason">${t(available.reason === 'budget' ? 'locked' : available.reason)}${available.minimumTotal !== null ? ` ${t('futureCost', { cost: available.minimumTotal })}` : ''}</span>` : ''}
    </button>`;
  }).join('');
  return `<main class="story-screen" id="main" tabindex="-1">${heading}${status}${progress}${restart}
    <div class="story-layout"><figure class="story-character"><div class="story-portrait"><img src="/portraits/character-${current.portrait}.png" alt="${escape(current.name)}" fetchpriority="high"/></div><figcaption><h2 class="story-character-name">${escape(current.name)}</h2><p class="story-character-role">${escape(current.role)}</p><span class="story-location">${icon('pin')}${escape(current.districtName)}</span></figcaption></figure>
    <section class="story-dialogue" aria-labelledby="story-dialogue-title"><div class="story-nameplate">${escape(current.name)}</div><div class="story-chapter">${t('meeting', { current: story.step + 1, total: 5 })} · ${escape(current.time)}</div><h1 class="story-dialogue-title" id="story-dialogue-title">${escape(current.title)}</h1><div class="story-lines">${story.step === 0 && !story.choices.length ? `<p class="story-opening">${t('opening')}</p>` : ''}${current.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div>
    ${accepted ? `<div class="story-acknowledgement" role="status">${icon('check')}<p>${escape(selectedChoice.acknowledgement)}</p></div>` : ''}
    <div class="story-dialogue-footer">${story.choices.length > story.step + 1 && !accepted ? `<p class="story-change-warning">${t('changeWarning')}</p>` : ''}<div class="story-button-row">${button('story-back', t('back'), '', 'story-secondary', story.step === 0 ? 'disabled' : '')}${accepted ? button('story-next', t(story.step === 4 ? 'finish' : 'next'), 'arrow', 'story-primary') : button('story-confirm', t(busy ? 'evaluating' : 'accept'), 'check', 'story-primary', !selectedChoice ? 'disabled' : '')}</div></div></section>
    <aside class="story-choices" aria-label="${t('choicesTitle')}"><h2>${t('choicesTitle')}</h2>${choices}</aside></div>${footer}</main>`;
}
