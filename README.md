<div align="center">

**简体中文** · [English](./README.en.md) · [繁體中文](./README.zh-TW.md)

</div>

# Prompt Caddy

一款轻量、完全本地化的桌面端 Prompt 管理工具，主要面向非计算机专业背景的用户高效地创建、分类、检索和复用日常使用的 AI 提示词。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Tauri 2.0 + Rust
- **数据库**: SQLite (本地存储)
- **状态管理**: Zustand
- **UI 组件**: Lucide React Icons
- **Markdown**: React Markdown + Remark GFM

## 功能特性

### 核心功能
- ✅ Prompt 创建、编辑、删除
- ✅ 树状分类管理（最多 3 层）
- ✅ 标签管理（创建、编辑、删除、颜色自定义）
- ✅ 快速复制（支持变量占位符填充）
- ✅ 全文搜索（FTS5 引擎）
- ✅ 批量操作（多选、批量删除、批量导出）
- ✅ 全体快照（启动快照、手动快照、一键回退）
- ✅ 导入导出（JSON、Markdown、CSV）
- ✅ 软件介绍页（点击左上角标题即可查看）

### 界面特性
- ✅ iOS 液态玻璃（Liquid Glass）设计风格
- ✅ 毛玻璃效果和动态反馈
- ✅ 深色模式支持
- ✅ 响应式布局
- ✅ 流畅动画过渡

## 项目结构

```
PromptCaddy/
├── src-tauri/                 # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── main.rs           # 主入口
│   │   ├── db.rs             # 数据库操作
│   │   └── commands.rs       # Tauri 命令
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React 前端
│   ├── api/                  # API 调用封装
│   │   └── index.ts
│   ├── components/           # React 组件
│   │   ├── App.tsx           # 应用主组件 + 全局快捷键
│   │   ├── Sidebar.tsx       # 侧边栏导航
│   │   ├── ContentArea.tsx   # 主内容区域
│   │   ├── EditPanel.tsx     # 编辑面板
│   │   ├── FullscreenEditor.tsx # 全屏编辑器
│   │   ├── PromptCard.tsx    # Prompt 卡片
│   │   ├── SearchBar.tsx     # 搜索栏
│   │   ├── AboutPage.tsx     # 软件介绍页
│   │   ├── TagManagement.tsx # 标签管理
│   │   ├── Settings.tsx      # 设置页
│   │   ├── VariableFillDialog.tsx # 变量填充对话框
│   │   └── Toaster.tsx       # Toast 通知
│   ├── store/                # Zustand 状态管理
│   │   └── index.ts
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   ├── i18n/                 # 国际化
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.ts
│   │       └── en.ts
│   ├── main.tsx              # 前端入口
│   └── index.css             # 全局样式
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 开发环境要求

- Node.js >= 18
- Rust >= 1.70
- Tauri CLI >= 2.0

## 安装与运行

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI (全局)
npm install -g @tauri-apps/cli
```

### 2. 开发模式

```bash
# 启动开发服务器
npm run tauri dev
```

### 3. 构建生产版本

```bash
# 构建应用
npm run tauri build
```

构建完成后，可执行文件将位于 `src-tauri/target/release/` 目录。

## 数据存储

所有数据存储于本地 SQLite 数据库，文件位置：
- Windows: `%APPDATA%/prompt-caddy/prompt_caddy.db`
- macOS: `~/Library/Application Support/prompt-caddy/prompt_caddy.db`
- Linux: `~/.local/share/prompt-caddy/prompt_caddy.db`

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建 Prompt |
| `Ctrl+C` | 快速复制选中卡片内容 |
| `Ctrl+F` | 聚焦搜索框 |
| `Ctrl+A` | 全选/退出多选模式 |
| `Ctrl+S` | 手动保存快照 |
| `ESC` | 关闭面板/取消操作（按优先级依次关闭） |

> **注意**: `Ctrl+C` 仅在未选中文本且非输入框聚焦时生效，不会影响系统默认复制行为。

## 使用技巧

- **变量占位符**: 在 Prompt 正文中使用 `{{变量名}}` 格式，复制时会弹出填写对话框
- **右键菜单**: 右键点击分类或卡片可以展开更多操作（创建子分类、移动分类、导出等）
- **分类管理**: 支持最多 3 层树状分类，通过侧边栏 `+` 按钮或右键菜单创建
- **快照回退**: 每次启动自动创建快照，可在设置中手动创建或回退到历史版本
- **软件介绍**: 点击左上角「Prompt Caddy」标题可查看软件介绍和使用指南

## 许可证

MIT License
