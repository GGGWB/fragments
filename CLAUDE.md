# 碎片文字记录 (Fragments)

一个轻量级的碎片文字记录工具，基于 Node.js 原生模块构建，零第三方依赖。

## 项目结构

```
fragments/
├── server.js           # 后端服务（Node.js 原生 http 模块）
├── public/
│   └── index.html      # 前端页面（单文件，内联 CSS/JS）
├── data/
│   ├── fragments.json  # 碎片数据（运行时生成）
│   └── trash.json      # 回收站数据（运行时生成）
├── .gitignore
└── readme.txt
```

## 技术栈

- **后端**: Node.js 原生 `http` + `fs` 模块，无第三方依赖
- **前端**: 原生 HTML / CSS / JavaScript（单文件）
- **数据存储**: JSON 文件（`data/fragments.json`, `data/trash.json`）
- **字体**: Google Fonts - Noto Serif SC

## 启动方式

```bash
node server.js
```

- 本地访问: http://localhost:10086
- 局域网访问: http://<局域网IP>:10086

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

## 功能特性

- 碎片文字记录、编辑、删除
- 拖拽排序
- 颜色标记分类
- 回收站（删除后 3 天内可恢复，每小时自动清理过期条目）
- 局域网多设备访问

## 注意事项

- 端口硬编码为 `10086`，修改需编辑 `server.js` 中的 `PORT` 变量
- `data/` 目录下的 JSON 文件是运行时数据，已加入 `.gitignore`
- 前端是单文件 `index.html`（约 1500 行），样式和脚本全部内联
