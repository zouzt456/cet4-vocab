const fs = require('fs');
const vm = require('vm');
const path = process.argv[2];
const html = fs.readFileSync(path, 'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];

function El(id) {
  const o = {
    id, textContent: '', className: '', value: '', children: [], disabled: false,
    style: {}, _attrs: {}, _listeners: {}, _html: '',
    getAttribute(k) { return this._attrs[k] || null; },
    setAttribute(k, v) { this._attrs[k] = v; },
    appendChild(c) { this.children.push(c); },
    addEventListener(t, f) { this._listeners[t] = f; },
    querySelectorAll() { return []; },
    closest() { return null; },
    classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    parentNode: null
  };
  Object.defineProperty(o, 'innerHTML', {
    get() { return o._html; },
    set(v) { o._html = v; o.children.length = 0; }
  });
  return o;
}
const els = {};
const getEl = id => (els[id] = els[id] || El(id));
const tabs = ['card', 'list', 'stars'].map((v, i) => { const e = El('tab' + i); e.setAttribute('data-v', v); return e; });
const doc = {
  getElementById: getEl,
  createElement: t => El('new:' + t),
  addEventListener(t, f) { (doc._l = doc._l || {})[t] = f; },
  querySelectorAll(sel) { return sel === 'nav button' ? tabs : []; },
  body: El('body'),
  activeElement: null
};
const store = {};
const ctx = {
  document: doc,
  window: { speechSynthesis: { cancel(){}, speak(){} }, innerWidth: 390 },
  SpeechSynthesisUtterance: function(t){ this.text = t; },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
  console, setTimeout
};
ctx.window.document = doc;
vm.runInNewContext(code, ctx, { filename: 'page.js' });

const fails = [], pass = [];
const ok = (c, msg) => (c ? pass : fails).push(msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const cards = getEl('cards');
const under = getEl('swipeUnder');
getEl('v-card').className = 'on';
const word = () => getEl('cword').textContent;
const start = (x, y, target) => cards._listeners.touchstart({ touches: [{ clientX: x, clientY: y }], target: target || getEl('card') });
const move  = (x, y) => cards._listeners.touchmove({ touches: [{ clientX: x, clientY: y }] });
const end   = (x, y, target) => cards._listeners.touchend({ changedTouches: [{ clientX: x, clientY: y }], target: target || getEl('card') });

(async function run(){
  ok(!!cards._listeners.touchstart && !!cards._listeners.touchmove && !!cards._listeners.touchend, '卡片区挂上了 touchstart/move/end');
  ok(!cards._listeners.click, '点卡片不再绑 click（点卡片不切词）');
  ok(!!under, '滑动覆盖层 #swipeUnder 存在');
  ok(getEl('side').className.indexOf('hide') >= 0, '左右滑动模式：上一张/下一张按钮被隐藏');
  ok(getEl('chint').textContent.indexOf('左右滑动') >= 0, '滑动模式提示提到左右滑动');
  const w0 = word(), w1 = ctx.DATA[1][0];
  const W = 390;                              /* vw() 兜底值：window.innerWidth */
  start(300, 300); move(250, 302);
  ok(!cards.style.transform, '拖动时原卡保持不动（不再整体左移）-> ' + cards.style.transform);
  ok(String(under.style.transform) === 'translateX(' + (W - 50) + 'px)', '下一张从右侧盖上来、1:1 跟手 -> ' + under.style.transform);
  ok(String(under.style.opacity) === '1', '预览卡不透明：右侧看到的就是完整那张卡，不是半透明面板');
  ok(String(under.getAttribute('data-w')) === w1, '预览卡是下一张词 -> ' + under.getAttribute('data-w'));
  ok(String(getEl('card2').style.opacity) === '0.4', '拖动时下方例句卡压暗（避免上下面不一致）');
  end(180, 304);
  await wait(60);
  ok(String(under.style.transform).indexOf('translateX(0') === 0, '松手超过阈值：下一张滑到正中盖满 -> ' + under.style.transform);
  await wait(260);
  ok(word() === w1, '左滑后切到下一张 -> ' + word());
  ok(String(under.style.transform) === 'translateX(100%)' && !under.getAttribute('data-w'), '切完立刻撤掉预览层（同帧换内容，不闪）');
  ok(!getEl('card2').style.opacity, '切完例句卡恢复原样');
  const wA = word();
  start(300, 300); move(280, 302); end(285, 303);
  await wait(60);
  ok(String(under.style.transform).indexOf('translateX(' + W + 'px)') === 0, '回弹：预览卡退回右侧 -> ' + under.style.transform);
  await wait(300);
  ok(word() === wA, '位移太小不翻页');
  ok(String(under.style.transform) === 'translateX(100%)' && String(under.style.opacity) === '0', '回弹后预览层退回待命位');
  start(300, 300); move(296, 420); end(296, 430);
  await wait(40);
  ok(word() === wA && !cards.style.transform && String(under.style.transform) === 'translateX(100%)', '纵向滑动（滚动释义）不翻页也不出预览卡');
  const star = getEl('star'); star.tagName = 'BUTTON';
  start(300, 300, star); move(180, 302); end(180, 302, star);
  await wait(320);
  ok(word() === wA, '从按钮上开始的滑动不算');
  start(120, 300); move(260, 302); end(260, 302);
  await wait(340);
  ok(word() === w0, '右滑回到上一张 -> ' + word());
  const tm = getEl('tapMode'); tm.value = 'btn'; tm._listeners.change.call(tm);
  ok(getEl('side').className.indexOf('hide') < 0, '按钮模式：上一张/下一张按钮显示');
  ok(getEl('chint').textContent.indexOf('上一张') >= 0, '按钮模式提示改成点上一张/下一张');
  ok(store['cet4-tap-v1'] === 'btn', '切词方式写进 localStorage');
  const wB = word();
  start(300, 300); move(150, 302); end(150, 302);
  await wait(300);
  ok(word() === wB, '按钮模式下滑动不翻页（两种方式互斥）');
  getEl('bNext')._listeners.click();
  ok(word() === ctx.DATA[1][0], '按钮模式点「下一张」-> ' + word());
  getEl('bPrev')._listeners.click();
  ok(word() === wB, '按钮模式点「上一张」-> ' + word());
  /* 保险：残留位移样式会在换词时被清掉 */
  cards.style.transform = 'translateX(-999px)'; cards.style.opacity = '0';
  ctx.renderCard();
  ok(!cards.style.transform && !cards.style.opacity, '换词时清掉残留的位移/淡出样式（防卡死）');
  tm.value = 'swipe'; tm._listeners.change.call(tm);
  ok(getEl('side').className.indexOf('hide') >= 0, '切回滑动：按钮再次隐藏');
  ok(html.indexOf("tv==='btn'||tv==='tap'") > 0, '旧的 tap 值兼容映射到 btn');
  ok(html.indexOf('点击卡片') < 0, '页面里不再有「点击卡片」');
  console.log('PASS ' + pass.length + ' / ' + (pass.length + fails.length));
  if (fails.length) { console.log('\nFAILED:'); fails.forEach(f => console.log('  x ' + f)); process.exit(1); }
})();
