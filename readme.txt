====================================
  碎片文字记录 (Fragments)
====================================

简介
----
  一个轻量级的碎片文字记录工具，基于 Node.js 构建。
  支持记录、编辑、排序、颜色标记和回收站功能。

功能特性
--------
  - 记录碎片文字，随时捕捉灵感
  - 支持编辑和删除操作
  - 拖拽排序，灵活组织内容
  - 颜色标记，分类管理
  - 分类页签，自定义分类管理碎片
  - 回收站功能，删除后 3 天内可恢复
  - 局域网访问，多设备同步

技术栈
------
  本地版本:
  - 运行环境: Node.js
  - 服务器:   原生 http 模块 (无第三方依赖)
  - 数据存储: JSON 文件
  - 前端:     原生 HTML / CSS / JavaScript

  Vercel 版本:
  - 运行环境: Vercel Serverless Functions
  - 数据存储: Vercel KV (Redis)
  - 前端:     原生 HTML / CSS / JavaScript

快速开始 (本地)
--------------
  1. 确保已安装 Node.js
  2. 进入项目目录:

       cd fragments

  3. 启动服务:

       node server.js

  4. 打开浏览器访问:

       本地:     http://localhost:10086
       局域网:   http://<你的IP>:10086

部署到 Vercel (云端)
--------------------
  前提条件: Vercel 账号 + Vercel KV (Redis)

  1. 安装 Vercel CLI:

       npm i -g vercel

  2. 登录:

       vercel login

  3. 初始化项目:

       vercel

  4. 创建 KV 存储:

       vercel kv create fragments-data

  5. 配置环境变量 (可选，用于 AI 功能):

       vercel env add AI_API_KEY
       vercel env add AI_API_URL
       vercel env add AI_MODEL

  6. 部署:

       vercel --prod

  注意: Vercel 版本使用 Vercel KV (Redis) 替代本地 JSON 文件存储

项目结构
--------
  fragments/
  ├── server.js              # 后端服务 (本地版本)
  ├── public/
  │   └── index.html         # 前端页面
  ├── api/                   # Vercel Serverless Functions
  │   ├── fragments/
  │   │   ├── index.js       # GET/POST 碎片
  │   │   ├── [id].js        # PUT/DELETE 单个碎片
  │   │   └── reorder.js     # PUT 排序
  │   ├── categories/
  │   │   ├── index.js       # GET/POST 分类
  │   │   └── [id].js        # PUT/DELETE 分类
  │   ├── trash/
  │   │   ├── index.js       # GET/DELETE 回收站
  │   │   ├── [id].js        # DELETE 永久删除
  │   │   └── [id]/
  │   │       └── restore.js # POST 恢复
  │   └── ai.js              # AI 分析代理
  ├── lib/
  │   └── store.js           # Vercel KV 存储
  ├── data/                  # 本地数据 (本地版本)
  │   ├── fragments.json
  │   ├── categories.json
  │   └── trash.json
  ├── vercel.json            # Vercel 配置
  ├── package.json
  ├── readme.txt
  └── .gitignore

端口
----
  默认端口: 10086
  如需修改，编辑 fragments/server.js 中的 PORT 变量。

许可
----
  仅供个人使用。
