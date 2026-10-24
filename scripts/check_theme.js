const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
function El(id){const o={id,textContent:'',className:'',value:'',children:[],disabled:false,style:{},_attrs:{},_listeners:{},_html:'',
 getAttribute(k){return this._attrs[k]||null;},setAttribute(k,v){this._attrs[k]=v;},appendChild(c){this.children.push(c);},
 addEventListener(t,f){o._listeners[t]=f;},querySelectorAll(){return [];},closest(){return null;},
 classList:{toggle(){},add(){},remove(){},contains(){return false;}},parentNode:null};
 Object.defineProperty(o,'innerHTML',{get(){return o._html;},set(v){o._html=v;o.children.length=0;}});return o;}
const els={},getEl=id=>(els[id]=els[id]||El(id));
const tabs=['card','list','stars'].map((v,i)=>{const e=El('tab'+i);e.setAttribute('data-v',v);return e;});
const store={};
const doc={getElementById:getEl,createElement:()=>El('x'),querySelectorAll:()=>tabs,querySelector:()=>null,
 documentElement:El('html'),activeElement:null,body:El('body'),_listeners:{},addEventListener(t,f){doc._listeners[t]=f;}};
const ctx={document:doc,window:{speechSynthesis:{speak(){},cancel(){}},matchMedia:q=>({matches:false})},
 localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
 console,JSON,Math,Date,setTimeout:f=>f(),clearTimeout(){},data:[[ 'state','steit','n. 州','s:states','5','','100','100','cet4','n','' ]],EX:{}};
vm.createContext(ctx);
vm.runInContext(code,ctx);
getEl('menuBox').className='sheet hidden';   /* 对应 HTML 里的 class="sheet hidden" */
const ok=(c,m)=>console.log((c?'PASS':'FAIL')+' '+m);
ok(ctx.dark===false,'默认日间（matchMedia 返回 false）');
ok(getEl('miThemeIc').textContent==='🌙' && getEl('miThemeTx').textContent==='夜间模式','菜单项显示「🌙 夜间模式」');
ok(getEl('menuBox').className==='sheet hidden','菜单默认收起');
getEl('menu')._listeners.click({stopPropagation(){}});
ok(getEl('menuBox').className==='sheet','点 ☰ 展开菜单');
getEl('miTheme')._listeners.click({stopPropagation(){}});
ok(ctx.dark===true,'点菜单项后 dark=true');
ok(doc.documentElement.className==='dark','html 加上 dark 类');
ok(getEl('miThemeIc').textContent==='☀️' && getEl('miThemeTx').textContent==='日间模式','菜单项变「☀️ 日间模式」');
ok(store['cet4-theme-v1']==='dark','localStorage 记住 dark');
ok(getEl('menuBox').className==='sheet hidden','点完自动收起菜单');
ctx.setTheme(false);
ok(ctx.dark===false && doc.documentElement.className==='','setTheme(false) 恢复日间');
ok(getEl('miThemeTx').textContent==='夜间模式','菜单项回到「夜间模式」');
ok(store['cet4-theme-v1']==='light','localStorage 记住 light');
