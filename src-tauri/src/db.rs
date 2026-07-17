use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub is_pinned: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub remark: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeletedPrompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub remark: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTag {
    pub id: i64,
    pub prompt_id: String,
    pub tag_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub id: String,
    pub name: Option<String>,
    pub snapshot_data: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub prompt: Prompt,
    pub match_source: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute_batch("
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (parent_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                remark TEXT,
                category_id TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS prompt_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(prompt_id, tag_id)
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                name TEXT,
                snapshot_data TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS deleted_prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                remark TEXT,
                category_id TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
                title,
                content,
                remark,
                content='prompts',
                content_rowid='rowid'
            );

            CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
                INSERT INTO prompts_fts(rowid, title, content, remark) VALUES (new.rowid, new.title, new.content, new.remark);
            END;

            CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
                INSERT INTO prompts_fts(prompts_fts, rowid, title, content, remark) VALUES('delete', old.rowid, old.title, old.content, old.remark);
            END;

            CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
                INSERT INTO prompts_fts(prompts_fts, rowid, title, content, remark) VALUES('delete', old.rowid, old.title, old.content, old.remark);
                INSERT INTO prompts_fts(rowid, title, content, remark) VALUES (new.rowid, new.title, new.content, new.remark);
            END;
        ")?;

        // Migration: add is_pinned column to categories if not exists
        let _ = self.conn.execute(
            "ALTER TABLE categories ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
            [],
        );

        // Migration: add sort_order column to prompts if not exists
        let _ = self.conn.execute(
            "ALTER TABLE prompts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        );

        Ok(())
    }

    // Categories
    pub fn get_categories(&self) -> Result<Vec<Category>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, parent_id, sort_order, is_pinned FROM categories ORDER BY is_pinned DESC, sort_order"
        )?;

        let categories = stmt.query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                sort_order: row.get(3)?,
                is_pinned: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(categories)
    }

    pub fn create_category(&self, name: &str, parent_id: Option<&str>) -> Result<Category> {
        // Check depth limit: max 3 levels (root=1, child=2, grandchild=3)
        if let Some(pid) = parent_id {
            let parent_depth = self.get_category_depth(pid)?;
            if parent_depth >= 3 {
                return Err(rusqlite::Error::InvalidParameterName("Maximum category depth reached (max 3 levels)".to_string()));
            }
        }

        let id = Uuid::new_v4().to_string();
        let max_order: i32 = self.conn.query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM categories WHERE parent_id IS ?",
            params![parent_id],
            |row| row.get(0),
        )?;

        self.conn.execute(
            "INSERT INTO categories (id, name, parent_id, sort_order, is_pinned) VALUES (?, ?, ?, ?, 0)",
            params![id, name, parent_id, max_order + 1],
        )?;

        Ok(Category {
            id,
            name: name.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            sort_order: max_order + 1,
            is_pinned: 0,
        })
    }

    pub fn update_category(&self, id: &str, name: &str, parent_id: Option<&str>, sort_order: i32) -> Result<()> {
        // Validate depth: prevent moving a category under a parent that would exceed 3 levels
        if let Some(pid) = parent_id {
            // Cannot set parent to self
            if pid == id {
                return Err(rusqlite::Error::InvalidParameterName("A category cannot be its own parent".to_string()));
            }
            // Cannot create a cycle: check if `id` is an ancestor of `pid`
            let mut check_id = Some(pid.to_string());
            while let Some(cid) = check_id {
                if cid == id {
                    return Err(rusqlite::Error::InvalidParameterName("Cannot move category under its own descendant (cycle detected)".to_string()));
                }
                let parent: Option<String> = self.conn.query_row(
                    "SELECT parent_id FROM categories WHERE id = ?",
                    params![cid],
                    |row| row.get(0),
                )?;
                check_id = parent;
            }
            // Check depth limit
            let parent_depth = self.get_category_depth(pid)?;
            if parent_depth >= 3 {
                return Err(rusqlite::Error::InvalidParameterName("Maximum category depth reached (max 3 levels)".to_string()));
            }
        }

        self.conn.execute(
            "UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?",
            params![name, parent_id, sort_order, id],
        )?;
        Ok(())
    }

    pub fn delete_category(&self, id: &str) -> Result<()> {
        // Collect all descendant category IDs (including self)
        let descendant_ids = self.get_all_descendant_ids(id)?;

        // Move prompts in all descendant categories to uncategorized
        for cid in &descendant_ids {
            self.conn.execute(
                "UPDATE prompts SET category_id = NULL WHERE category_id = ?",
                params![cid],
            )?;
        }

        // Delete all descendant categories (children first, then parents)
        // Reverse to delete deepest first
        let mut delete_ids = descendant_ids.clone();
        delete_ids.reverse();
        for cid in &delete_ids {
            self.conn.execute(
                "DELETE FROM categories WHERE id = ?",
                params![cid],
            )?;
        }

        Ok(())
    }

    pub fn toggle_category_pin(&self, id: &str) -> Result<i32> {
        let current: i32 = self.conn.query_row(
            "SELECT is_pinned FROM categories WHERE id = ?",
            params![id],
            |row| row.get(0),
        )?;

        let new_value = if current == 0 { 1 } else { 0 };
        self.conn.execute(
            "UPDATE categories SET is_pinned = ? WHERE id = ?",
            params![new_value, id],
        )?;

        Ok(new_value)
    }

    /// Returns the depth of the given category from the root (root = 1).
    /// Max allowed depth is 3, so a node at depth 3 cannot have children.
    fn get_category_depth(&self, id: &str) -> Result<i32> {
        let mut depth = 1; // the node itself counts as level 1
        let mut current_id = Some(id.to_string());

        while let Some(cid) = current_id {
            let parent: Option<String> = self.conn.query_row(
                "SELECT parent_id FROM categories WHERE id = ?",
                params![cid],
                |row| row.get(0),
            )?;

            if let Some(pid) = parent {
                depth += 1;
                current_id = Some(pid);
            } else {
                break;
            }
        }

        Ok(depth)
    }

    /// Returns the given category ID plus all descendant category IDs (BFS).
    pub fn get_all_descendant_ids(&self, id: &str) -> Result<Vec<String>> {
        let mut ids = vec![id.to_string()];
        let mut to_process = vec![id.to_string()];

        while let Some(current_id) = to_process.pop() {
            let mut stmt = self.conn.prepare(
                "SELECT id FROM categories WHERE parent_id = ?"
            )?;
            let children: Vec<String> = stmt.query_map(params![current_id], |row| {
                row.get(0)
            })?.collect::<Result<Vec<_>>>()?;

            for child_id in children {
                ids.push(child_id.clone());
                to_process.push(child_id);
            }
        }

        Ok(ids)
    }

    // Tags
    pub fn get_tags(&self) -> Result<Vec<Tag>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name FROM tags ORDER BY name"
        )?;

        let tags = stmt.query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tags)
    }

    pub fn create_tag(&self, name: &str) -> Result<Tag> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO tags (id, name, color) VALUES (?, ?, '')",
            params![id, name],
        )?;

        Ok(Tag {
            id,
            name: name.to_string(),
        })
    }

    pub fn update_tag(&self, id: &str, name: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tags SET name = ? WHERE id = ?",
            params![name, id],
        )?;
        Ok(())
    }

    pub fn delete_tag(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM tags WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    // Prompts
    pub fn get_prompts(&self, category_id: Option<&str>, favorites_only: bool) -> Result<Vec<Prompt>> {
        let (sql, query_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match (category_id, favorites_only) {
            (Some(cid), fav) => {
                // Include prompts from all descendant categories (subtree filtering)
                let ids = self.get_all_descendant_ids(cid)?;
                let placeholders: Vec<String> = ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
                let in_clause = placeholders.join(", ");
                let fav_clause = if fav { " AND is_favorite = 1" } else { "" };
                let sql = format!(
                    "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at FROM prompts WHERE category_id IN ({}){} ORDER BY sort_order, title ASC",
                    in_clause, fav_clause
                );
                let params: Vec<Box<dyn rusqlite::types::ToSql>> = ids.into_iter()
                    .map(|id| Box::new(id) as Box<dyn rusqlite::types::ToSql>)
                    .collect();
                (sql, params)
            },
            (None, true) => (
                "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at FROM prompts WHERE is_favorite = 1 ORDER BY sort_order, title ASC".to_string(),
                vec![],
            ),
            (None, false) => (
                "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at FROM prompts ORDER BY sort_order, title ASC".to_string(),
                vec![],
            ),
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();
        let prompts = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                remark: row.get(3)?,
                category_id: row.get(4)?,
                is_favorite: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(prompts)
    }

    pub fn get_prompt_by_id(&self, id: &str) -> Result<Prompt> {
        self.conn.query_row(
            "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at FROM prompts WHERE id = ?",
            params![id],
            |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    remark: row.get(3)?,
                    category_id: row.get(4)?,
                    is_favorite: row.get(5)?,
                    sort_order: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
    }

    pub fn create_prompt(&self, title: &str, content: &str, remark: Option<&str>, category_id: Option<&str>) -> Result<Prompt> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
            params![id, title, content, remark, category_id, now, now],
        )?;

        Ok(Prompt {
            id,
            title: title.to_string(),
            content: content.to_string(),
            remark: remark.map(|s| s.to_string()),
            category_id: category_id.map(|s| s.to_string()),
            is_favorite: 0,
            sort_order: 0,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_prompt(&self, id: &str, title: &str, content: &str, remark: Option<&str>, category_id: Option<&str>) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE prompts SET title = ?, content = ?, remark = ?, category_id = ?, updated_at = ? WHERE id = ?",
            params![title, content, remark, category_id, now, id],
        )?;
        Ok(())
    }

    pub fn delete_prompt(&self, id: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        // Copy to deleted_prompts (recycle bin)
        self.conn.execute(
            "INSERT INTO deleted_prompts (id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at, deleted_at)
             SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at, ? FROM prompts WHERE id = ?",
            params![now, id],
        )?;
        // Remove from active prompts
        self.conn.execute(
            "DELETE FROM prompts WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn toggle_favorite(&self, id: &str) -> Result<i32> {
        let current: i32 = self.conn.query_row(
            "SELECT is_favorite FROM prompts WHERE id = ?",
            params![id],
            |row| row.get(0),
        )?;

        let new_value = if current == 0 { 1 } else { 0 };
        self.conn.execute(
            "UPDATE prompts SET is_favorite = ? WHERE id = ?",
            params![new_value, id],
        )?;

        Ok(new_value)
    }

    pub fn reorder_prompts(&self, prompt_orders: &[(String, i32)]) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        for (id, sort_order) in prompt_orders {
            tx.execute(
                "UPDATE prompts SET sort_order = ? WHERE id = ?",
                params![sort_order, id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn reorder_categories(&self, category_orders: &[(String, i32)]) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        for (id, sort_order) in category_orders {
            tx.execute(
                "UPDATE categories SET sort_order = ? WHERE id = ?",
                params![sort_order, id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    // Recycle Bin
    pub fn get_deleted_prompts(&self) -> Result<Vec<DeletedPrompt>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at, deleted_at FROM deleted_prompts ORDER BY deleted_at DESC"
        )?;

        let prompts = stmt.query_map([], |row| {
            Ok(DeletedPrompt {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                remark: row.get(3)?,
                category_id: row.get(4)?,
                is_favorite: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                deleted_at: row.get(9)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(prompts)
    }

    pub fn restore_deleted_prompt(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at)
             SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at FROM deleted_prompts WHERE id = ?",
            params![id],
        )?;
        self.conn.execute(
            "DELETE FROM deleted_prompts WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn permanently_delete_prompt(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM deleted_prompts WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn empty_recycle_bin(&self) -> Result<()> {
        self.conn.execute("DELETE FROM deleted_prompts", [])?;
        Ok(())
    }

    pub fn cleanup_expired_deleted_prompts(&self) -> Result<()> {
        // Delete entries older than 7 days
        self.conn.execute(
            "DELETE FROM deleted_prompts WHERE deleted_at < datetime('now', '-7 days')",
            [],
        )?;
        Ok(())
    }

    // Prompt-Tag relations
    pub fn add_tag_to_prompt(&self, prompt_id: &str, tag_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
            params![prompt_id, tag_id],
        )?;
        Ok(())
    }

    pub fn remove_tag_from_prompt(&self, prompt_id: &str, tag_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM prompt_tags WHERE prompt_id = ? AND tag_id = ?",
            params![prompt_id, tag_id],
        )?;
        Ok(())
    }

    pub fn get_prompt_tags(&self, prompt_id: &str) -> Result<Vec<Tag>> {
        let mut stmt = self.conn.prepare(
            "SELECT t.id, t.name FROM tags t INNER JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ? ORDER BY t.name"
        )?;

        let tags = stmt.query_map(params![prompt_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tags)
    }

    // Search
    pub fn search_prompts(&self, query: &str) -> Result<Vec<SearchResult>> {
        // Sanitize FTS5 query: escape double quotes inside the phrase query
        let sanitized = query.replace('"', "\"\"");
        let fts_query = format!("\"{}\"", sanitized);

        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.title, p.content, p.remark, p.category_id, p.is_favorite, p.sort_order, p.created_at, p.updated_at
             FROM prompts p
             INNER JOIN prompts_fts fts ON p.rowid = fts.rowid
             WHERE prompts_fts MATCH ?
             ORDER BY rank"
        )?;

        let prompts = stmt.query_map(params![fts_query], |row| {
            Ok(Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                remark: row.get(3)?,
                category_id: row.get(4)?,
                is_favorite: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).and_then(|rows| rows.collect::<Result<Vec<_>>>());

        // If FTS match fails (e.g. special chars), fall back to LIKE search
        let prompts = match prompts {
            Ok(p) if !p.is_empty() => p,
            _ => {
                // Escape LIKE wildcards to prevent injection
                let escaped_query = query
                    .replace('\\', "\\\\")
                    .replace('%', "\\%")
                    .replace('_', "\\_");
                let like_pattern = format!("%{}%", escaped_query);
                let mut fallback_stmt = self.conn.prepare(
                    "SELECT id, title, content, remark, category_id, is_favorite, sort_order, created_at, updated_at
                     FROM prompts
                     WHERE title LIKE ?1 ESCAPE '\\' OR content LIKE ?1 ESCAPE '\\' OR remark LIKE ?1 ESCAPE '\\'
                     ORDER BY title ASC"
                )?;
                let rows = fallback_stmt.query_map(params![like_pattern], |row| {
                    Ok(Prompt {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        content: row.get(2)?,
                        remark: row.get(3)?,
                        category_id: row.get(4)?,
                        is_favorite: row.get(5)?,
                        sort_order: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                })?.collect::<Result<Vec<_>>>()?;
                rows
            }
        };

        let mut results = Vec::new();

        for prompt in prompts {
            results.push(SearchResult {
                prompt,
                match_source: "prompt".to_string(),
            });
        }

        Ok(results)
    }

    // Snapshots
    pub fn get_snapshots(&self) -> Result<Vec<Snapshot>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, snapshot_data, created_at FROM snapshots ORDER BY created_at DESC"
        )?;

        let snapshots = stmt.query_map([], |row| {
            Ok(Snapshot {
                id: row.get(0)?,
                name: row.get(1)?,
                snapshot_data: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(snapshots)
    }

    /// Collect all data (categories, tags, prompts, prompt_tags) for export/snapshot.
    fn collect_all_data(&self) -> Result<(Vec<Category>, Vec<Tag>, Vec<Prompt>, Vec<PromptTag>)> {
        let categories = self.get_categories()?;
        let tags = self.get_tags()?;
        let prompts = self.get_prompts(None, false)?;

        let mut all_prompt_tags = Vec::new();
        for prompt in &prompts {
            let tags = self.get_prompt_tags(&prompt.id)?;
            for tag in tags {
                all_prompt_tags.push(PromptTag {
                    id: 0,
                    prompt_id: prompt.id.clone(),
                    tag_id: tag.id,
                });
            }
        }

        Ok((categories, tags, prompts, all_prompt_tags))
    }

    pub fn create_snapshot(&self, name: Option<&str>) -> Result<Snapshot> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let (categories, tags, prompts, all_prompt_tags) = self.collect_all_data()?;

        let snapshot_data = serde_json::json!({
            "categories": categories,
            "tags": tags,
            "prompts": prompts,
            "prompt_tags": all_prompt_tags,
        }).to_string();

        self.conn.execute(
            "INSERT INTO snapshots (id, name, snapshot_data, created_at) VALUES (?, ?, ?, ?)",
            params![id, name, snapshot_data, now],
        )?;

        Ok(Snapshot {
            id,
            name: name.map(|s| s.to_string()),
            snapshot_data,
            created_at: now,
        })
    }

    pub fn restore_snapshot(&self, snapshot_id: &str) -> Result<()> {
        let snapshot: Snapshot = self.conn.query_row(
            "SELECT id, name, snapshot_data, created_at FROM snapshots WHERE id = ?",
            params![snapshot_id],
            |row| {
                Ok(Snapshot {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    snapshot_data: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )?;

        let data: serde_json::Value = serde_json::from_str(&snapshot.snapshot_data)
            .map_err(|_| rusqlite::Error::InvalidParameterName("Invalid snapshot data".to_string()))?;

        // Wrap clear + restore in a transaction so a mid-way failure doesn't lose all data
        self.conn.execute("BEGIN TRANSACTION", [])?;

        let result = (|| -> Result<()> {
            // Clear all data
            self.conn.execute("DELETE FROM prompt_tags", [])?;
            self.conn.execute("DELETE FROM prompts", [])?;
            self.conn.execute("DELETE FROM tags", [])?;
            self.conn.execute("DELETE FROM categories", [])?;

            // Restore categories
            if let Some(categories) = data["categories"].as_array() {
                for cat in categories {
                    self.conn.execute(
                        "INSERT INTO categories (id, name, parent_id, sort_order, is_pinned) VALUES (?, ?, ?, ?, ?)",
                        params![
                            cat["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category id".into()))?,
                            cat["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category name".into()))?,
                            cat["parent_id"].as_str(),
                            cat["sort_order"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category sort_order".into()))? as i32,
                            cat["is_pinned"].as_i64().unwrap_or(0) as i32,
                        ],
                    )?;
                }
            }

            // Restore tags
            if let Some(tags) = data["tags"].as_array() {
                for tag in tags {
                    self.conn.execute(
                        "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
                        params![
                            tag["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag id".into()))?,
                            tag["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag name".into()))?,
                            tag["color"].as_str().unwrap_or(""),
                        ],
                    )?;
                }
            }

            // Restore prompts
            if let Some(prompts) = data["prompts"].as_array() {
                for prompt in prompts {
                    self.conn.execute(
                        "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        params![
                            prompt["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt id".into()))?,
                            prompt["title"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt title".into()))?,
                            prompt["content"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt content".into()))?,
                            prompt["remark"].as_str(),
                            prompt["category_id"].as_str(),
                            prompt["is_favorite"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt is_favorite".into()))? as i32,
                            prompt["created_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt created_at".into()))?,
                            prompt["updated_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt updated_at".into()))?,
                        ],
                    )?;
                }
            }

            // Restore prompt_tags
            if let Some(prompt_tags) = data["prompt_tags"].as_array() {
                for pt in prompt_tags {
                    self.conn.execute(
                        "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                        params![
                            pt["prompt_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag prompt_id".into()))?,
                            pt["tag_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag tag_id".into()))?,
                        ],
                    )?;
                }
            }

            // Edge case: remove from recycle bin any prompt that was restored from snapshot
            // This prevents duplicates when a deleted prompt reappears via snapshot restore
            if let Some(prompts) = data["prompts"].as_array() {
                for prompt in prompts {
                    if let Some(pid) = prompt["id"].as_str() {
                        let _ = self.conn.execute(
                            "DELETE FROM deleted_prompts WHERE id = ?",
                            params![pid],
                        );
                    }
                }
            }

            Ok(())
        })();

        match result {
            Ok(()) => {
                self.conn.execute("COMMIT", [])?;
                Ok(())
            }
            Err(e) => {
                let _ = self.conn.execute("ROLLBACK", []);
                Err(e)
            }
        }
    }

    pub fn delete_snapshot(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM snapshots WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    pub fn delete_all_snapshots(&self) -> Result<()> {
        self.conn.execute("DELETE FROM snapshots", [])?;
        Ok(())
    }

    // Export
    pub fn clear_all_data(&self) -> Result<()> {
        self.conn.execute("BEGIN TRANSACTION", [])?;
        let result = (|| -> Result<()> {
            self.conn.execute("DELETE FROM prompt_tags", [])?;
            self.conn.execute("DELETE FROM prompts", [])?;
            self.conn.execute("DELETE FROM deleted_prompts", [])?;
            self.conn.execute("DELETE FROM tags", [])?;
            self.conn.execute("DELETE FROM categories", [])?;
            Ok(())
        })();

        match result {
            Ok(()) => {
                self.conn.execute("COMMIT", [])?;
                Ok(())
            }
            Err(e) => {
                let _ = self.conn.execute("ROLLBACK", []);
                Err(e)
            }
        }
    }

    pub fn move_prompts_to_category(&self, prompt_ids: &[String], category_id: Option<&str>) -> Result<()> {
        for id in prompt_ids {
            self.conn.execute(
                "UPDATE prompts SET category_id = ? WHERE id = ?",
                params![category_id, id],
            )?;
        }
        Ok(())
    }

    pub fn export_all_json(&self) -> Result<String> {
        let (categories, tags, prompts, all_prompt_tags) = self.collect_all_data()?;

        let export_data = serde_json::json!({
            "categories": categories,
            "tags": tags,
            "prompts": prompts,
            "prompt_tags": all_prompt_tags,
        });

        Ok(export_data.to_string())
    }

    pub fn export_prompts_json(&self, prompt_ids: &[String]) -> Result<String> {
        let mut prompts = Vec::new();
        let mut all_prompt_tags = Vec::new();
        let mut category_ids = Vec::new();
        let mut tag_ids = Vec::new();

        for id in prompt_ids {
            let prompt = self.get_prompt_by_id(id)?;
            if let Some(cid) = &prompt.category_id {
                category_ids.push(cid.clone());
            }
            prompts.push(prompt);

            let tags = self.get_prompt_tags(id)?;
            for tag in tags {
                tag_ids.push(tag.id.clone());
                all_prompt_tags.push(PromptTag {
                    id: 0,
                    prompt_id: id.clone(),
                    tag_id: tag.id,
                });
            }
        }

        // Get unique categories and tags
        category_ids.sort();
        category_ids.dedup();
        tag_ids.sort();
        tag_ids.dedup();

        let categories: Vec<Category> = self.get_categories()?.into_iter()
            .filter(|c| category_ids.contains(&c.id))
            .collect();

        let tags: Vec<Tag> = self.get_tags()?.into_iter()
            .filter(|t| tag_ids.contains(&t.id))
            .collect();

        let export_data = serde_json::json!({
            "categories": categories,
            "tags": tags,
            "prompts": prompts,
            "prompt_tags": all_prompt_tags,
        });

        Ok(export_data.to_string())
    }

    pub fn import_json(&self, json_data: &str, strategy: &str) -> Result<()> {
        let data: serde_json::Value = serde_json::from_str(json_data)
            .map_err(|_| rusqlite::Error::InvalidParameterName("Invalid JSON data".to_string()))?;

        match strategy {
            "overwrite" => {
                // Wrap clear + import in a transaction for atomicity
                self.conn.execute("BEGIN TRANSACTION", [])?;
                let result = (|| -> Result<()> {
                    self.conn.execute("DELETE FROM prompt_tags", [])?;
                    self.conn.execute("DELETE FROM prompts", [])?;
                    self.conn.execute("DELETE FROM tags", [])?;
                    self.conn.execute("DELETE FROM categories", [])?;
                    self.import_data(&data)?;
                    Ok(())
                })();

                match result {
                    Ok(()) => {
                        self.conn.execute("COMMIT", [])?;
                    }
                    Err(e) => {
                        let _ = self.conn.execute("ROLLBACK", []);
                        return Err(e);
                    }
                }
            }
            "skip" => {
                // Only import if not exists
                self.import_data_skip_existing(&data)?;
            }
            "copy" => {
                // Create copies with new IDs
                self.import_data_as_copy(&data)?;
            }
            _ => return Err(rusqlite::Error::InvalidParameterName("Invalid strategy".to_string())),
        }

        Ok(())
    }

    fn import_data(&self, data: &serde_json::Value) -> Result<()> {
        // Import categories
        if let Some(categories) = data["categories"].as_array() {
            for cat in categories {
                self.conn.execute(
                    "INSERT OR REPLACE INTO categories (id, name, parent_id, sort_order, is_pinned) VALUES (?, ?, ?, ?, ?)",
                    params![
                        cat["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category id".into()))?,
                        cat["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category name".into()))?,
                        cat["parent_id"].as_str(),
                        cat["sort_order"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category sort_order".into()))? as i32,
                        cat["is_pinned"].as_i64().unwrap_or(0) as i32,
                    ],
                )?;
            }
        }

        // Import tags
        if let Some(tags) = data["tags"].as_array() {
            for tag in tags {
                self.conn.execute(
                    "INSERT OR REPLACE INTO tags (id, name, color) VALUES (?, ?, ?)",
                    params![
                        tag["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag id".into()))?,
                        tag["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag name".into()))?,
                        tag["color"].as_str().unwrap_or(""),
                    ],
                )?;
            }
        }

        // Import prompts
        if let Some(prompts) = data["prompts"].as_array() {
            for prompt in prompts {
                self.conn.execute(
                    "INSERT OR REPLACE INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        prompt["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt id".into()))?,
                        prompt["title"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt title".into()))?,
                        prompt["content"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt content".into()))?,
                        prompt["remark"].as_str(),
                        prompt["category_id"].as_str(),
                        prompt["is_favorite"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt is_favorite".into()))? as i32,
                        prompt["created_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt created_at".into()))?,
                        prompt["updated_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt updated_at".into()))?,
                    ],
                )?;
            }
        }

        // Import prompt_tags
        if let Some(prompt_tags) = data["prompt_tags"].as_array() {
            for pt in prompt_tags {
                self.conn.execute(
                    "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                    params![
                        pt["prompt_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag prompt_id".into()))?,
                        pt["tag_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag tag_id".into()))?,
                    ],
                )?;
            }
        }

        Ok(())
    }

    fn import_data_skip_existing(&self, data: &serde_json::Value) -> Result<()> {
        // Import categories if not exists
        if let Some(categories) = data["categories"].as_array() {
            for cat in categories {
                let cat_id = cat["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category id".into()))?;
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM categories WHERE id = ?",
                    params![cat_id],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO categories (id, name, parent_id, sort_order, is_pinned) VALUES (?, ?, ?, ?, ?)",
                        params![
                            cat_id,
                            cat["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category name".into()))?,
                            cat["parent_id"].as_str(),
                            cat["sort_order"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category sort_order".into()))? as i32,
                            cat["is_pinned"].as_i64().unwrap_or(0) as i32,
                        ],
                    )?;
                }
            }
        }

        // Import tags if not exists
        if let Some(tags) = data["tags"].as_array() {
            for tag in tags {
                let tag_id = tag["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag id".into()))?;
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM tags WHERE id = ?",
                    params![tag_id],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
                        params![
                            tag_id,
                            tag["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag name".into()))?,
                            tag["color"].as_str().unwrap_or(""),
                        ],
                    )?;
                }
            }
        }

        // Import prompts if not exists
        if let Some(prompts) = data["prompts"].as_array() {
            for prompt in prompts {
                let prompt_id = prompt["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt id".into()))?;
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM prompts WHERE id = ?",
                    params![prompt_id],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        params![
                            prompt_id,
                            prompt["title"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt title".into()))?,
                            prompt["content"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt content".into()))?,
                            prompt["remark"].as_str(),
                            prompt["category_id"].as_str(),
                            prompt["is_favorite"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt is_favorite".into()))? as i32,
                            prompt["created_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt created_at".into()))?,
                            prompt["updated_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt updated_at".into()))?,
                        ],
                    )?;
                }
            }
        }

        // Import prompt_tags if not exists
        if let Some(prompt_tags) = data["prompt_tags"].as_array() {
            for pt in prompt_tags {
                self.conn.execute(
                    "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                    params![
                        pt["prompt_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag prompt_id".into()))?,
                        pt["tag_id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag tag_id".into()))?,
                    ],
                )?;
            }
        }

        Ok(())
    }

    fn import_data_as_copy(&self, data: &serde_json::Value) -> Result<()> {
        // Create new IDs mapping
        let mut category_id_map = std::collections::HashMap::new();
        let mut tag_id_map = std::collections::HashMap::new();
        let mut prompt_id_map = std::collections::HashMap::new();

        // Import categories with new IDs
        if let Some(categories) = data["categories"].as_array() {
            for cat in categories {
                let old_id = cat["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category id".into()))?.to_string();
                let new_id = Uuid::new_v4().to_string();
                category_id_map.insert(old_id, new_id.clone());

                self.conn.execute(
                    "INSERT INTO categories (id, name, parent_id, sort_order, is_pinned) VALUES (?, ?, ?, ?, ?)",
                    params![
                        new_id,
                        cat["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category name".into()))?,
                        cat["parent_id"].as_str(),
                        cat["sort_order"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing category sort_order".into()))? as i32,
                        cat["is_pinned"].as_i64().unwrap_or(0) as i32,
                    ],
                )?;
            }
        }

        // Import tags with new IDs
        if let Some(tags) = data["tags"].as_array() {
            for tag in tags {
                let old_id = tag["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag id".into()))?.to_string();
                let new_id = Uuid::new_v4().to_string();
                tag_id_map.insert(old_id, new_id.clone());

                self.conn.execute(
                    "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
                    params![
                        new_id,
                        tag["name"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing tag name".into()))?,
                        tag["color"].as_str().unwrap_or(""),
                    ],
                )?;
            }
        }

        // Import prompts with new IDs
        if let Some(prompts) = data["prompts"].as_array() {
            for prompt in prompts {
                let old_id = prompt["id"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt id".into()))?.to_string();
                let new_id = Uuid::new_v4().to_string();
                prompt_id_map.insert(old_id, new_id.clone());

                let category_id = prompt["category_id"].as_str()
                    .and_then(|cid| category_id_map.get(cid))
                    .cloned();

                self.conn.execute(
                    "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        new_id,
                        prompt["title"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt title".into()))?,
                        prompt["content"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt content".into()))?,
                        prompt["remark"].as_str(),
                        category_id,
                        prompt["is_favorite"].as_i64().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt is_favorite".into()))? as i32,
                        prompt["created_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt created_at".into()))?,
                        prompt["updated_at"].as_str().ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt updated_at".into()))?,
                    ],
                )?;
            }
        }

        // Import prompt_tags with new IDs
        if let Some(prompt_tags) = data["prompt_tags"].as_array() {
            for pt in prompt_tags {
                let prompt_id = pt["prompt_id"].as_str()
                    .and_then(|pid| prompt_id_map.get(pid))
                    .cloned()
                    .or_else(|| pt["prompt_id"].as_str().map(|s| s.to_string()))
                    .ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag prompt_id".into()))?;

                let tag_id = pt["tag_id"].as_str()
                    .and_then(|tid| tag_id_map.get(tid))
                    .cloned()
                    .or_else(|| pt["tag_id"].as_str().map(|s| s.to_string()))
                    .ok_or_else(|| rusqlite::Error::InvalidParameterName("missing prompt_tag tag_id".into()))?;

                self.conn.execute(
                    "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                    params![prompt_id, tag_id],
                )?;
            }
        }

        Ok(())
    }
}