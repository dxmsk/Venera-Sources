const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const {parseHTML} = require('linkedom');
const assert = require('node:assert/strict');
class El {
 constructor(el) { this.el=el; }
 get text(){return this.el.textContent;}
 get innerHTML(){return this.el.innerHTML;}
 get attributes(){return Object.fromEntries([...this.el.attributes].map(x=>[x.name,x.value]));}
 querySelector(s){const e=this.el.querySelector(s);return e?new El(e):null;}
 querySelectorAll(s){return [...this.el.querySelectorAll(s)].map(e=>new El(e));}
}
class Doc extends El {constructor(html){super(parseHTML('<html><body>'+html+'</body></html>').document);} dispose(){} }
const ab = b => Uint8Array.from(b).buffer;
const Convert = {
 encodeUtf8:s=>ab(Buffer.from(s)),decodeUtf8:b=>Buffer.from(b).toString(),
 decodeBase64:s=>ab(Buffer.from(s,'base64')),
 md5:b=>ab(crypto.createHash('md5').update(Buffer.from(b)).digest()),
 decryptAesCbc:(v,k,iv)=>{const d=crypto.createDecipheriv('aes-256-cbc',Buffer.from(k),Buffer.from(iv));d.setAutoPadding(false);return ab(Buffer.concat([d.update(Buffer.from(v)),d.final()]));}
};
let requests=[], response={status:200,body:''};
const ctx={ComicSource:class {loadSetting(){return null;}},Comic:function(x){Object.assign(this,x);},ComicDetails:function(x){Object.assign(this,x);},HtmlDocument:Doc,Convert,Network:{get:async(...a)=>{requests.push(a);return response;},post:async(...a)=>{requests.push(a);return response;}},UI:{launchUrl(){}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'bakamh.js'),'utf8')+'\nglobalThis.source=new Bakamh();',ctx);
const s=ctx.source;
(async()=>{
 const normalGet=ctx.Network.get;
 ctx.Network.get=async()=>{throw 'CloudflareException: https://bakamh.com/';};
 await assert.rejects(s.list(1),e=>String(e)==='CloudflareException: https://bakamh.com/');
 ctx.Network.get=normalGet;
 response={status:200,body:''};requests=[];await s.list(1);
 assert.equal(requests[0][0],'https://bakamh.com/');
 assert.equal(requests[1][0],'https://bakamh.com/wp-admin/admin-ajax.php');
 s.loadSetting=k=>k==='listMode'?'html':null;
 const list='<div class="page-item-detail"><div class="post-title"><a href="https://bakamh.com/manga/example/">样本漫画</a></div><img data-src="//cdn.example/cover.jpg"></div>';
 let c=s.parseList(list+list);assert.equal(c.length,1);assert.equal(c[0].id,'/manga/example/');assert.equal(c[0].cover,'https://cdn.example/cover.jpg');
 let chapters=s.chaptersFrom('<ul class="version-chap"><li class="renamed"><a href="/manga/example/2/">第2话</a></li><li><a href="/manga/example/1/">第1话</a></li></ul>','https://bakamh.com/manga/example/');assert.equal([...chapters.values()].join(','),'第1话,第2话');
 response={status:200,body:list};let result=await s.search.load('关键词 & 空格',[],2);assert.equal(result.comics.length,1);let u=new URL(requests.at(-1)[0]);assert.equal(u.searchParams.get('s'),'关键词 & 空格');assert.equal(u.pathname,'/page/2/');
 await s.ajaxList(2,'latest','关键词 & 空格');let p=new URLSearchParams(requests.at(-1)[2]);assert.equal(p.get('vars[s]'),'关键词 & 空格');assert.equal(p.get('page'),'1');
 const normalPost=ctx.Network.post;ctx.Network.post=async()=>{throw 'CloudflareException: https://bakamh.com/wp-admin/admin-ajax.php';};await assert.rejects(s.ajaxList(),e=>String(e)==='CloudflareException: https://bakamh.com/');ctx.Network.post=normalPost;
 response={status:200,body:list+'<a class="nextpostslink" href="/manga/page/2/">Next</a>'};assert.equal((await s.list()).maxPage,2);
 response={status:200,body:'<html>Unknown layout</html>'};await assert.rejects(s.list(),e=>String(e).includes('未解析到漫画列表'));
 response={status:403,body:'Just a moment... cf-chl-'};await assert.rejects(s.request('/'),e=>String(e)==='CloudflareException: https://bakamh.com/');
 response={status:200,body:'<title>正常漫画页面</title><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>'};assert.equal(await s.request('/'),response.body);
 response={status:200,body:'<title>Just a moment...</title>'};await assert.rejects(s.request('/'),e=>String(e).startsWith('CloudflareException:'));
 const modern='<article class="mkjp-sr__item"><h3 class="mkjp-sr__title"><a href="/manga/example/">新搜索</a></h3><img src="/cover.webp"></article>';assert.equal(s.parseList(modern)[0].title,'新搜索');
 response={status:200,body:'<a href="/on-going/zh/">中文连载</a><a href="/end/">完结</a>'};assert.equal((await s.category.parts[0].loader()).length,2);
 response={status:200,body:list};await s.categoryComics.load('/on-going/zh/',null,[],1);assert.equal(new URL(requests.at(-1)[0]).pathname,'/on-going/zh/');
 const pass='testnonce',salt=Buffer.from('0011223344556677','hex');let key=Buffer.alloc(0),prev=Buffer.alloc(0);while(key.length<48){prev=crypto.createHash('md5').update(Buffer.concat([prev,Buffer.from(pass),salt])).digest();key=Buffer.concat([key,prev]);}
 const images=['https://cdn.example/001.jpg','https://cdn.example/002.jpg'];const enc=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32,48));const ct=Buffer.concat([enc.update(JSON.stringify(JSON.stringify(images))),enc.final()]).toString('base64');
 const script=`var wpmangaprotectornonce='${pass}';var chapter_data='${JSON.stringify({ct,s:salt.toString('hex')})}';`;
 assert.equal(JSON.stringify(s.decryptProtector(script)),JSON.stringify(images));
 response={status:200,body:'<div class="reading-content"><div class="page-break"><img data-src="//cdn.example/1.jpg"></div></div>'};assert.equal((await s.episode('/manga/example/','/manga/example/1/')).images[0],'https://cdn.example/1.jpg');
 response={status:200,body:`<script id="chapter-protector-data" src="data:text/javascript;base64,${Buffer.from(script).toString('base64')}"></script>`};assert.equal(JSON.stringify((await s.episode('/manga/example/','/manga/example/1/')).images),JSON.stringify(images));
 response={status:200,body:'<div class="mkjp-ea-lock__title">需要登录</div>'};await assert.rejects(s.episode('/manga/example/','/manga/example/1/'),e=>String(e)==='需要登录');
 console.log('PASS: list/dedup/cover; renamed chapters/order; encoded search/page; Cloudflare; AES-CBC protector; plain images; base64 protector; lock message (8 groups). Synthetic fixtures only, no live-site success claim.');
})().catch(e=>{console.error(e);process.exit(1)});
