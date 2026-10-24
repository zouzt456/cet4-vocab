const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
function El(id){const o={id,textContent:'',className:'',value:'',children:[],disabled:false,style:{},_attrs:{},_listeners:{},_html:'',
 getAttribute(k){return this._attrs[k]||null;},setAttribute(k,v){this._attrs[k]=v;},appendChild(c){this.children.push(c);},
 addEventListener(t,f){this._listeners[t]=f;},querySelectorAll(){return [];},closest(){return null;},
 classList:{toggle(){},add(){},remove(){},contains(){return false;}},parentNode:null};
 Object.defineProperty(o,'innerHTML',{get(){return o._html;},set(v){o._html=v;o.children.length=0;}});return o;}
const els={},getEl=id=>(els[id]=els[id]||El(id));
const tabs=['card','list','stars'].map((v,i)=>{const e=El('tab'+i);e.setAttribute('data-v',v);return e;});
const doc={getElementById:getEl,createElement:t=>El('new:'+t),addEventListener(t,f){(doc._l=doc._l||{})[t]=f;},
 querySelectorAll(s){return s==='nav button'?tabs:[];},body:El('body'),activeElement:null};
const store={};
const ctx={document:doc,window:{speechSynthesis:{cancel(){},speak(){}}},SpeechSynthesisUtterance:function(t){this.text=t;},
 localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}},console,setTimeout};
ctx.window.document=doc;
vm.runInNewContext(code,ctx,{filename:'page.js'});
const fails=[],pass=[];
const ok=(c,m)=>(c?pass:fails).push(m);
const W_=i=>ctx.DATA[i][ctx.C.w];
const setMode=v=>{const el=getEl('mode');el.value=v;el._listeners.change.call(el);};

ok(ctx.pref.mode==='all','初始模式 all');
ok(ctx.orderArr.length===3849,'全部单词 3849');
// 走到第 8 条
ctx.pos=7;ctx.save();ctx.renderCard();
const keep=W_(7);
ok(ctx.cur[0]===keep,'全部模式停在第 8 条 ('+keep+')');
ok(ctx.slotAll===7,'全部模式槽位=7（'+ctx.slotAll+'）');
// 造两条生词（靠后、不连续，便于发现"跳到别的卡片"）
const starIdx=[3000,1500];
starIdx.forEach(i=>{ctx.stars[ctx.keyOf(ctx.DATA[i])]=1;});
ctx.buildOrder();
ok(ctx.orderArr.length===3849,'加星不影响全部模式');
setMode('star');
ok(ctx.pref.mode==='star','已切到只背生词');
ok(ctx.orderArr.length===2,'生词模式 2 条（'+ctx.orderArr.length+'）');
ok(ctx.pos===0,'生词模式从第 1 条开始（pos='+ctx.pos+'）');
ok(ctx.cur[0]===W_(1500),'生词模式第一张 = 数据第1500条（'+ctx.cur[0]+'）');
ctx.go(1);
ok(ctx.pos===1&&ctx.cur[0]===W_(3000),'生词模式第 2 张（'+ctx.cur[0]+'）');
ok(ctx.slotStar===1,'生词模式槽位=1');
// 关键回归：切回全部单词，必须回到原来那张卡，且计数/进度同步
setMode('all');
ok(ctx.pos===7,'切回全部模式回到 pos 7（实际 '+ctx.pos+'）');
ok(ctx.cur[0]===keep,'切回全部模式卡片 = '+keep+'（实际 '+ctx.cur[0]+'）');
ok(getEl('cnt').textContent==='8 / 3849','计数同步 '+getEl('cnt').textContent);
ok(getEl('cword').textContent===keep,'卡片标题同步 '+getEl('cword').textContent);
// 再切回生词，要回到它自己的第 2 条
setMode('star');
ok(ctx.pos===1,'生词模式记住自己的 pos=1（实际 '+ctx.pos+'）');
ok(ctx.cur[0]===W_(3000),'生词模式卡片 = '+W_(3000)+'（实际 '+ctx.cur[0]+'）');
// 全部模式里继续翻 3 条，再切走切回
setMode('all');
ctx.go(1);ctx.go(1);ctx.go(1);
ok(ctx.pos===10,'全部模式翻 3 条到 pos 10（实际 '+ctx.pos+'）');
const w10=ctx.cur[0];
setMode('star');setMode('all');
ok(ctx.pos===10&&ctx.cur[0]===w10,'来回切两次仍停在 '+w10+'（实际 '+ctx.cur[0]+'）');
// 换顺序（词频/字母）不应把模式位置搞乱
ctx.pref.order='alpha';ctx.keepWord();ctx.save();ctx.renderCard();
ok(ctx.orderArr.length===3849,'换字母序后仍是 3849');
ok(ctx.cur[0]===w10,'换字母序仍停在同一个词（'+ctx.cur[0]+'）');
const ps=JSON.parse(store['cet4-pos-v1']);
ok(typeof ps.i==='number'&&typeof ps.s==='number','localStorage 同时保存 i 和 s（'+JSON.stringify(ps)+'）');
// 重置：从 ☰ 菜单进「回到第一个词」，并且必须过确认
const menuEl=getEl('menu');
ctx.openMenu();
const beforeReset=ctx.pos;
getEl('miFirst')._listeners.click.call(getEl('miFirst'),{});
ok(getEl('cfMask').className.indexOf('hidden')<0,'点「回到第一个词」弹确认框');
getEl('cfNo')._listeners.click.call(getEl('cfNo'),{});
ok(ctx.pos===beforeReset,'点「取消」位置不变（实际 '+ctx.pos+'）');
getEl('miFirst')._listeners.click.call(getEl('miFirst'),{});
getEl('cfYes')._listeners.click.call(getEl('cfYes'),{});
ok(ctx.pos===0&&ctx.slotAll===0&&ctx.slotStar===0,'确认后两个模式都归零');
console.log(fails.length?('FAIL '+fails.length+' / '+(fails.length+pass.length)+'\n'+fails.join('\n')):('PASS '+pass.length+' / '+pass.length));
process.exit(fails.length?1:0);
