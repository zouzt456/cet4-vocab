const fs = require('fs');
const vm = require('vm');
const path = process.argv[2];
const html = fs.readFileSync(path, 'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
if(!code){console.log('NO_SCRIPT');process.exit(1);}

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
  window: { speechSynthesis: { cancel(){}, speak(){} } },
  SpeechSynthesisUtterance: function(t){ this.text = t; },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
  console, setTimeout
};
ctx.window.document = doc;
vm.runInNewContext(code, ctx, { filename: 'page.js' });

const fails = [], pass = [];
const ok = (c, msg) => (c ? pass : fails).push(msg);
const ansKids = () => getEl('cans').children;
const c2Kids = () => getEl('c2ans').children;
const walk = (kids, out) => { kids.forEach(k => { if (k.className === 'eg') out.push(k); if (k.children && k.children.length) walk(k.children, out); }); return out; };
const egCount = kids => walk(kids.slice(), []).length;
const find = name => ctx.DATA.find(r => r[0] === name);

ok(ctx.DATA.length === 3849, '词条 3849');
ok(getEl('cword').textContent === ctx.DATA[0][0], '首词 = 数据第 0 条 (' + getEl('cword').textContent + ')');
ok(getEl('cans').className === 'ans', '默认展开释义');
ok(getEl('cnt').textContent === '1 / 3849', '计数 -> ' + getEl('cnt').textContent);
ok(getEl('pmeta').textContent.indexOf('第 1 词') >= 0, '进度文案含 第 1 词');
ok(getEl('pmeta').textContent.indexOf('进度 0.03%') >= 0, '进度两位小数 -> ' + getEl('pmeta').textContent);
ok(getEl('bToggle').textContent === '收起释义', '展开按钮初始为 收起释义');
ok(getEl('pfill').style.width === '0.03%', '进度条宽 ' + getEl('pfill').style.width);

ok(egCount(ansKids()) === 1, '第 1 张卡放 1 条例句（实际 ' + egCount(ansKids()) + '）');
ok(getEl('card2').className === 'card card2 on', '第 2 张卡同时显示（' + ctx.EX['state'].length + ' 句）');
ok(getEl('c2head').textContent === 'state · 其余 2 条例句', '第 2 张卡标题 -> ' + getEl('c2head').textContent);
ok(egCount(c2Kids()) === 2, '第 2 张卡放剩余 2 条例句');
ok(getEl('c2ans').className === 'ans', '第 2 张卡默认也展开');

getEl('bToggle')._listeners.click.call(getEl('bToggle'), {});
ok(getEl('cans').className === 'ans hidden' && getEl('c2ans').className === 'ans hidden', '按钮同时收起两张卡');
ok(getEl('bToggle').textContent === '展开释义', '收起后按钮变 展开释义');
getEl('bToggle')._listeners.click.call(getEl('bToggle'), {});
ok(getEl('cans').className === 'ans' && getEl('c2ans').className === 'ans', '再按同时展开');
ok(getEl('bToggle').textContent === '收起释义', '展开后按钮变回 收起释义');

// 例句少的词 → 不出现第二张卡
const fewIdx = (() => { for (let i = 0; i < ctx.DATA.length; i++) { const n = (ctx.EX[ctx.DATA[i][0]] || []).length; if (n > 0 && n <= 2) return i; } return -1; })();
ok(fewIdx > 0, '找到例句 ≤2 的词用于测试');
ctx.pos = fewIdx; ctx.renderCard();
ok(getEl('card2').className === 'card card2', '例句少时第 2 张卡隐藏（' + ctx.DATA[fewIdx][0] + '）');
ok(getEl('c2head').textContent === '', '隐藏时标题清空');

// 翻词
ctx.pos = 0; ctx.renderCard();
ctx.go(1);
ok(getEl('cword').textContent === ctx.DATA[1][0], 'go(1) 到第 2 词 (' + getEl('cword').textContent + ')');
ok(getEl('cnt').textContent === '2 / 3849', '计数 2 / 3849');
ctx.go(-1);
ok(getEl('cword').textContent === ctx.DATA[0][0] && getEl('cnt').textContent === '1 / 3849', 'go(-1) 回到第 1 词');
ctx.go(-1);
ok(getEl('bPrev').disabled === true, '开头时上一张按钮禁用');
ok(JSON.parse(store['cet4-pos-v1']).i === 0, '位置已存 localStorage');

