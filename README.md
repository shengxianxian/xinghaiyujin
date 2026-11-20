# VOID RUNNER：星海余烬

一个基于 Canvas 的深空生存射击游戏。驾驶回收船躲避不断增强的敌群、收集能量、组合武器与跟班；歌曲怪物会带着真实歌曲片段进入战场，击破它就能听到约 20 秒的歌曲片段。

## 游戏介绍

你是被困在第 09 星区的回收船驾驶员。敌群会随着波次增强，精英舰、陨石雨和歌曲怪物会轮番出现。通过移动、瞄准和射击坚持更久，收集经验并选择强化，挑战更高分数。

达到 30,000 分后只记录庆祝资格，不会立即打断战斗；如果之后阵亡，且本局曾达到 30,000 分，会出现“庆祝萧炎双帝之战”和“再玩一局”。未达到 30,000 分阵亡时只显示“再玩一局”。达到 150,000 分时立即显示“恭喜你，你已通关”，可选择继续当前分数、观看庆祝视频或再来一局。选择继续后若阵亡，会再次提供庆祝视频或再玩一局；观看视频后可再来一局。

## 操作与系统

- **移动**：键盘 `WASD` 或方向键。
- **瞄准 / 射击**：移动鼠标瞄准，按住鼠标左键持续射击。
- **冲刺**：按 `Shift`，或在触屏界面点击冲刺按钮。
- **暂停**：按 `Esc`，也可以点击右上角暂停按钮。
- **升级**：拾取经验或击败敌人获得经验。升级需求按等级阶梯翻倍增长；每次升级从三项强化中选择一项。
- **武器**：初始脉冲炮，可解锁星火散射和相位穿透；还有攻击无人机、守卫蜂、护盾、冻结、爆炸、连锁和磁暴等能力。
- **敌人伤害**：敌人碰撞伤害为 15，敌方弹幕伤害为 13.5，均为原伤害的 1.5 倍。
- **回血**：地图上的绿色能量球恢复 5 点船体。回血道具约每 11 至 19 秒生成一次，平均间隔约为原来的两倍。
- **歌曲怪物**：歌曲怪物同时最多 8 只，仍可多只同时出现。击破后立即播放对应片段；击破新的歌曲怪物会中断当前歌曲并切换到新歌曲。
- **移动设备**：左下虚拟摇杆移动，右侧按钮持续开火，上方按钮冲刺。

## 歌曲目录

默认背景音乐为《We Never》- 耳朵驿站。以下歌曲可由歌曲怪物触发：

1. 《越来越不懂》- 蔡健雅
2. 《虚拟》- 陈粒
3. 《心墙》- 郭静
4. 《我怀念的》- 孙燕姿
5. 《如果呢》- 郑润泽
6. 《如果可以》- 韦礼安
7. 《恋人》- 李荣浩
8. 《不值得》- 梦飞船
9. 《Letting Go》- 蔡健雅
10. 《你是我的风景》- 何洁
11. 《偏爱》- 张芸京
12. 《兰亭序》- 周杰伦
13. 《只对你有感觉》- 飞轮海 & 田馥甄
14. 《告白气球》- 周杰伦
15. 《如果爱忘了》- 汪苏泷 & 单依纯
16. 《我走后》- 小咪
17. 《日不落》- 蔡依林
18. 《晴天》- 周杰伦
19. 《海屿你》- 林希泽
20. 《爱情讯息》- 郭静
21. 《爱错》- 王力宏
22. 《甲乙丙丁（你我怎么两清）》- 李佳薇
23. 《瞬》- 郑润泽
24. 《天龙八部之宿敌》- 许嵩
25. 《离开我的依赖》- 王艳薇
26. 《稻香》- 周杰伦
27. 《第57次取消发送》- 菲菲公主（陆绮菲）
28. 《红尘客栈》- 周杰伦
29. 《花海》- 周杰伦
30. 《说了再见》- 周杰伦
31. 《隔岸》- 可楼
32. 《雨爱》- 杨丞琳
33. 《青花瓷》- 周杰伦

## 本地启动

这是一个纯静态项目，不需要构建工具或后端。建议通过本地 HTTP 服务器打开，以确保音频、视频和模块资源正常加载。

项目也包含 Cloudflare Workers Static Assets 配置。它不需要 Vite 构建，`npm run build` 会把游戏需要的文件复制到 `public/`，`wrangler.toml` 只部署这个网站输出目录，不会上传 `node_modules`、Wrangler 缓存或开发文件。

### 使用 Python

```bash
cd void-runner-github
python -m http.server 4173
```

然后访问 <http://localhost:4173/>。

视频兼容性排查页：启动本地服务器后访问 `/video-test.html`。该页面只加载原生 video 元素，可查看 `videoWidth`、`videoHeight`、`readyState`、`networkState`、`currentSrc` 和媒体错误信息。结算实际播放源为 Baseline H.264 + AAC、`yuv420p`、MP4 faststart 版本。

### 使用 Node.js

```bash
npx serve .
```

### 使用 Cloudflare Workers

在本项目根目录执行：

```bash
npm install
npm run build
npm run preview
npm run deploy
```

Cloudflare Pages/Workers CI 建议填写：

- **Build command**：`npm run build`
- **Deploy command**：`npx wrangler deploy`
- **Root directory**：`void-runner-github` 项目根目录

部署前请确认当前目录是包含 `package.json`、`wrangler.toml`、`index.html`、`css/`、`js/` 和 `assets/` 的 `void-runner-github` 根目录，不要把 `outputs` 父目录或只包含 `index.html` 的目录作为部署目录。Worker 名称已经统一为 `xinghaiyujin`。

也可以直接双击 `index.html` 打开，但部分浏览器会限制本地文件的音频自动播放。

## GitHub Pages 部署

1. 将整个项目目录上传到 GitHub 仓库根目录。
2. 打开仓库的 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. 选择 `main` 分支和 `/ (root)` 目录并保存。
5. 等待 GitHub Pages 发布完成，使用页面提供的链接访问游戏。

项目使用相对路径引用资源，因此可以直接部署在 GitHub Pages 的仓库子路径下。

## 目录结构

```text
void-runner-github/
├─ index.html                 # 游戏入口页面
├─ video-test.html            # 独立结算视频解码测试页
├─ public/                    # npm run build 生成的 Cloudflare 静态资源目录
├─ scripts/
│  └─ build.mjs               # 只复制网站文件的构建脚本
├─ css/
│  └─ style.css               # 页面和 HUD 样式
├─ js/
│  └─ game.js                 # 游戏逻辑、渲染和输入
├─ assets/
│  ├─ audio/
│  │  ├─ we-never.mp3         # 默认背景音乐
│  │  ├─ music-monsters/      # 第一批歌曲怪物片段
│  │  └─ music-monsters-new/  # 后续歌曲怪物片段
│  └─ video/
│     ├─ xiaoyan-compatible.mp4  # Baseline H.264 页面播放源
│     ├─ xiaoyan-h264.mp4        # High Profile H.264 转换备份
│     └─ xiaoyan.mp4             # 原始 HEVC 视频备份，不作为页面播放源
├─ .gitignore
├─ LICENSE
└─ README.md
```

## 开源协议

本项目代码采用 MIT License，详见 [LICENSE](LICENSE)。

游戏中使用的音乐和视频素材仅用于个人项目展示和本地游玩。请确认你拥有相关素材的使用权后，再将媒体文件公开发布到仓库或其他平台。

