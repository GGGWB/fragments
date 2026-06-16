# 碎片文字记录 (Fragments)

一个轻量级的碎片文字记录工具，支持本地部署和 Vercel 云端部署。

## 项目结构

```
fragments/
├── server.js              # 后端服务（本地版本，Node.js 原生 http 模块）
├── public/
│   └── index.html         # 前端页面（单文件，内联 CSS/JS）
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
├── data/                  # 本地数据（本地版本）
│   ├── fragments.json
│   ├── categories.json
│   └── trash.json
├── vercel.json            # Vercel 配置
├── package.json
├── .gitignore
└── readme.txt
```

## 技术栈

### 本地版本
- **后端**: Node.js 原生 `http` + `fs` 模块，无第三方依赖
- **数据存储**: JSON 文件
- **前端**: 原生 HTML / CSS / JavaScript（单文件）

### Vercel 版本
- **后端**: Vercel Serverless Functions
- **数据存储**: Vercel KV (Redis)
- **前端**: 原生 HTML / CSS / JavaScript（单文件）

## 启动方式

### 本地版本

```bash
node server.js
```

- 本地访问: http://localhost:10086
- 局域网访问: http://<局域网IP>:10086

### Vercel 版本

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 初始化项目
vercel

# 4. 创建 KV 存储
vercel kv create fragments-data

# 5. 部署
vercel --prod
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/fragments` | 获取所有碎片 |
| POST | `/api/fragments` | 新增碎片 `{content}` |
| PUT | `/api/fragments/:id` | 编辑碎片内容或颜色 |
| PUT | `/api/fragments/reorder` | 拖拽排序 `{ids}` |
| DELETE | `/api/fragments/:id` | 删除碎片（移入回收站） |
| GET | `/api/trash` | 获取回收站 |
| POST | `/api/trash/:id/restore` | 恢复回收站条目 |
| DELETE | `/api/trash/:id` | 永久删除单条 |
| DELETE | `/api/trash` | 清空回收站 |
| GET | `/api/categories` | 获取所有分类 |
| POST | `/api/categories` | 新增分类 `{name}` |
| PUT | `/api/categories/:id` | 编辑分类名称 |
| DELETE | `/api/categories/:id` | 删除分类 |
| POST | `/api/ai` | AI 分析（Vercel 版本） |

## 功能特性

- 碎片文字记录、编辑、删除
- 拖拽排序
- 颜色标记分类
- 分类页签管理
- AI 智能分析（Vercel 版本需配置环境变量）
- 回收站（删除后 3 天内可恢复，每小时自动清理过期条目）
- 局域网多设备访问（本地版本）

## 注意事项

### 本地版本
- 端口硬编码为 `10086`，修改需编辑 `server.js` 中的 `PORT` 变量
- `data/` 目录下的 JSON 文件是运行时数据，已加入 `.gitignore`

### Vercel 版本
- 需要创建 Vercel KV 存储
- AI 功能需配置环境变量: `AI_API_KEY`, `AI_API_URL`, `AI_MODEL`
- 数据存储在 Vercel KV (Redis) 中，不会丢失
