<p align="center">
  <a href="./README.md">简体中文</a> | <a href="./README.en.md">English</a> | <a href="./README.zh-TW.md">繁體中文</a>
</p>

# Prompt Caddy

一款輕量、完全本地化的桌面端 Prompt 管理工具，面向所有使用者高效地建立、分類、檢索和複用日常使用的 AI 提示詞。

## 技術棧

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **後端**: Tauri 2.0 + Rust
- **資料庫**: SQLite (本地儲存)
- **狀態管理**: Zustand
- **UI 元件**: Lucide React Icons
- **拖曳互動**: @dnd-kit
- **Markdown**: React Markdown + Remark GFM
- **程式碼高亮**: React Syntax Highlighter
- **Toast 通知**: React Hot Toast

## 功能特色

### 核心功能
- ✅ Prompt 建立、編輯、刪除
- ✅ 樹狀分類管理（最多 3 層，支援釘選）
- ✅ 標籤管理（建立、編輯、刪除，支援顏色標記）
- ✅ Prompt 收藏功能
- ✅ 快速複製（支援變數佔位符填充）
- ✅ 全文搜尋（FTS5 引擎）
- ✅ 拖曳分類（拖曳 Prompt 到分類修改分類，支援分類拖曳排序）
- ✅ 批次操作（多選、批次刪除、批次匯出）
- ✅ 全體快照（啟動快照、定時自動儲存、手動快照、一鍵復原）
- ✅ 匯入匯出（JSON、Markdown、CSV，匯出前確認）
- ✅ 軟體介紹頁（點擊左上角標題即可查看）

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
│   │   ├── Sidebar.tsx       # 側邊欄導航
│   │   ├── ContentArea.tsx   # 主內容區域
│   │   ├── EditPanel.tsx     # 編輯面板
│   │   ├── FullscreenEditor.tsx # 全螢幕編輯器
│   │   ├── PromptCard.tsx    # Prompt 卡片
│   │   ├── DraggablePromptCard.tsx # 可拖曳的 Prompt 卡片
│   │   ├── SearchBar.tsx     # 搜尋欄
│   │   ├── AboutPage.tsx     # 軟體介紹頁
│   │   ├── TagManagement.tsx # 標籤管理
│   │   ├── Settings.tsx      # 設定頁
│   │   ├── VariableFillDialog.tsx # 變數填充對話框
│   │   └── Toaster.tsx       # Toast 通知
│   ├── store/                # Zustand 狀態管理
│   │   └── index.ts
│   ├── types/                # TypeScript 型別定義
│   │   └── index.ts
│   ├── i18n/                 # 國際化
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.ts
│   │       └── en.ts
│   ├── utils/                # 工具函數
│   │   ├── category.ts       # 分類工具
│   │   ├── date.ts           # 日期工具
│   │   ├── export.ts         # 匯出工具
│   │   ├── exportPath.ts     # 匯出路徑工具
│   │   ├── highlight.tsx     # 搜尋高亮
│   │   ├── shortcuts.ts      # 快速鍵定義
│   │   ├── tagColors.ts      # 標籤顏色
│   │   └── theme.ts          # 主題工具
│   ├── App.tsx               # 應用主元件 + 全域快速鍵
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
| `Ctrl+N` | 新建 Prompt |
| `Ctrl+C` | 快速複製當前聚焦卡片內容 |
| `Ctrl+A` | 全選/退出多選模式 |
| `Ctrl+S` | 手動儲存快照 |
| `ESC` | 關閉面板/取消操作（按優先順序依序關閉） |

> **注意**: `Ctrl+C` 僅在滑鼠懸停於卡片上且未選中文字、非輸入框聚焦時生效，不會影響系統預設複製行為。

## 使用技巧

- **變數佔位符**: 在 Prompt 正文中使用 `{{變數名}}` 格式的佔位符，複製時會彈出填寫對話框
- **右鍵選單**: 右鍵點擊分類或卡片可以展開更多操作（建立子分類、移動分類、匯出等）
- **分類管理**: 支援最多 3 層樹狀分類，透過側邊欄 `+` 按鈕或右鍵選單建立
- **快照復原**: 每次啟動會自動建立快照並清除歷史快照，按設定間隔定時儲存（預設 10 分鐘，可選 1/5/10 分鐘）。可在設定中手動建立或復原到歷史版本
- **軟體介紹**: 點擊左上角「Prompt Caddy」標題可查看軟體介紹和使用指南

## 授權條款

MIT License
