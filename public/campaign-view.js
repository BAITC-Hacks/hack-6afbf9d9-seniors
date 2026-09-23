import { campaignText } from './campaign.js';
import { STORY_CATEGORIES, defaultAllocations, allocationSummary } from './story-budget.js';
import { storyText } from './story.js';
import { translate } from './i18n.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Budget reservations only. Prices and committed spending come from the catalog. */
export function renderCampaignPlan({ data, story, language, busy, icon, num, button }) {
  const c = (key, vars) => esc(campaignText(key, language, vars));
  const t = key => esc(storyText(key, language));
  const tr = value => esc(translate(value, language));
  const allocations = story.budgetDraft || story.allocations || defaultAllocations(data.initiatives, data.budget, story.choices);
  const summary = allocationSummary(allocations, story.choices, data.initiatives, data.budget);
  const spent = Object.values(summary.spentByCategory).reduce((sum, value) => sum + value, 0);
  return `<section class="story-plan" aria-labelledby="story-plan-title" data-i18n-skip>
    <div class="story-plan-heading"><div><div class="story-chapter">${c('currentPlan')}</div><h1 id="story-plan-title">${c('planningTitle')}</h1><p>${c('planningIntro')}</p></div><span class="story-plan-budget-seal">${icon('wallet')}<strong>${num(data.budget)}</strong><small>${t('units')}</small></span></div>
    <div class="story-plan-totals"><div><span>${c('allocated')}</span><strong><span id="story-plan-allocated" data-story-allocated>${num(summary.allocated)}</span><small> / ${num(data.budget)}</small></strong></div><div class="story-plan-reserve ${summary.reserve < 0 ? 'story-plan-invalid' : ''}"><span>${c('reserve')}</span><strong id="story-plan-reserve" data-story-reserve>${num(summary.reserve)}</strong></div><div><span>${c('committed')}</span><strong>${num(spent)}</strong></div></div>
    <div class="story-plan-distribution" aria-hidden="true">${STORY_CATEGORIES.map(category => `<span class="story-plan-segment story-plan-color-${category}" style="width:${Math.max(0, Math.min(100, Number(allocations[category]) / data.budget * 100))}%"></span>`).join('')}</div>
    <p class="story-plan-hint">${icon('info')}<span>${c('budgetHint')}</span></p>
    <div class="story-plan-grid">${STORY_CATEGORIES.map(categoryId => {
      const category = data.categories.find(item => item.id === categoryId);
      const projects = data.initiatives.filter(item => item.categoryId === categoryId);
      const value = allocations[categoryId];
      const minimum = summary.minimumByCategory[categoryId];
      const committed = summary.spentByCategory[categoryId];
      return `<section class="story-plan-card story-plan-color-${categoryId}"><div class="story-plan-card-heading"><label for="story-budget-${categoryId}">${icon(categoryId)}<span>${tr(category.name)}</span></label><output id="story-budget-output-${categoryId}" for="story-budget-${categoryId}" data-story-cap-output="${categoryId}"><span id="story-budget-value-${categoryId}">${num(value)}</span><small>${t('units')}</small></output></div>
        <input id="story-budget-${categoryId}" name="story-budget-${categoryId}" type="range" min="${minimum}" max="${data.budget}" step="1" value="${value}" data-story-budget="${categoryId}" aria-describedby="story-budget-details-${categoryId} story-budget-projects-${categoryId}" aria-valuetext="${num(value)} ${t('units')}" ${busy ? 'disabled' : ''}/>
        <div class="story-plan-card-meta" id="story-budget-details-${categoryId}"><span>${c('minimum')} <b>${num(minimum)}</b></span><span>${c('committed')} <b>${num(committed)}</b></span><span>${c('remaining')} <b id="story-budget-remaining-${categoryId}">${num(value - committed)}</b></span></div>
        <div class="story-plan-projects" id="story-budget-projects-${categoryId}"><h2>${c('projectCosts')}</h2>${projects.map(project => `<div class="${project.cost <= value ? 'story-plan-project-fits' : ''}"><span>${tr(project.title)}</span><b>${num(project.cost)}</b></div>`).join('')}</div></section>`;
    }).join('')}</div>
    ${!summary.valid ? `<p class="story-plan-error" role="alert">${icon('info')}${c('planInvalid')}</p>` : ''}
    <div class="story-plan-actions"><div class="story-button-row">${button('story-plan-apply', c('planningApply'), 'check', 'story-primary', summary.valid ? '' : 'disabled')}${story.planReturn ? button('story-plan-cancel', c('planningCancel')) : ''}</div>${button('story-plan-reset', c('planningReset'), 'refresh', 'story-header-button')}</div>
  </section>`;
}

/** Inquiry choices describe how to listen; they never mutate city indicators. */
export function renderCampaignConversation({ scene, story, language, icon, busy, council = false, button }) {
  const c = key => esc(campaignText(key, language));
  const back = esc(storyText('back', language));
  const selection = council ? story.council : story.inquiries?.[story.step];
  return `<section class="story-briefing-frame ${council ? 'story-council-frame' : ''}" aria-labelledby="story-briefing-title" data-i18n-skip>
    <figure class="story-briefing-portrait"><img src="/portraits/character-${scene.portrait}.png" alt="${esc(scene.speaker)}"/><figcaption><span>${c(council ? 'council' : 'briefing')}</span><strong>${esc(scene.speaker)}</strong></figcaption></figure>
    <div class="story-briefing-body"><div class="story-chapter">${esc(scene.kicker)}</div><h1 id="story-briefing-title">${esc(scene.title)}</h1><div class="story-lines">${scene.lines.map(line => `<p>${esc(line)}</p>`).join('')}</div><div class="story-inquiry-heading">${icon('compass')}<h2>${c(council ? 'approach' : 'inquiryChoose')}</h2></div>
    <div class="story-inquiry-options">${scene.options.map((option, index) => {
      const action = council ? index === 0 ? 'story-council-hold' : 'story-council-review' : 'story-inquiry';
      const selected = council ? selection === (index === 0 ? 'hold' : 'review') : selection === index;
      return `<button class="story-inquiry-option ${selected ? 'selected' : ''}" data-action="${action}" ${council ? '' : `data-id="${index}"`} aria-pressed="${selected}" ${busy ? 'disabled' : ''}><span class="story-inquiry-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${esc(option.title)}</strong><small>${esc(option.description)}</small><em>${c(council ? index === 0 ? 'councilKeep' : 'councilReview' : 'inquiryContinue')}${icon('arrow')}</em></span></button>`;
    }).join('')}</div><div class="story-button-row story-briefing-tools">${story.step > 0 ? button('story-back', back) : ''}${button('story-plan-open', c('planningEdit'), 'wallet')}</div></div>
  </section>`;
}

export function renderCampaignChronicle(closing, language, icon) {
  if (!closing.lines.length) return '';
  return `<section class="story-campaign-chronicle" aria-labelledby="story-chronicle-title" data-i18n-skip><div class="story-chapter">${esc(campaignText('chronicle', language))}</div><h2 id="story-chronicle-title">${esc(closing.title)}</h2><ol>${closing.lines.map((line, index) => `<li><span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><p>${esc(line)}</p></li>`).join('')}</ol><span class="story-chronicle-mark" aria-hidden="true">${icon('book')}</span></section>`;
}
