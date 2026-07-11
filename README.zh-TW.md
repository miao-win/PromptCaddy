<div align="center">

[简体中文](./README.md) · [English](./README.en.md) · **繁體中文**

</div>

# Prompt Caddy

一款輕量、完全本地化的桌面端 Prompt 管理工具，主要面向非電腦專業背景的使用者高效地建立、分類、檢索和複用日常使用的 AI 提示詞。

## 技術棧

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **後端**: Tauri 2.0 + Rust
- **資料庫**: SQLite (本地儲存)
- **狀態管理**: Zustand
- **UI 元件**: Lucide React Icons
- **Markdown**: React Markdown + Remark GFM

## 功能特色

### 核心功能
- ✅ Prompt 建立、編輯、刪除
- ✅ 樹狀分類管理（最多 3 層）
- ✅ 標籤管理（建立、編輯、刪除、顏色自訂）
- ✅ 快速複製（支援變數佔位符填充）
- ✅ 全文搜尋（FTS5 引擎）
- ✅ 批次操作（多選、批次刪除、批次匯出）
- ✅ 全體快照（啟動快照、手動快照、一鍵復原）
- ✅ 匯入匯出（JSON、Markdown、CSV）

### 介面特色
- ✅ iOS 液態玻璃（Liquid Glass）設計風格
- ✅ 毛玻璃效果和動態回饋
- ✅ 深色模式支援
- ✅ 響應式版面配置
- ✅ 流暢動畫過渡

## 專案結構

```
PromptCaddy/
├── src-tauri/                 # Tauri 後端 (Rust)
│   ├── src/
│   │   ├── main.rs           # 主入口
│   │   ├── db.rs             # 資料庫操作
│   │   └── commands.rs       # Tauri 命令
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React 前端
│   ├── api/                  # API 呼叫封裝
│   │   └── index.ts
│   ├── components/           # React 元件
│   │   ├── App.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ContentArea.tsx
│   │   ├── EditPanel.tsx
│   │   ├── PromptCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── TagManagement.tsx
│   │   ├── Settings.tsx
│   │   ├── VariableFillDialog.tsx
│   │   └── Toaster.tsx
│   ├── store/                # Zustand 狀態管理
│   │   └── index.ts
│   ├── types/                # TypeScript 型別定義
│   │   └── index.ts
│   ├── main.tsx              # 前端入口
│   └── index.css             # 全域樣式
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 開發環境需求

- Node.js >= 18
- Rust >= 1.70
- Tauri CLI >= 2.0

## 安裝與執行

### 1. 安裝相依套件

```bash
# 安裝前端相依套件
npm install

# 安裝 Tauri CLI (全域)
npm install -g @tauri-apps/cli
```

### 2. 開發模式

```bash
# 啟動開發伺服器
npm run tauri dev
```

### 3. 建置生產版本

```bash
# 建置應用程式
npm run tauri build
```

建置完成後，可執行檔將位於 `src-tauri/target/release/` 目錄。

## 資料儲存

所有資料儲存於本地 SQLite 資料庫，檔案位置：
- Windows: `%APPDATA%/prompt-caddy/prompt_caddy.db`
- macOS: `~/Library/Application Support/prompt-caddy/prompt_caddy.db`
- Linux: `~/.local/share/prompt-caddy/prompt_caddy.db`

## 快速鍵

| 快速鍵 | 功能 |
|--------|------|
| `Ctrl+F` | 聚焦搜尋框 |
| `Ctrl+N` | 新建 Prompt |
| `Ctrl+C` | 快速複製（選中卡片時） |
| `Ctrl+A` | 全選/退出多選 |
| `Ctrl+S` | 手動儲存快照 |
| `ESC` | 關閉面板/取消操作 |

## 授權條款

MIT License
