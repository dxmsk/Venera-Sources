// Homepage is local. Only opening a network test card contacts bakamh.com.
class InkveilProbe extends ComicSource {
    name = '巴卡分步诊断';
    key = 'dxmsk_inkveil_probe';
    version = '0.0.1';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/inkveil_probe.js';
    pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';
    tests = [
        ['dom', '1：本地 HTML 解析', '不联网，检查 HtmlDocument、元素属性和 dispose。'],
        ['get', '2：首页 GET', '点开后请求巴卡首页，检查状态和返回类型。'],
        ['post', '3：列表 POST', '点开后请求巴卡列表接口，不调用 HTML 解析器。']
    ];
    result() {
        return { comics: this.tests.map(t => new Comic({ id: t[0], title: t[1], subTitle: t[2], cover: this.pixel })), maxPage: 1 };
    }
    explore = [{ title: '分步测试', type: 'multiPageComicList', load: async () => this.result() }];
    search = { load: async () => this.result() };
    form(values) { return Object.keys(values).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(values[k])).join('&'); }
    async test(id) {
        if (id === 'dom') {
            let doc;
            try {
                doc = new HtmlDocument('<div class="page-item-detail"><div class="post-title"><a href="/manga/test/">本地标题</a></div><img data-src="https://example.invalid/image.webp"></div>');
                const cards = doc.querySelectorAll('div.page-item-detail, .manga__item, .c-tabs-item__content, article.mkjp-sr__item');
                const a = cards[0].querySelector('.post-title a, .mkjp-sr__title a');
                const report = '卡片数量：' + cards.length + '\n标题：' + a.text + '\n链接：' + a.attributes.href + '\n图片：' + cards[0].querySelector('img').attributes['data-src'];
                doc.dispose(); doc = null;
                return report + '\ndispose：完成';
            } finally { if (doc) doc.dispose(); }
        }
        let response;
        const headers = { Referer: 'https://bakamh.com/', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7' };
        if (id === 'get') response = await Network.get('https://bakamh.com/', headers);
        else if (id === 'post') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            headers['X-Requested-With'] = 'XMLHttpRequest';
            response = await Network.post('https://bakamh.com/wp-admin/admin-ajax.php', headers, this.form({
                action: 'madara_load_more', page: '0', template: 'madara-core/content/content-archive',
                'vars[paged]': '1', 'vars[template]': 'archive', 'vars[posts_per_page]': '25',
                'vars[post_type]': 'wp-manga', 'vars[post_status]': 'publish',
                'vars[manga_archives_item_layout]': 'big_thumbnail', 'vars[orderby]': 'meta_value_num',
                'vars[meta_key]': '_latest_update', 'vars[order]': 'DESC'
            }));
        } else throw '未知测试';
        if (response == null) return 'Network 返回空对象';
        const body = response.body;
        let report = 'status：' + response.status + '\nbody 类型：' + typeof body;
        if (typeof body === 'string') {
            const title = body.match(/<title[^>]*>([^<]*)<\/title>/i);
            report += '\n字符数：' + body.length + '\n网页标题：' + (title ? title[1].slice(0,160) : '无');
            report += '\n列表标记数（文本检查）：' + (body.match(/class=["'][^"']*\bpage-item-detail\b/g) || []).length;
            report += '\n含 CF 被动脚本：' + /challenge-platform\/scripts\/jsd/.test(body);
        }
        return report;
    }
    comic = {
        loadInfo: async id => {
            const entry = this.tests.find(t => t[0] === id);
            const started = Date.now();
            // Native CF errors must propagate unchanged to the host UI.
            const report = await this.test(id);
            return new ComicDetails({ title: entry ? entry[1] : '诊断', cover: this.pixel,
                description: '测试已返回，用时 ' + (Date.now()-started) + ' ms\n' + report,
                chapters: new Map(), tags: {} });
        },
        loadEp: async () => ({ images: [this.pixel] })
    };
}
