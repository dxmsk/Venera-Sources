// Offline compatibility test for Inkveil 2.0.0(33).
// No network, account, settings, DOM, cookies, or image hooks.
class InkveilChapterCompat extends ComicSource {
    name = 'Inkveil 章节格式对照';
    key = 'dxmsk_inkveil_chapter_compat';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_chapter_compat.js';
    image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAIAAAB8wupbAAAAGklEQVR4nGOQyLtDEmIY1TCqYVTDqAbaagAAyfYTH/97m8wAAAAASUVORK5CYII=';
    groups = [
        ['safe', 'A：短 ID · Map · 91章'],
        ['path', 'B：路径 ID · Map · 91章'],
        ['object', 'C：短 ID · 对象 · 91章']
    ];
    result() {
        return {comics:this.groups.map(x=>new Comic({id:x[0],title:x[1],cover:this.image,subTitle:'离线测试：封面应为蓝色，章节应显示91条，点阅读应显示蓝色图片。'})),maxPage:1};
    }
    explore = [{title:'章节格式',type:'multiPageComicList',load:async()=>this.result()}];
    search = {load:async()=>this.result()};
    details(id) {
        const chapters = id === 'object' ? {} : new Map();
        for(let i=1;i<=91;i++) {
            const key = id === 'path' ? '/manga/%e6%b5%8b%e8%af%95/c-'+i+'/' : String(i);
            const title = '第'+i+'话（离线蓝色测试图）';
            if(id === 'object') chapters[key] = title;
            else chapters.set(key,title);
        }
        return new ComicDetails({title:this.groups.find(x=>x[0]===id)?.[1]||'未知组',cover:this.image,
            description:'此源不连接网站。\nA/B 仅章节ID不同：数字 vs 带斜杠路径。\nA/C 仅目录容器不同：Map vs 普通对象。\n应显示91个章节。点击第1章或开始阅读，应显示蓝色图片。',chapters,tags:{}});
    }
    comic = {
        loadInfo:async id=>this.details(id),
        loadEp:async(comicId,epId)=>({images:[this.image]})
    };
}
