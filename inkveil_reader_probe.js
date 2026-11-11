// Local home; requests run only after a test card is opened.
class InkveilReaderProbe extends ComicSource {
    name = '巴卡封面目录诊断';
    key = 'dxmsk_inkveil_reader_probe';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_reader_probe.js';
    pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';
    tests = [['cover','封面请求检查'],['detail','目录加载检查']];
    result() { return { comics: this.tests.map(t => new Comic({ id:t[0], title:t[1], subTitle:'点开后检查首页第一本漫画；结果在简介中，点击展开查看。', cover:this.pixel })), maxPage:1 }; }
    explore = [{ title:'封面与目录', type:'multiPageComicList', load:async()=>this.result() }];
    absolute(s) { s=String(s||'').trim().replace(/&amp;/g,'&'); if(/^https?:/.test(s))return s;if(s.startsWith('//'))return 'https:'+s;if(s.startsWith('/'))return 'https://bakamh.com'+s;return ''; }
    headers() { return {Referer:'https://bakamh.com/','Accept-Language':'zh-CN,zh;q=0.9,en;q=0.7'}; }
    async report(id) {
        const lines=[];
        let doc;
        try {
            const r=await Network.get('https://bakamh.com/',this.headers());
            lines.push('首页 HTTP '+r.status);
            if(r.status!==200)return lines.join('\n');
            doc=new HtmlDocument(String(r.body||''));
            const card=doc.querySelector('.page-item-detail');
            if(!card)return lines.concat('无漫画卡片').join('\n');
            const link=card.querySelector('.post-title a');
            const img=card.querySelector('img');
            const title=link?.text?.trim()||'';
            const href=this.absolute(link?.attributes.href);
            const attrs=img?.attributes||{};
            const cover=this.absolute(attrs['data-src']||attrs['data-lazy-src']||attrs.src);
            lines.push('漫画 '+title,'详情 '+href,'封面 '+cover);
            doc.dispose();doc=null;
            if(id==='cover') {
                if(!cover)return lines.concat('封面地址为空').join('\n');
                if(typeof Network.fetchBytes!=='function')return lines.concat('Network.fetchBytes 不存在').join('\n');
                const image=await Network.fetchBytes('GET',cover,this.headers());
                const body=image.body;
                lines.push('封面 HTTP '+image.status,'字节 '+(body?.byteLength ?? body?.length ?? '未知'));
                const headers=image.headers||{};
                lines.push('Content-Type '+String(headers['content-type']||headers['Content-Type']||'未知'));
            } else {
                if(!href)return lines.concat('详情链接为空').join('\n');
                const detail=await Network.get(href,this.headers());
                lines.push('详情 HTTP '+detail.status,'详情字符 '+String(detail.body||'').length);
                if(detail.status!==200)return lines.join('\n');
                doc=new HtmlDocument(String(detail.body||''));
                lines.push('网页标题 '+(doc.querySelector('title')?.text||''));
                lines.push('漫画标题 '+(doc.querySelector('#manga-title > h1,div.post-title h1,div.post-title h3')?.text?.trim()||'无'));
                const links=doc.querySelectorAll('ul.version-chap > li a,li.wp-manga-chapter a');
                lines.push('目录数量 '+links.length,'限制提示 '+(doc.querySelector('.mkjp-ea-lock__title,.mkjp-tool-warning')?.text?.trim()||'无'));
                const a=links[links.length-1];
                const chapter=this.absolute(a?.attributes.href);
                doc.dispose();doc=null;
                if(chapter){
                    const ch=await Network.get(chapter+'?style=list',this.headers());
                    lines.push('首话 HTTP '+ch.status);
                    if(ch.status===200){doc=new HtmlDocument(String(ch.body||''));lines.push('图片节点 '+doc.querySelectorAll('.reading-content img').length);}
                }
            }
            return lines.join('\n');
        } catch(e) {
            // Preserve native Cloudflare errors; render other errors for inspection.
            if(/cloudflare/i.test(String(e)))throw e;
            return lines.concat('异常 '+String(e).slice(0,300)).join('\n');
        } finally { if(doc)doc.dispose(); }
    }
    comic = {
        loadInfo:async id=>new ComicDetails({title:id==='cover'?'封面检查结果':'目录检查结果',cover:this.pixel,description:await this.report(id),tags:{},chapters:new Map([['local','诊断占位页（非漫画）']])}),
        loadEp:async()=>({images:[this.pixel]}),
        onThumbnailLoad:url=>({url,method:'GET',headers:this.headers()})
    };
}
