const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).sort((a,b)=>b.length-a.length)[0];
function El(id){const o={id,textContent:'',className:'',value:'',children:[],files:null,disabled:false,style:{},_attrs:{},_listeners:{},_html:'',
 getAttribute(k){return this._attrs[k]||null;},setAttribute(k,v){this._attrs[k]=v;},appendChild(c){this.children.push(c);},
 addEventListener(t,f){o._listeners[t]=f;},querySelectorAll(){return [];},closest(){return null;},
 classList:{toggle(){},add(){},remove(){},contains(){return false;}},parentNode:null,click(){o._clicked=(o._clicked||0)+1;},
 focus(){},select(){},removeChild(){}};
 Object.defineProperty(o,'innerHTML',{get(){return o._html;},set(v){o._html=v;o.children.length=0;}});return o;}
const els={},getEl=id=>(els[id]=els[id]||El(id));
const tabs=['card','list','stars'].map((v,i)=>{const e=El('tab'+i);e.setAttribute('data-v',v);return e;});
const store={};
const doc={getElementById:getEl,createElement:()=>El('x'),querySelectorAll:()=>tabs,querySelector:()=>null,
 documentElement:El('html'),activeElement:null,body:El('body'),_listeners:{},addEventListener(t,f){doc._listeners[t]=f;},
 execCommand(){return true;}};
const DATA=[['state','steit','n. 州','s:states','5','','100','100','cet4','n',''],
            ['part','pa:t','n. 部分','s:parts','3','','140','140','cet4','n','']];
const ctx={document:doc,window:{speechSynthesis:{speak(){},cancel(){}},matchMedia:q=>({matches:false})},
 localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
 console,JSON,Math,Date,setTimeout:f=>f(),clearTimeout(){},data:DATA,EX:{},
 navigator:{},Blob:function(){},URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},FileReader:function(){}};
vm.createContext(ctx);
vm.runInContext(code,ctx);
getEl('menuBox').className='sheet hidden';
const ok=(c,m)=>console.log((c?'PASS':'FAIL')+' '+m);
const st=ctx.collectState();
ok(st.app==='cet4-vocab','导出含 app=cet4-vocab');
ok(st.data && st.data.pos && typeof st.data.pos.i==='number','导出含 pos.i');
ok(st.data && st.data.stars && Object.keys(st.data.stars).length===0,'初始生词本为空');
ctx.stars['state']=1;ctx.pos=1;keep=1;
const st2=ctx.collectState();
ok(st2.data.stars.state===1,'导出包含已收藏的 state');
ok(st2.data.pos.i===1,'导出包含全部模式位置 1（pos=1 时）');
const txt=ctx.stateText();
ok(typeof txt==='string' && txt.indexOf('\n')>0,'导出文本是带缩进的 JSON');
ok(JSON.parse(txt).stats.stars===1,'stats.stars 计数正确');
const r=ctx.applyState({app:'cet4-vocab',data:{stars:{part:1,state:1},pos:{order:'alpha',mode:'star',i:2,s:1}}});
ok(r.stars===2,'导入后生词本 2 个');
ok(ctx.pref.mode==='star','导入后模式=只背生词');
ok(ctx.pref.order==='alpha','导入后顺序=字母');
ok(getEl('mode').value==='star','select 同步为 star');
ok(store['cet4-stars-v1'].indexOf('part')>0,'生词本已写入 localStorage');
ok(store['cet4-pos-v1'].indexOf('"alpha"')>0,'进度已写入 localStorage');
let threw=false;try{ctx.applyState({app:'other'});}catch(e){threw=true;}
ok(threw,'非本应用数据被拒绝');
threw=false;try{ctx.applyState({app:'cet4-vocab',data:{}});}catch(e){threw=true;}
ok(threw,'缺少生词本数据被拒绝');
// 关闭/打开面板
getEl('menu')._listeners.click({stopPropagation(){}});
ok(getEl('menuBox').className==='sheet','点 ☰ 展开菜单（同步入口在里面）');
getEl('miSync')._listeners.click({stopPropagation(){}});
ok(getEl('syncMask').className==='mask','点「同步生词本与进度」打开面板');
ok(getEl('menuBox').className==='sheet hidden','打开面板时菜单收起');
ok(getEl('syncTxt').value.indexOf('cet4-vocab')>0,'打开面板自动填入当前进度');
getEl('syncClose')._listeners.click();
ok(getEl('syncMask').className==='mask hidden','点 × 关闭面板');
// 脏键过滤 + 备份 + 撤销 + 全角引号
ctx.applyState({app:'cet4-vocab',data:{stars:{state:1},pos:{order:'bnc',mode:'all',i:0,s:0}}});
ok(!store['cet4-sync-bak-v1']||store['cet4-sync-bak-v1'].indexOf('state')>=0,'导入前把原状存进备份键');
ctx.applyState({app:'cet4-vocab',data:{stars:{state:1,zzzNOTAWORD:1},pos:{order:'bnc',mode:'all',i:0,s:0}}});
ok(Object.keys(ctx.stars).length===1 && !ctx.stars.zzznotaword,'词表里没有的键被过滤掉');
ok(ctx.undoImport()===true,'撤销上次导入');
ok(ctx.stars.state===1 && Object.keys(ctx.stars).length===1,'撤销后回到导入前状态');
ok(!store['cet4-sync-bak-v1'],'撤销后备份被清掉，不能反复撤销');
ok(ctx.cleanJson('  \uFEFF{“app”:“cet4-vocab”}  ') === '{"app":"cet4-vocab"}','全角引号/BOM/首尾杂物被清洗');
ctx.window.AndroidTheme={setDark(){}};   /* 模拟 APK 环境 */
ctx.openSync();
ok(getEl('bDownload').style.display==='none','APK 里隐藏「下载 .json」（点了也不会弹）');
ok(getEl('bPick').style.display==='none','APK 里隐藏「选择文件」');
delete ctx.window.AndroidTheme;
ctx.openSync();
ok(getEl('bDownload').style.display!=='none','网页/桌面里下载按钮可见');
getEl('menu')._listeners.click({stopPropagation(){}});
getEl('miSync')._listeners.click({stopPropagation(){}});
ok(getEl('syncMask').className==='mask','再从菜单打开面板');
const nmask=getEl('syncMask');nmask._listeners.click.call(nmask,{target:nmask});
ok(nmask.className==='mask hidden','点遮罩空白处关闭');
