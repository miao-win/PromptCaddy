<div align="center">

[简体中文](./README.md) · **English** · [繁體中文](./README.zh-TW.md)

</div>

# Prompt Caddy

A lightweight, fully localized desktop Prompt management tool designed for non-technical users to efficiently create, categorize, search, and reuse AI prompts in daily workflows.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Tauri 2.0 + Rust
- **Database**: SQLite (local storage)
- **State Management**: Zustand
- **UI Components**: Lucide React Icons
- **Markdown**: React Markdown + Remark GFM

## Features

### Core Features
- ✅ Prompt creation, editing, and deletion
- ✅ Tree-structured category management (up to 3 levels)
- ✅ Tag management (create, edit, delete, custom colors)
- ✅ Quick copy (with variable placeholder filling)
- ✅ Full-text search (FTS5 engine)
- ✅ Batch operations (multi-select, batch delete, batch export)
- ✅ Full snapshot (startup snapshot, manual snapshot, one-click rollback)
- ✅ Import/Export (JSON, Markdown, CSV)

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
│   ├── store/                # Zustand state management
│   │   └── index.ts
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
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
| `Ctrl+F` | Focus search bar |
| `Ctrl+N` | New Prompt |
| `Ctrl+C` | Quick copy (when card is selected) |
| `Ctrl+A` | Select all / Exit multi-select |
| `Ctrl+S` | Save manual snapshot |
| `ESC` | Close panel / Cancel operation |

## License

MIT License
