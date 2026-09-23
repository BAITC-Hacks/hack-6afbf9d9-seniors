import assert from 'node:assert/strict';
import { createIntroClock, drawCityEvent, eventPreviewKey, renderCityEvent, renderTransparency, liveText } from '../public/live-city.js';
import { STORY_EVENT_IDS } from '../public/story-flow.js';

let now = 0, nextId = 0;
const jobs = new Map();
const ticks = [];
const clock = createIntroClock((value, owner) => ticks.push([value, owner]), {
  now:()=>now, setTimeout(fn, delay){const id=++nextId;jobs.set(id,{fn,at:now+delay});return id;}, clearTimeout:id=>jobs.delete(id),
});
function advance(ms) {
  const end = now + ms;
  while (jobs.size) { const [id, job] = [...jobs].sort((a,b)=>a[1].at-b[1].at)[0]; if(job.at>end)break; now=job.at;jobs.delete(id);job.fn(); }
  now=end;
}
const first={};
assert.equal(clock.sync(true,first),90);
advance(30000);
assert.equal(ticks.at(-1)[0],60);
clock.sync(false,first);
advance(50000);
assert.equal(clock.sync(true,first),60,'Hidden/off-screen time does not consume the introduction.');
advance(60000);
assert.equal(ticks.at(-1)[0],0);
assert.equal(jobs.size,0,'Finished timer has no background jobs.');
assert.equal(clock.sync(true,{}),90,'A new story gets a new introductory timer.');
clock.stop();
assert.equal(jobs.size,0);
assert.equal(drawCityEvent(STORY_EVENT_IDS,()=>0),STORY_EVENT_IDS[0]);
assert.equal(drawCityEvent(STORY_EVENT_IDS,()=>.999),STORY_EVENT_IDS.at(-1));
assert.equal(drawCityEvent(STORY_EVENT_IDS,()=>NaN),STORY_EVENT_IDS[0]);
const story={phase:'meeting',step:1,choices:[0,1],eventId:'harsh-winter'};
const key=eventPreviewKey(story,'ru');
assert.notEqual(eventPreviewKey({...story,step:0},'ru'),key);
assert.notEqual(eventPreviewKey(story,'en'),key);
assert.equal(renderCityEvent({story:{...story,step:0},language:'ru'}),'','No future event in earlier scene.');
assert.equal(renderCityEvent({story:{...story,eventId:'<script>'},language:'ru'}),'');
for(const language of ['ru','kk','en']) {
  const panel=renderCityEvent({data:{},story,language,num:String,signed:String});
  assert.ok(panel.includes('city-event-calculate'));
  assert.ok(!panel.includes('undefined'));
  const about=renderTransparency({data:{ai:{enabled:false}},language,icon:()=>''});
  assert.ok(about.includes(liveText('aiOff',language)));
  assert.ok(about.includes(liveText('serverBody',language)));
  assert.ok(renderTransparency({data:{ai:{enabled:true}},language,icon:()=>''}).includes(liveText('aiOn',language)));
}
console.log('PASS: introduction timer lifecycle, stable event selection, causal event visibility and AI transparency in three languages.');
