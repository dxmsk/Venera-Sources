const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const store={};let network=0;
const ctx={ComicSource:class{loadSetting(){return null;}saveData(k,v){store[k]=JSON.parse(JSON.stringify(v));}loadData(k){return store[k];}},Comic:function(v){Object.assign(this,v)},ComicDetails:function(v){Object.assign(this,v)},Network:{get:async()=>{network++;throw Error('Unexpected network');}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','bakamh_preload.js'),'utf8')+';globalThis.s=new BakamhPreload()',ctx);
(async()=>{
 const s=ctx.s;let fetched=0;
 s.browsePage=async()=>({comics:Array.from({length:8},(_,i)=>new ctx.Comic({id:'/book/'+i+'/',title:'Book '+i,cover:''})),maxPage:1});
 s.fetchInfo=async id=>{fetched++;return {title:id,cover:'',description:'',tags:{},chapters:new Map([['1','Chapter 1'],['2','Chapter 2']])};};
 for(const [page,count] of [[1,3],[2,3],[3,2]]){const r=await s.explore[0].load(page);assert.equal(r.comics.length,count);if(page===3)assert.equal(r.maxPage,3);const d=s.comic.loadInfo(r.comics[0].id);assert.equal(d.chapters.size,2);assert.equal(d.then,undefined);}
 assert.equal(fetched,8);s.detailMemory={};assert.equal(s.comic.loadInfo('/book/0/').chapters.size,2);assert.equal(network,0);
 assert.throws(()=>s.comic.loadInfo('/missing/'));
 console.log('PASS: preload batches, synchronous details, persisted cache, no detail network');
})().catch(e=>{console.error(e);process.exitCode=1});
