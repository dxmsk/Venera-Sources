# Venera-Sources

Venera 自定义漫画书源。当前包含巴卡漫画 `https://bakamh.com`，版本 **0.1.8 / 预览版**，要求 Venera 1.6.0 或更新版本。

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

0.1.4 增加两个手动入口：

1. 在巴卡的浏览分页中选择「网站验证」，页面专门提供 Venera 原生「验证」按钮。完成后切换回「最新更新」；此验证页本身始终显示验证入口。
2. 如果错误页没有验证按钮，进入漫画源管理 → 巴卡漫画的账户/登录页面 →「通过网页登录」。这会直接打开 Venera 内置 WebView，正常网站标题出现后 App 保存 Cookie 并关闭窗口。可以在网页内自行登录；未实现账号密码接口或付费章节解锁。

第二个入口复用的是 Venera 的网页登录流程，不能保证与原生 Cloudflare 流程相同的 User-Agent 保存行为。若仍验证循环，需要结合设备端错误与版本定位。新增入口和标题判断已通过代码测试，尚未在设备端确认。

网站返回登录提示或受限章节提示时原样显示，不把受限页面当作漫画图片。

## 验证状态

2026-11-11：

- 对照 Venera 官方模板与客户端源代码检查导入格式、DOM API、请求 API、AES API 和 Cloudflare 错误处理。
- `node --check bakamh.js` 通过。
- 8 组离线合成样本验证通过：列表去重/封面、章节改名与顺序、搜索参数与分页、Cloudflare 错误、AES 图片数据、普通阅读图片、base64 protector 脚本、受限章节提示。
- 0.1.0–0.1.2 时未取得真实阅读页。0.1.3 使用用户已通过验证的会话，调用书源原函数实测：最新列表25本、第二页25本、总榜25本、搜索1条、中文连载分类18本；《醉后关系》详情20话，第1话30张图；前三张原图均返回200 image/webp。
- 浏览器会话的 Cookie 仅用于本地调试，没有写入书源或仓库。网络桥复用真实会话，DOM适配层使用linkedom；**尚未在 Venera App 实机完成验证到阅读的全流程**。
- 预览版的功能列表描述已实现的解析能力，不代表目标站点实时成功率。网站接口或页面变化需要后续更新。

## 0.1.6 Inkveil 验证后加载修复

用户确认0.1.5能弹出验证，但返回后仍无法加载。0.1.5恢复的宽泛HTML判断会将含Cloudflare被动jsd脚本的正常200网页再次当成挑战页。现在仅对挑战标题或403挑战响应触发HTML补充验证；保留0.1.5原生Network异常原样透传，不捕获、不重写原异常。

新增验证后正常首页/列表放行与原生异常对象身份保留测试。离线回归通过；用此前保存的真实页面复测，首页36条、搜索1条、目录20话、首话30图、分类9项。此为保存页面回放，不代表本次新网络测试或Inkveil设备端验证。

验证完成后切到「最新更新」；「网站验证」页是固定验证入口，会始终显示提示。现有Cookie保留，无需删除源重新安装。

## 0.1.5 Inkveil 1.0 验证触发回归

用户确认 Inkveil 使用 1.0 版本时可以弹出验证。0.1.5 恢复 0.1.0 的原生 `Network.get/post` 异常透传路径：移除异常捕获和异常地址重写，恢复旧版 Cloudflare HTML 触发条件。保留 0.1.3 已通过真实会话验证的搜索卡片、分类导航、列表、目录和图片解析。

0.1.5 的目标是恢复 Inkveil 识别验证的触发行为；设备端仍需更新后实测。

## 0.1.3 真实页面调试

- 修正 Cloudflare 误判：正常200页面同样会插入 `/cdn-cgi/challenge-platform/scripts/jsd/main.js`，不能仅因包含 `challenge-platform` 就要求重新验证。现在匹配真实挑战页标题，403响应再检查挑战脚本。
- 新搜索页使用 `article.mkjp-sr__item` / `.mkjp-sr__title a`，已适配；搜索使用实测有效的GET路由。
- 首页没有题材链接，分类改为提取真实导航：连载、中文/BL/英文连载、完结与新作，共9项。
- 网页浏览不再请求实测返回错误的 `/manga/`，分类使用真实页面路径，修正百分号编码被重复编码问题。
- 最新/分页/排行继续使用实测成功的AJAX接口，首页验证路径保留。
- 新增正常CF脚本、真实挑战标题、新搜索卡片与导航路由测试。真实网络结果见上方验证状态。

## 0.1.2 验证入口回归修复

用户反馈 0.1.0 出现验证入口、0.1.1 不再出现。恢复 AJAX 为默认模式，并使用新的设置键，避免继续沿用 0.1.1 的 GET 默认设置。首屏先访问网站首页，让原生 Cloudflare 异常交给 Venera 的验证组件；验证地址仍统一为网站首页。GET 模式保留为手动选项。

新增首屏首页请求、原生首页挑战异常、默认 AJAX 顺序测试。离线回归通过；尚待用户实机确认验证入口及阅读是否恢复。

## 0.1.1 加载修复

- 默认使用网页 GET 加载列表与搜索，源设置可切回 AJAX 接口。
- 捕获 Venera 原生拦截器抛出的 Cloudflare 异常，将验证地址统一指向网站首页，避免内置 WebView 打开只接受 POST 的 admin-ajax 接口。
- 首页未解析到漫画时给出具体提示，避免静默空列表。
- 新增 GET 搜索分页、HTML 下一页、原生拦截器异常重定向和未知布局的回归测试，测试通过。
- 原站当前仍返回 Cloudflare 403，本次修复未获得实机成功证据。

已安装的旧版可在漫画源管理中点击更新，确认版本变为 0.1.1。出现验证提示时使用 Venera 内置验证按钮。

## 0.1.7 首页内容修复

把「网站验证」从首页首项移到最后，恢复 Inkveil 打开源时第一项直接显示「最新更新」。验证完成后从「最新更新」加载内容；「网站验证」仅作为手动验证入口。

## 0.1.8 Inkveil 首页直连修复

用户反馈 0.1.7 验证后仍显示首页暂无书库内容。移除首页首屏的额外 `GET /` 预请求，恢复 0.1.0 的首屏直连 `POST /wp-admin/admin-ajax.php`；同时移除「网站验证」explore 分页，防止 Inkveil 把验证页当作源首页。验证入口改由加载异常原生触发，验证完成后首页只返回三项真实内容页：最新更新、热门漫画、最新上架。

新增首屏首请求为 AJAX、首页三项顺序和 AJAX 原生异常透传测试。离线回归通过。

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