// 键盘
getEl('v-card').className = 'on';
const pressed = [];
const key = (k, code) => doc._l.keydown({ key: k, code: code || '', preventDefault(){ pressed.push(k); } });
key('>');
ok(getEl('cnt').textContent === '2 / 3849', '> 键到第 2 词');
key('<');
ok(getEl('cnt').textContent === '1 / 3849', '< 键回到第 1 词');
key('ArrowRight'); key('ArrowLeft');
ok(getEl('cnt').textContent === '1 / 3849', '方向键往返');
key('Space', 'Space');
ok(getEl('cans').className === 'ans hidden', '空格收起');
key('Space', 'Space');
ok(getEl('cans').className === 'ans', '空格展开');
ok(pressed.length >= 6, '按键已 preventDefault');

// 词表
getEl('q').value = '政府';
ctx.renderList();
ok(getEl('list').innerHTML.indexOf('government') >= 0, '词表搜「政府」命中 government');
ok(getEl('listTips').textContent.indexOf('点击展开') >= 0, '词表提示 ' + getEl('listTips').textContent);
const rowHtmlStr = ctx.rowEgsHtml(find('state'));
ok(rowHtmlStr.indexOf('TED 演讲') >= 0, '词表展开含例句来源');
ok(rowHtmlStr.indexOf('<mark>') >= 0, '词表例句有高亮');
ok(/class="eg"/.test(rowHtmlStr), '词表例句结构');

// 例句标记
const w = find('state');
ok(ctx.markEn(ctx.esc(ctx.EX['state'][0][0]), ctx.formsOf(w)).indexOf('<mark>') >= 0, '英文例句高亮');
ok(ctx.markEn(ctx.esc(ctx.EX['state'][0][0]), ctx.formsOf(w)).indexOf('<mark><mark>') < 0, '无嵌套 mark');
ok(/<mark>[^<]*国家[^<]*<\/mark>/.test(ctx.markZh(ctx.esc('任何国家的首脑'), ctx.glossesOf(w))), '中文义项高亮');
ok(ctx.esc('X <b>') === 'X &lt;b&gt;', 'HTML 转义');

// 随机顺序
ctx.pref.order = 'rand'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
ok(getEl('cnt').textContent.indexOf('1 / 3849') === 0, '随机顺序回到第 1 张');

// 生词本
ctx.pref.order = 'bnc'; ctx.pos = 0; getEl('order').value = 'bnc'; ctx.buildOrder(); ctx.renderCard();
const starBtn = getEl('star');
ok(starBtn.textContent === '☆', '未收藏时显示空心星');
starBtn._listeners.click.call(starBtn, { stopPropagation(){} });
const stKey = String(ctx.DATA[0][0]).toLowerCase();
ok(!!JSON.parse(store['cet4-stars-v1'])[stKey], '点星写入 localStorage');
ok(getEl('star').textContent === '★', '收藏后实心星');
ok(getEl('starN').textContent === '1' && getEl('starN').className === 'badge', 'tab 徽标计数 1');
ctx.renderStars();
ok(getEl('starList').innerHTML.indexOf(ctx.DATA[0][0]) >= 0, '生词本列出该词');
ok(getEl('starTips').textContent.indexOf('生词本 1 个') >= 0, '生词本提示：' + getEl('starTips').textContent);
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
ok(!JSON.parse(store['cet4-stars-v1'])[stKey], '再点星移除');
ok(getEl('starN').className === 'badge hidden', '清空后徽标隐藏');

// 卡片不再用点击收起，避免拖选文字时误触发
ok(!getEl('card')._listeners.click, '卡片没有点击收起监听（可自由选字复制）');


// 只背生词模式
ctx.pref.mode = 'star'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
ok(getEl('cnt').textContent === '0 / 0', '生词为空时计数 -> ' + getEl('cnt').textContent);
ok(getEl('pmeta').textContent.indexOf('还没有生词') >= 0, '空生词提示 -> ' + getEl('pmeta').textContent);
ok(getEl('chint').textContent.indexOf('生词本还是空的') >= 0, '空生词卡面提示');

