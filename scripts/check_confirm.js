
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
function El(id){const o={id,textContent:'',className:'',value:'',children:[],disabled:false,style:{},_attrs:{},_listeners:{},_html:'',
 getAttribute(k){return this._attrs[k]||null;},setAttribute(k,v){this._attrs[k]=v;},appendChild(c){this.children.push(c);},
 addEventListener(t,f){o._listeners[t]=f;},querySelectorAll(){return [];},closest(){return null;},
 classList:{toggle(){},add(){},remove(){},contains(){return false;}},parentNode:null,focus(){},select(){},click(){}};
 Object.defineProperty(o,'innerHTML',{get(){return o._html;},set(v){o._html=v;o.children.length=0;}});return o;}
const els={},getEl=id=>(els[id]=els[id]||El(id));
const tabs=['card','list','stars'].map((v,i)=>{const e=El('tab'+i);e.setAttribute('data-v',v);return e;});
const store={};
const doc={getElementById:getEl,createElement:()=>El('x'),querySelectorAll:()=>tabs,documentElement:El('html'),
 activeElement:null,body:El('body'),_listeners:{},addEventListener(t,f){doc._listeners[t]=f;}};
const DATA=[['state','steit','n. 州','s:states','5','','100','100','cet4','n',''],
            ['part','pa:t','n. 部分','s:parts','3','','140','140','cet4','n',''],
            ['point','pɔint','n. 点','s:points','5','','160','160','cet4','n','']];
const ctx={document:doc,window:{speechSynthesis:{speak(){},cancel(){}},matchMedia:q=>({matches:false})},
 localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
 console,JSON,Math,Date,setTimeout:f=>f(),clearTimeout(){},data:DATA,EX:{},
 navigator:{},Blob:function(){},URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},FileReader:function(){}};
ctx.__DATA=DATA;
vm.createContext(ctx);
getEl('cfMask').className='mask hidden';   /* 桩不解析 HTML 的 class，按真实初始状态补上 */
vm.runInContext(code,ctx);
getEl('menuBox').className='sheet hidden';

const fails=[];const ok=(c,m)=>(c?fails.length:0,console.log((c?'PASS':'FAIL')+' '+m),(c||fails.push(m)));
const K=(e,v)=>getEl(e)._listeners.click.call(getEl(e),v||{});

// 1. 初始隐藏
ok(getEl('cfMask').className.indexOf('hidden')>=0,'确认框初始隐藏');

// 2. 菜单里有新入口，且旧的 footer 重置已移除
const menuHtml=html;
ok(menuHtml.indexOf('id="miFirst"')>0,'菜单含「回到第一个词」');
ok(menuHtml.indexOf('id="miClearStars"')>0,'菜单含「清空生词本」');
ok(menuHtml.indexOf('id="reset"')<0,'footer 里旧的 reset 入口已移除');
ok(code.indexOf('function askConfirm')>0 && code.indexOf('function confirmOpen')>0,'确认框是自己画的（askConfirm/confirmOpen）');

// 3. 清空生词本：先取消，再确认
ctx.stars={state:1,part:1};
ctx.saveStars();ctx.paintStars();
ctx.openMenu();
ok(getEl('miClearTx').textContent.indexOf('（2）')>0,'菜单显示生词本数量（'+getEl('miClearTx').textContent+'）');
K('miClearStars');
ok(getEl('cfMask').className.indexOf('hidden')<0,'点清空后弹出确认框');
ok(getEl('cfTitle').textContent.indexOf('清空生词本')>=0,'标题是清空生词本');
ok(getEl('cfMsg').textContent.indexOf('2 个')>0,'正文报出数量');
K('cfNo');
ok(getEl('cfMask').className.indexOf('hidden')>=0,'取消后关闭');
ok(Object.keys(ctx.stars).length===2,'取消后生词本没变');
K('miClearStars');K('cfYes');
ok(Object.keys(ctx.stars).length===0,'确认后生词本清空');
ok(getEl('starN').className.indexOf('hidden')>=0,'角标被隐藏');

// 4. 回到第一个词：取消保留位置，确认归零
ctx.pref.mode='all';ctx.buildOrder();ctx.pos=2;ctx.renderCard();
const where=ctx.pos;
K('miFirst');
ok(getEl('cfMsg').textContent.indexOf('第 3 个词')>=0,'正文写清楚当前是第几个（'+getEl('cfMsg').textContent+'）');
K('cfNo');
ok(ctx.pos===where,'取消不改变位置');
K('miFirst');K('cfYes');
ok(ctx.pos===0 && ctx.slotAll===0 && ctx.slotStar===0,'确认后回到第一个词');
ok(store['cet4-pos-v1'].indexOf('"i":0')>0,'位置已写入 localStorage');

// 5. Esc 关闭 + 打开时键盘快捷键失效
ctx.buildOrder();ctx.pos=1;ctx.renderCard();
const before=ctx.pos;
K('miFirst');
doc._listeners.keydown({key:'ArrowRight',code:'ArrowRight',preventDefault(){}});
ok(ctx.pos===before,'确认框开着时方向键不翻卡');
doc._listeners.keydown({key:'Escape',code:'Escape',preventDefault(){}});
ok(getEl('cfMask').className.indexOf('hidden')>=0,'Esc 关闭确认框');

// 6. 生词本为空时点清空 → 只提示，不给危险操作
K('miClearStars');
ok(getEl('cfYes').textContent==='知道了','空生词本只给「知道了」');
K('cfYes');
ok(getEl('cfMask').className.indexOf('hidden')>=0,'提示关闭');

console.log('\nFAILED:\n'+fails.join('\n'));
process.exit(fails.length?1:0);
