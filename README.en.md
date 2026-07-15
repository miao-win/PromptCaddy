<p align="center">
  <a href="./README.md">简体中文</a> | <a href="./README.en.md">English</a> | <a href="./README.zh-TW.md">繁體中文</a>
</p>

# Prompt Caddy

A lightweight, fully localized desktop Prompt management tool designed for everyone to efficiently create, categorize, search, and reuse AI prompts in daily workflows.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Tauri 2.0 + Rust
- **Database**: SQLite (local storage)
- **State Management**: Zustand
- **UI Components**: Lucide React Icons
- **Drag & Drop Interaction**: @dnd-kit
- **Markdown**: React Markdown + Remark GFM
- **Code Highlighting**: React Syntax Highlighter
- **Toast Notifications**: React Hot Toast

## Features

### Core Features
- ✅ Prompt creation, editing, and deletion
- ✅ Tree-structured category management (up to 3 levels, with pinning support)
- ✅ Tag management (create, edit, delete, with color labels)
- ✅ Prompt favorites
- ✅ Quick copy (with variable placeholder filling)
- ✅ Full-text search (FTS5 engine)
- ✅ Drag & drop categorization (drag prompts to categories to change category, reorder categories by dragging)
- ✅ Batch operations (multi-select, batch delete, batch export)
- ✅ Full snapshot (startup snapshot, timed auto-save, manual snapshot, one-click rollback)
- ✅ Import/Export (JSON, Markdown, CSV, with export confirmation)
- ✅ About page (click the app title to view usage guide)

### UI Features
- ✅ iOS Liquid Glass design style
- ✅ Frosted glass effects and dynamic feedback
- ✅ Dark mode support
- ✅ Responsive layout
- ✅ Smooth animation transitions

## Project Structure

```
PromptCaddy/
├── src-tauri/                 # Tauri Backend (Rust)
│   ├── src/
│   │   ├── main.rs           # Main entry
│   │   ├── db.rs             # Database operations
│   │   └── commands.rs       # Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React Frontend
│   ├── api/                  # API wrappers
│   │   └── index.ts
│   ├── components/           # React components
│   │   ├── Sidebar.tsx       # Sidebar navigation
│   │   ├── ContentArea.tsx   # Main content area
│   │   ├── EditPanel.tsx     # Edit panel
│   │   ├── FullscreenEditor.tsx # Fullscreen editor
│   │   ├── PromptCard.tsx    # Prompt card
│   │   ├── DraggablePromptCard.tsx # Draggable prompt card
│   │   ├── SearchBar.tsx     # Search bar
│   │   ├── AboutPage.tsx     # About / usage guide
│   │   ├── TagManagement.tsx # Tag management
│   │   ├── Settings.tsx      # Settings page
│   │   ├── VariableFillDialog.tsx # Variable fill dialog
│   │   └── Toaster.tsx       # Toast notifications
│   ├── store/                # Zustand state management
│   │   └── index.ts
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── i18n/                 # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.ts
│   │       └── en.ts
│   ├── utils/                # Utility functions
│   │   ├── category.ts       # Category utilities
│   │   ├── date.ts           # Date utilities
│   │   ├── export.ts         # Export utilities
│   │   ├── exportPath.ts     # Export path utilities
│   │   ├── highlight.tsx     # Search highlighting
│   │   ├── shortcuts.ts      # Shortcut definitions
│   │   ├── tagColors.ts      # Tag colors
│   │   └── theme.ts          # Theme utilities
│   ├── App.tsx               # App root + global shortcuts
│   ├── main.tsx              # Frontend entry
│   └── index.css             # Global styles
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Development Requirements

- Node.js >= 18
- Rust >= 1.70
- Tauri CLI >= 2.0

## Installation & Running

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Tauri CLI (globally)
npm install -g @tauri-apps/cli
```

### 2. Development Mode

```bash
# Start development server
npm run tauri dev
```

### 3. Build Production Version

```bash
# Build the application
npm run tauri build
```

After building, the executable will be located in the `src-tauri/target/release/` directory.

## Data Storage

All data is stored locally in a SQLite database. File locations:
- Windows: `%APPDATA%/prompt-caddy/prompt_caddy.db`
- macOS: `~/Library/Application Support/prompt-caddy/prompt_caddy.db`
- Linux: `~/.local/share/prompt-caddy/prompt_caddy.db`

## Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl+N` | New Prompt |
| `Ctrl+C` | Quick copy focused card content |
| `Ctrl+A` | Select all / Exit multi-select mode |
| `Ctrl+S` | Save manual snapshot |
| `ESC` | Close panel / Cancel operation (closes in priority order) |

> **Note**: `Ctrl+C` only activates when hovering over a card, no text is selected, and focus is not in an input field, so it won't interfere with the system default copy behavior.

## Tips

- **Variable Placeholders**: Use `{{variable}}` format in prompt content — a fill dialog will appear when copying
- **Right-Click Menu**: Right-click on categories or cards to access more actions (create subcategory, move category, export, etc.)
- **Category Management**: Supports up to 3 levels of tree-structured categories, created via sidebar `+` button or right-click menu
- **Snapshot Restore**: A snapshot is auto-created on every launch (clearing previous snapshots), with timed auto-saves at your chosen interval (default 10 min, options: 1/5/10 min). You can also manually create snapshots or restore to history in Settings
- **About Page**: Click the "Prompt Caddy" title in the top-left corner to view the app introduction and usage guide

## License

MIT License
