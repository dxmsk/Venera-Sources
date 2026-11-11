# Venera-Sources

Venera 自定义漫画书源。当前包含巴卡漫画 `https://bakamh.com`，版本 **0.1.1 / 预览版**，要求 Venera 1.6.0 或更新版本。

## 直接安装

打开 Venera 首页 → **漫画源** → 在 **添加漫画源** 的 URL 输入框粘贴下面地址 → 点击确认：

```text
https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/bakamh.js
```

Raw 访问不畅时可用 CDN：

```text
https://cdn.jsdelivr.net/gh/dxmsk/Venera-Sources@main/bakamh.js
```

安装后在漫画源列表中找到「巴卡漫画」，进入浏览或搜索。

## 使用在线仓库列表

Venera 首页 → **漫画源** → **漫画源列表** → 修改 **仓库地址 / Repo URL** → 刷新 → 添加「巴卡漫画（预览版）」。

```text
https://raw.githubusercontent.com/dxmsk/Venera-Sources/main/index.json
```

CDN 仓库列表地址：

```text
https://cdn.jsdelivr.net/gh/dxmsk/Venera-Sources@main/index.json
```

单源输入框填 `.js`；仓库列表输入框填 `index.json`。GitHub 的 blob 展示页不是导入地址。已安装源的更新通过 JS 的 `url` 字段拉取。

## 功能

- 最新更新、热门漫画、最新上架，多页加载。
- 关键词搜索与题材分类，分类链接从网站动态获取。
- 总热度 / 周热度排行榜。
- 漫画标题、简介、封面、作者、题材、状态。
- 章节目录：优先网页目录，再尝试 Madara AJAX 目录；使用 `ul.version-chap > li` 兼容巴卡重命名章节 li 类名。
- 章节图片：懒加载原图地址、srcset、Madara chapter protector 的 MD5 派生 AES-CBC 数据。
- 图片 Referer 请求头，网站域名可在漫画源设置修改。

## Cloudflare 与登录

巴卡漫画使用 Cloudflare。加载时如果出现「需要 Cloudflare 验证」，点击 Venera 页面内的「验证」，完成后回到页面重试。源保留原生 `CloudflareException`，并对返回 HTML 验证页做补充识别。

源设置中的「打开网站」调用外部浏览器，仅用于查看网站。外部浏览器的验证 Cookie 不会自动同步到 Venera，应使用 App 页面内的验证按钮。

当前源未实现站点账户登录与付费章节解锁。网站返回登录提示或受限章节提示时原样显示，不把受限页面当作漫画图片。

## 验证状态

2026-11-11：

- 对照 Venera 官方模板与客户端源代码检查导入格式、DOM API、请求 API、AES API 和 Cloudflare 错误处理。
- `node --check bakamh.js` 通过。
- 8 组离线合成样本验证通过：列表去重/封面、章节改名与顺序、搜索参数与分页、Cloudflare 错误、AES 图片数据、普通阅读图片、base64 protector 脚本、受限章节提示。
- 本执行环境访问目标网站首页、www 和 robots 均返回 HTTP 403 Cloudflare 验证页，未取得真实阅读页；**尚未在 Venera 实机完成搜索到阅读的全链路验证**。
- 预览版的功能列表描述已实现的解析能力，不代表目标站点实时成功率。网站接口或页面变化需要后续更新。

## 0.1.1 加载修复

- 默认使用网页 GET 加载列表与搜索，源设置可切回 AJAX 接口。
- 捕获 Venera 原生拦截器抛出的 Cloudflare 异常，将验证地址统一指向网站首页，避免内置 WebView 打开只接受 POST 的 admin-ajax 接口。
- 首页未解析到漫画时给出具体提示，避免静默空列表。
- 新增 GET 搜索分页、HTML 下一页、原生拦截器异常重定向和未知布局的回归测试，测试通过。
- 原站当前仍返回 Cloudflare 403，本次修复未获得实机成功证据。

已安装的旧版可在漫画源管理中点击更新，确认版本变为 0.1.1。出现验证提示时使用 Venera 内置验证按钮。

## 本地验证

安装 Node.js 后，在仓库目录执行：

```sh
npm ci
npm test
```

测试只访问合成样本，不请求真实漫画内容。

## 参考实现

本仓库重新实现为 Venera JavaScript 格式，站点结构与 Madara 协议参考：

- [Venera 官方配置模板](https://github.com/venera-app/venera-configs)
- [Venera 客户端](https://github.com/venera-app/venera)
- [Keiyoushi Bakamh](https://github.com/keiyoushi/extensions-source/tree/main/src/zh/bakamh)
- [Keiyoushi Madara](https://github.com/keiyoushi/extensions-source/tree/main/lib-multisrc/madara)

见 [NOTICE](NOTICE) 与 [LICENSE](LICENSE)。仓库仅保存书源代码，不存储站点漫画图片。
