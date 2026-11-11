// One target only. Network happens in explore.load, never in comic.loadInfo.
class InkveilPreloadProbe extends ComicSource {
    name = '巴卡书库预加载对照';
    key = 'dxmsk_baka_preload_probe';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_preload_probe.js';
    image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAIAAAB8wupbAAAAGklEQVR4nGOQyLtDEmIY1TCqYVTDqAbaagAAyfYTH/97m8wAAAAASUVORK5CYII=';
    target = 'https://bakamh.com/manga/%e9%ad%94%e6%b3%95%e5%b0%91%e5%a5%b3%e9%9c%b2%e7%be%8e%e5%a8%9c/';
    cached = null;
    async preload() {
        const res = await Network.get(this.target, {Referer:'https://bakamh.com/'});
        if (res.status !== 200) throw '详情 HTTP ' + res.status;
        const doc = new HtmlDocument(String(res.body || ''));
        let entries;
        try {
            entries = doc.querySelectorAll('ul.version-chap > li a,li.wp-manga-chapter a').slice().reverse().map(a => [String(a.attributes.href || '').replace(/^https?:\/\/[^/]+/i,''),a.text.trim()]).filter(e => e[0] && e[1]);
        } finally { doc.dispose(); }
        if (!entries.length) throw '预加载没有取得目录，未返回测试卡片。';
        // Plain JSON cache can be recovered if Inkveil recreates the JS instance.
        const record = {entries, fetchedAt:Date.now()};
        this.cached = record;
        if (typeof this.saveData === 'function') this.saveData('preloadedDirectory', record);
        return {comics:[new Comic({id:'preloaded',title:'H：书库预加载完成',cover:this.image,subTitle:'已取得 '+entries.length+' 章；详情和阅读不发网络请求。'})],maxPage:1};
    }
    explore = [{title:'预加载测试',type:'multiPageComicList',load:async()=>this.preload()}];
    // Synchronous: deliberately no async/await, DOM, cookies or network here.
    details() {
        let record = this.cached;
        if (!record && typeof this.loadData === 'function') record = this.loadData('preloadedDirectory');
        if (!record || !Array.isArray(record.entries) || !record.entries.length) throw '预加载缓存未取到。请返回书库刷新后再点卡片。';
        return new ComicDetails({title:'H：详情只读预加载目录',cover:this.image,tags:{},description:'目录在书库加载阶段取得。当前详情没有网络请求。阅读仅显示蓝色测试图片，并非漫画。',chapters:new Map(record.entries)});
    }
    comic = {loadInfo:id=>this.details(),loadEp:async()=>({images:[this.image]})};
}
