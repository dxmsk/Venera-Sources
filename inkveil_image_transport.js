// Direct image transport test. All requests run in explore, not in details.
class InkveilImageTransport extends ComicSource {
 name='巴卡图片传输检查';
 key='dxmsk_baka_image_transport';
 version='0.0.1';
 url='https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_image_transport.js';
 blue='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAIAAAB8wupbAAAAGklEQVR4nGOQyLtDEmIY1TCqYVTDqAbaagAAyfYTH/97m8wAAAAASUVORK5CYII=';
 cached=null;
 async load(){
  let image=this.blue,report='',original='';
  try{
   const headers={Referer:'https://bakamh.com/'};
   const home=await Network.get('https://bakamh.com/',headers);
   report+='首页 HTTP '+home.status+'\n';
   if(home.status!==200)throw '首页未成功';
   const doc=new HtmlDocument(String(home.body||''));
   try{
    const img=doc.querySelector('.page-item-detail img');
    const a=img?img.attributes:{};
    original=String(a['data-src']||a['data-lazy-src']||a.src||'').trim();
    if(original.startsWith('//'))original='https:'+original;
    else if(original.startsWith('/'))original='https://bakamh.com'+original;
   }finally{doc.dispose();}
   if(!/^https:\/\/bakamh\.com\//i.test(original))throw '未取得同站封面地址';
   report+='封面 '+original+'\n';
   if(typeof Network.getCookies==='function'){
    const cookies=await Network.getCookies(original);
    const list=Array.isArray(cookies)?cookies:[];
    report+='匹配Cookie数量 '+list.length+'\n';
    if(list.length)headers.Cookie=list.filter(c=>c&&c.name&&c.value!=null).map(c=>c.name+'='+c.value).join('; ');
   }
   if(typeof Network.fetchBytes!=='function')throw 'Network.fetchBytes接口不存在';
   const r=await Network.fetchBytes('GET',original,headers);
   report+='图片 HTTP '+r.status+'\n';
   const b=r.body;
   const bytes=b&&(b.byteLength===undefined?b.length:b.byteLength);
   report+='字节类型 '+Object.prototype.toString.call(b)+'\n字节数 '+bytes+'\n';
   if(r.status!==200)throw '图片下载未成功';
   if(!bytes)throw '没有图片字节';
   const h=r.headers||{};
   let mime=h['content-type']||h['Content-Type']||'';
   if(Array.isArray(mime))mime=mime[0];
   mime=String(mime).split(';')[0];
   if(!mime.startsWith('image/')){
    const u=new Uint8Array(b);
    if(u[0]===255&&u[1]===216)mime='image/jpeg';
    else if(u[0]===137&&u[1]===80)mime='image/png';
    else if(u[0]===82&&u[1]===73)mime='image/webp';
    else throw '返回内容不是已识别图片';
   }
   if(typeof Convert.encodeBase64!=='function')throw 'Convert.encodeBase64接口不存在';
   image='data:'+mime+';base64,'+Convert.encodeBase64(b);
   report+='图片已转为内嵌数据；此卡应显示真实封面。';
  }catch(e){
   if(/cloudflare/i.test(String(e)))throw e;
   report+='错误 '+String(e).slice(0,300);
  }
  this.cached={image,report};
  if(typeof this.saveData==='function')this.saveData('transportResult',this.cached);
  return {comics:[new Comic({id:'bytes',title:image===this.blue?'直接图片测试未完成':'直接图片下载成功',subTitle:report.slice(-180),cover:image}),new Comic({id:'control',title:'蓝色对照图',subTitle:'蓝图正常而真实图失败，可对照传输报告。',cover:this.blue})],maxPage:1};
 }
 explore=[{title:'图片传输',type:'multiPageComicList',load:async()=>this.load()}];
 details(id){
  const c=this.cached||(typeof this.loadData==='function'?this.loadData('transportResult'):null);
  if(!c)throw '请先刷新书库';
  return new ComicDetails({title:'图片传输报告',cover:id==='control'?this.blue:c.image,description:c.report,tags:{},chapters:new Map([['1','传输测试图']])});
 }
 comic={loadInfo:id=>this.details(id),loadEp:async()=>({images:[(this.cached||{}).image||this.blue]})};
}
