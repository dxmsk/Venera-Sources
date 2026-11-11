/** 巴卡漫画 / Venera. See README.md for verification status and upstream references. */
class Bakamh extends ComicSource {
    name = '巴卡漫画';
    key = 'bakamh';
    version = '0.1.12';
    minAppVersion = '1.6.0';
    url = 'https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/bakamh.js';
    settings = {
        domain: { title: '网站域名', type: 'input', default: 'https://bakamh.com' },
        inkveilTransport: { title: '列表加载方式', type: 'select', options: [{ value: 'html', text: '网页 GET（默认）' }, { value: 'ajax', text: 'AJAX POST（兼容选项）' }], default: 'html' },
        website: { title: '在浏览器查看网站（不共享验证 Cookie）', type: 'callback', buttonText: '打开网站', callback: () => UI.launchUrl(this.base) }
    };
    // Venera exposes embedded WebView through the account configuration.
    // A real homepage title is required; challenge/error titles are rejected.
    account = {
        loginWithWebview: {
            url: 'https://bakamh.com/',
            checkStatus: (url, title) => /^https:\/\/(?:www\.)?bakamh\.com(?:\/|$)/i.test(url) && /巴卡漫画/.test(title) && !/Just a moment|Attention Required|验证|verification|502|403/i.test(title)
        },
        logout: () => {}
    };
    get base() { return (this.loadSetting('domain') || 'https://bakamh.com').trim().replace(/\/+$/, ''); }
    absolute(value, relative = this.base + '/') {
        value = String(value || '').trim().replace(/&amp;/g, '&');
        if (!value || /^(?:data|javascript):/i.test(value)) return '';
        if (/^https?:\/\//i.test(value)) return value;
        if (value.startsWith('//')) return 'https:' + value;
        if (value.startsWith('/')) return this.base + value;
        return relative.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + value;
    }
    path(value) {
        return String(value).replace(/^https?:\/\/[^/]+/i, '').split('#')[0];
    }
    headers(referer = this.base + '/') {
        return { 'Referer': referer, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.7' };
    }
    async sessionHeaders(url, referer = this.base + '/') {
        const headers = this.headers(referer);
        // Only read cookies for the exact destination URL. Never copy site
        // login/clearance cookies to a third-party image host.
        if (typeof Network.getCookies === 'function') {
            const cookies = await Network.getCookies(url);
            if (Array.isArray(cookies)) {
                const value = cookies.filter(c => c && c.name && c.value != null).map(c => c.name + '=' + c.value).join('; ');
                if (value) headers.Cookie = value;
            }
        }
        return headers;
    }
    form(values) { return Object.keys(values).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(values[k])).join('&'); }
    async request(path, values = null, referer = null) {
        const url = this.absolute(path);
        const headers = await this.sessionHeaders(url, referer || this.base + '/');
        let res;
        // Keep this path identical to the 0.1.0 trigger path. Inkveil
        // recognizes the native CloudflareException thrown by Network itself;
        // catching and rewriting it prevents its verification UI from opening.
        if (values === null) res = await Network.get(url, headers);
        else {
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            headers['X-Requested-With'] = 'XMLHttpRequest';
            res = await Network.post(url, headers, this.form(values));
        }
        // Let Inkveil's native interceptor be the sole Cloudflare detector.
        // A passed page still contains Cloudflare's passive jsd script; parsing
        // response HTML here causes the post-verify retry to spin forever.
        if (res.status !== 200) throw '巴卡漫画 HTTP ' + res.status;
        return String(res.body || '');
    }
    image(element) {
        if (!element) return '';
        const a = element.attributes;
        for (const key of ['data-src', 'data-lazy-src', 'data-lzl-src', 'data-cfsrc', 'data-manga-src']) {
            if (a[key] && !a[key].trim().startsWith('data:')) return this.absolute(a[key]);
        }
        if (a.srcset) {
            const entries = a.srcset.split(',').map(s => s.trim().split(/\s+/));
            entries.sort((x, y) => (parseFloat(y[1]) || 0) - (parseFloat(x[1]) || 0));
            if (entries.length) return this.absolute(entries[0][0]);
        }
        return this.absolute(a.src);
    }
    parseList(html) {
        const doc = new HtmlDocument(html);
        try {
            const seen = new Set(), comics = [];
            for (const card of doc.querySelectorAll('div.page-item-detail, .manga__item, .c-tabs-item__content, article.mkjp-sr__item')) {
                const a = card.querySelector('.post-title a, .mkjp-sr__title a');
                if (!a) continue;
                const id = this.path(a.attributes.href || '');
                const title = a.text.trim();
                if (!id || !title || seen.has(id)) continue;
                seen.add(id);
                comics.push(new Comic({ id, title, cover: this.image(card.querySelector('img')), subTitle: card.querySelector('.chapter, .list-chapter')?.text?.trim() || '' }));
            }
            return comics;
        } finally { doc.dispose(); }
    }
    async list(page = 1, order = 'latest', keyword = '', genre = '') {
        // Device probe: homepage GET completed, while POST produced no report.
        // Default to GET and ignore the old saved listMode setting.
        if (!keyword && !genre.startsWith('/') && this.loadSetting('inkveilTransport') === 'ajax') return this.ajaxList(page, order, keyword, genre);
        let path = keyword ? '/' : genre ? (genre.startsWith('/') ? genre : '/manga-genre/' + genre + '/') : '/';
        if (page > 1) path += 'page/' + page + '/';
        const params = keyword ? { s: keyword, post_type: 'wp-manga' } : null;
        const target = params ? path + '?' + this.form(params) : path;
        const html = await this.request(target);
        const comics = this.parseList(html);
        const doc = new HtmlDocument(html);
        try {
            const hasNext = !!doc.querySelector('a.nextpostslink, .nav-previous a, a.next.page-numbers, #navigation-ajax');
            if (!comics.length && page === 1 && !keyword) throw '未解析到漫画列表。请完成站内验证；若网站已正常显示，可在源设置切换为 AJAX 接口后重试。';
            return { comics, maxPage: hasNext && comics.length ? page + 1 : page };
        } finally { doc.dispose(); }
    }
    async ajaxList(page = 1, order = 'latest', keyword = '', genre = '') {
        const fields = {
            action: 'madara_load_more', page: String(page - 1),
            template: 'madara-core/content/content-archive',
            'vars[paged]': '1', 'vars[template]': 'archive', 'vars[posts_per_page]': '25',
            'vars[post_type]': 'wp-manga', 'vars[post_status]': 'publish',
            'vars[manga_archives_item_layout]': 'big_thumbnail'
        };
        const keys = { latest: '_latest_update', views: '_wp_manga_views', trending: '_wp_manga_week_views_value' };
        if (keys[order]) {
            fields['vars[orderby]'] = 'meta_value_num'; fields['vars[meta_key]'] = keys[order]; fields['vars[order]'] = 'DESC';
        } else { fields['vars[orderby]'] = 'date'; fields['vars[order]'] = 'DESC'; }
        if (keyword) fields['vars[s]'] = keyword;
        if (genre) {
            fields['vars[tax_query][0][taxonomy]'] = 'wp-manga-genre';
            fields['vars[tax_query][0][field]'] = 'slug';
            fields['vars[tax_query][0][terms][0]'] = genre;
        }
        const comics = this.parseList(await this.request('/wp-admin/admin-ajax.php', fields));
        return { comics, maxPage: comics.length >= 25 ? page + 1 : page };
    }
    explore = [
        { title: '最新更新', type: 'multiPageComicList', load: page => this.list(page, 'latest') },
        { title: '连载漫画', type: 'multiPageComicList', load: page => this.list(page, 'latest', '', '/on-going/') },
        { title: '完结漫画', type: 'multiPageComicList', load: page => this.list(page, 'latest', '', '/end/') },
        { title: '新作', type: 'multiPageComicList', load: page => this.list(page, 'latest', '', '/newmanga/') }
    ];
    search = { load: (keyword, options, page) => this.list(page, 'latest', keyword) };
    category = {
        title: '巴卡分类', enableRankingPage: false,
        parts: [{ name: '题材', type: 'dynamic', loader: async () => {
            const doc = new HtmlDocument(await this.request('/'));
            try {
                const seen = new Set(), result = [];
                for (const a of doc.querySelectorAll('a[href]')) {
                    const path = this.path(a.attributes.href || '');
                    if (!/^\/(?:on-going|end|newmanga|manga-genre)\//.test(path)) continue;
                    const label = a.text.trim();
                    if (!label || seen.has(path)) continue;
                    seen.add(path);
                    result.push({ label, target: { page: 'category', attributes: { category: path, param: null } } });
                }
                if (!result.length) throw '网站未返回分类链接，请完成网站验证后重试。';
                return result;
            } finally { doc.dispose(); }
        } }]
    };
    categoryComics = {
        load: (category, param, options, page) => this.list(page, options?.[0] || 'latest', '', category),
        optionList: []
    };
    chaptersFrom(html, pageUrl) {
        const doc = new HtmlDocument(html);
        try {
            const result = new Map();
            // Bakamh renames li classes: use the stable parent structure.
            const links = doc.querySelectorAll('ul.version-chap > li a, li.wp-manga-chapter a');
            for (const a of links.slice().reverse()) {
                const href = this.absolute(a.attributes.href, pageUrl);
                const title = a.text.trim();
                if (href && title && !/[?&]replytocom=/.test(href)) result.set(this.path(href), title);
            }
            return result;
        } finally { doc.dispose(); }
    }
    async info(id) {
        const pageUrl = this.absolute(id);
        const html = await this.request(id);
        const doc = new HtmlDocument(html);
        let details, postId;
        try {
            const text = selector => doc.querySelector(selector)?.text?.trim() || '';
            const tags = {};
            for (const [label, selector] of [['题材', '.genres-content a'], ['标签', '.tags-content a'], ['作者', '.author-content a']]) {
                const values = doc.querySelectorAll(selector).map(e => e.text.trim()).filter(Boolean);
                if (values.length) tags[label] = values;
            }
            for (const row of doc.querySelectorAll('.post-content_item')) {
                if (/状态|狀態|Status/i.test(row.querySelector('.summary-heading')?.text || '')) {
                    const status = row.querySelector('.summary-content')?.text?.trim();
                    if (status) tags['状态'] = [status];
                }
            }
            postId = doc.querySelector('[data-post-id]')?.attributes['data-post-id'] || doc.querySelector('[data-id]')?.attributes['data-id'];
            details = {
                title: text('div.post-title h1, div.post-title h3, #manga-title > h1'),
                cover: this.image(doc.querySelector('div.summary_image img')),
                description: text('.description-summary .summary__content, .summary_content .manga-excerpt'),
                tags, url: pageUrl
            };
        } finally { doc.dispose(); }
        if (!details.title) throw '未识别漫画详情页，请检查网站验证状态或反馈页面地址。';
        // The detail page already contains the complete current chapter list.
        // Avoid an extra AJAX request after Inkveil has just passed CF.
        const chapters = this.chaptersFrom(html, pageUrl);
        if (!chapters.size) throw '网站返回空目录；该漫画可能需要登录，或目录接口已变化。';
        return new ComicDetails({ ...details, chapters });
    }
    decryptProtector(script) {
        const nonce = script.match(/wpmangaprotectornonce\s*=\s*['"]([^'"]+)['"]/);
        const encrypted = script.match(/chapter_data\s*=\s*'([^']+)'/);
        if (!nonce || !encrypted) throw '未识别章节加密数据。';
        const obj = JSON.parse(encrypted[1].replace(/\\\//g, '/'));
        const saltHex = obj.s || obj.salt;
        if (!saltHex || !/^(?:[a-f\d]{2})+$/i.test(saltHex)) throw '章节加密 salt 无效。';
        const salt = Uint8Array.from(saltHex.match(/../g).map(x => parseInt(x, 16)));
        const password = new Uint8Array(Convert.encodeUtf8(nonce[1]));
        const concat = arrays => {
            const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
            let offset = 0;
            for (const a of arrays) { out.set(a, offset); offset += a.length; }
            return out;
        };
        let previous = new Uint8Array(0), keyBytes = new Uint8Array(0);
        while (keyBytes.length < 48) {
            previous = new Uint8Array(Convert.md5(concat([previous, password, salt]).buffer));
            keyBytes = concat([keyBytes, previous]);
        }
        const raw = Convert.decodeUtf8(Convert.decryptAesCbc(Convert.decodeBase64(obj.ct || obj.ciphertext), keyBytes.slice(0, 32).buffer, keyBytes.slice(32, 48).buffer));
        let images = JSON.parse(raw.replace(/[\x01-\x10]+$/, ''));
        if (typeof images === 'string') images = JSON.parse(images);
        if (!Array.isArray(images) || images.some(x => typeof x !== 'string')) throw '章节图片数据格式异常。';
        return images;
    }
    async episode(comicId, epId) {
        if (!epId) throw '请选择章节。';
        const chapterUrl = this.absolute(epId);
        const html = await this.request(chapterUrl + (chapterUrl.includes('?') ? '&' : '?') + 'style=list');
        const doc = new HtmlDocument(html);
        try {
            const locked = doc.querySelector('.mkjp-ea-lock__title, .mkjp-tool-warning');
            if (locked) throw locked.text.trim();
            let images;
            const protector = doc.querySelector('#chapter-protector-data');
            if (protector) {
                const src = protector.attributes.src || '';
                const script = src.startsWith('data:text/javascript;base64,') ? Convert.decodeUtf8(Convert.decodeBase64(src.split(',')[1])) : protector.innerHTML;
                images = this.decryptProtector(script);
            } else {
                images = doc.querySelectorAll('.reading-content .page-break img, .reading-content > .text-left img, .reading-content .blocks-gallery-item img').map(e => this.image(e)).filter(Boolean);
            }
            images = images.map(x => this.absolute(x, chapterUrl)).filter(Boolean);
            if (!images.length) throw '章节未返回图片；请在网站中检查该章节是否要求登录。';
            return { images };
        } finally { doc.dispose(); }
    }
    comic = {
        loadInfo: id => this.info(id),
        loadEp: (comicId, epId) => this.episode(comicId, epId),
        onImageLoad: async (url, comicId, epId) => ({ url: this.absolute(url), headers: await this.sessionHeaders(this.absolute(url), this.absolute(epId || comicId)) }),
        onThumbnailLoad: async url => ({ url: this.absolute(url), headers: await this.sessionHeaders(this.absolute(url)) })
    };
}
