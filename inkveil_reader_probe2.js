// Inkveil detail-stage isolation probe. Network runs only after opening a card.
class InkveilReaderProbe2 extends ComicSource {
    name = '巴卡详情分步诊断';
    key = 'dxmsk_inkveil_probe2';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_reader_probe2.js';
    pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';
    tests = [['raw','1：只测 Network GET'],['local','2：只测本地 DOM'],['real','3：首页 GET 加 DOM']];
    result() { return { comics: this.tests.map(t => new Comic({id:t[0],title:t[1],subTitle:'点开后查看结果',cover:this.pixel})),maxPage:1 }; }
    explore = [{title:'详情分步',type:'multiPageComicList',load:async()=>this.result()}];
    headers() { return {Referer:'https://bakamh.com/','Accept-Language':'zh-CN,zh;q=0.9,en;q=0.7'}; }
    async run(id) {
        if (id === 'raw') {
            const r = await Network.get('https://bakamh.com/', this.headers());
            return 'Network GET 完成\nstatus：' + r.status + '\nbody：' + typeof r.body + '\n长度：' + String(r.body || '').length;
        }
        if (id === 'local') {
            const doc = new HtmlDocument('<div class="page-item-detail"><div class="post-title"><a href="/manga/test/">本地标题</a></div></div>');
            const card = doc.querySelector('div.page-item-detail');
            const a = card.querySelector('.post-title a');
            const title = a.text;
            const href = a.attributes.href;
            doc.dispose();
            return '本地 DOM 完成\n标题：' + title + '\n链接：' + href;
        }
        const r = await Network.get('https://bakamh.com/', this.headers());
        const body = String(r.body || '');
        const doc = new HtmlDocument(body);
        const cards = doc.querySelectorAll('div.page-item-detail');
        const card = cards.length ? cards[0] : null;
        const a = card ? card.querySelector('.post-title a') : null;
        const title = a ? a.text.trim() : '无';
        doc.dispose();
        return '首页 GET + DOM 完成\nstatus：' + r.status + '\n卡片：' + cards.length + '\n标题：' + title;
    }
    comic = {
        loadInfo: async id => {
            let report;
            try { report = await this.run(id); }
            catch (e) { report = '异常类型：' + typeof e + '\n异常内容：' + String(e).slice(0,300); }
            return new ComicDetails({title:'诊断结果 '+id,cover:this.pixel,description:report,tags:{},chapters:new Map()});
        },
        loadEp: async () => ({images:[this.pixel]})
    };
}
