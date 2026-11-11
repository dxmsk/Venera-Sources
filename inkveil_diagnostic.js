// Diagnostic only: no site requests, settings, account, init, or external images.
class InkveilDiagnostic extends ComicSource {
    name = 'Inkveil 本地诊断';
    key = 'dxmsk_inkveil_diagnostic';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_diagnostic.js';

    pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';

    result() {
        return {
            comics: [new Comic({
                id: 'local-test',
                title: '诊断成功：JS 首页已执行',
                subTitle: '本卡片完全在本地生成，不访问巴卡或 Cloudflare。',
                cover: this.pixel,
                description: '仅用于检查 Inkveil 配置导入及首页展示，不是真实漫画。'
            })],
            maxPage: 1
        };
    }

    explore = [{
        title: '本地测试',
        type: 'multiPageComicList',
        load: async (page) => this.result()
    }];

    search = { load: async (keyword, options, page) => this.result() };

    comic = {
        loadInfo: async (id) => new ComicDetails({
            title: '诊断成功：详情已执行',
            cover: this.pixel,
            description: '本地诊断页面，没有网站请求。',
            chapters: new Map([['local-page', '本地图片测试']]),
            tags: {}
        }),
        loadEp: async (comicId, epId) => ({ images: [this.pixel] })
    };
}