ctx.pref.mode = 'all'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
ctx.pref.mode = 'star'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
ok(ctx.orderArr.length === 1, '只背生词模式词数 1（实际 ' + ctx.orderArr.length + '）');
ok(getEl('cnt').textContent === '1 / 1', '只背生词计数 -> ' + getEl('cnt').textContent);
ok(getEl('cword').textContent === ctx.DATA[0][0], '只背生词模式显示该词');
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
ok(ctx.orderArr.length === 0, '取消收藏后词数归 0（实际 ' + ctx.orderArr.length + '）');
ok(getEl('cnt').textContent === '0 / 0', '取消后回到空态');
ctx.pref.mode = 'all'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
ok(ctx.orderArr.length === 3849, '切回全部模式恢复 3849');

// 换模式 / 换顺序后不该回到第 1 张
ctx.pref.mode = 'all'; ctx.pref.order = 'bnc'; ctx.pos = 6; ctx.buildOrder(); ctx.renderCard();
const keepWord0 = getEl('cword').textContent;
getEl('order')._listeners.change.call({ value: 'alpha' });
ok(getEl('cword').textContent === keepWord0, '换顺序停在同一词（' + keepWord0 + ' -> ' + getEl('cword').textContent + '）');
ok(ctx.orderArr.length === 3849, '换顺序词数不变');
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
getEl('mode')._listeners.change.call({ value: 'star' });
ok(getEl('cword').textContent === keepWord0, '换到只背生词模式仍停在该词（生词本里有它）');
ok(getEl('cnt').textContent.indexOf('1 / 1') === 0, '只背生词模式计数 ' + getEl('cnt').textContent);
getEl('mode')._listeners.change.call({ value: 'all' });
ok(getEl('cword').textContent === keepWord0, '切回全部模式仍停在该词');
ok(ctx.orderArr.length === 3849, '切回全部模式词数 3849');
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
ctx.pref.order = 'bnc'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();


// ---- 跳到某个词 ----
const jumpTo = ctx.jumpToWord, idxOfQ = ctx.dataIndexOfQ;
ok(typeof jumpTo === 'function', '存在 jumpToWord');
ok(idxOfQ('national') === ctx.DATA.findIndex(r => r[0].toLowerCase() === 'national'), '精确匹配单词');
ok(idxOfQ('natio') === -1 || idxOfQ('natio') >= 0, '前缀匹配不炸');
ok(idxOfQ('zzzz') === -1, '不存在的词返回 -1');
const partIdx = ctx.DATA.findIndex(r => r[0].toLowerCase() === 'part');
ctx.pref.mode = 'all'; ctx.pref.order = 'bnc'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();
ok(jumpTo(partIdx) === true, '跳到 part 成功');
ok(getEl('cword').textContent === ctx.DATA[partIdx][0], '跳转后卡片是 part（实际 ' + getEl('cword').textContent + '）');
ok(getEl('cnt').textContent.indexOf('3 / 3849') === 0, '跳转后计数 = 3 / 3849（实际 ' + getEl('cnt').textContent + '）');
ok(getEl('v-card').className === 'on', '跳转后自动切到背单词页');
ok(JSON.parse(store['cet4-pos-v1']).i === 2, '跳转后位置写进 localStorage');

// 只背生词模式下跳到非生词 → 自动切回全部模式
getEl('star')._listeners.click.call(getEl('star'), { stopPropagation(){} });
getEl('mode')._listeners.change.call({ value: 'star' });
const natIdx = ctx.DATA.findIndex(r => r[0].toLowerCase() === 'national');
ok(jumpTo(natIdx) === true, '只背生词模式下仍能跳');
ok(ctx.pref.mode === 'all', '跳非生词时模式回落 all');
ok(getEl('cword').textContent === ctx.DATA[natIdx][0], '跳到 national');
ctx.pref.mode = 'all'; ctx.pref.order = 'bnc'; ctx.pos = 0; ctx.buildOrder(); ctx.renderCard();

console.log('PASS ' + pass.length + ' / ' + (pass.length + fails.length));
if (fails.length) { console.log('FAILED:'); fails.forEach(f => console.log(' - ' + f)); }
