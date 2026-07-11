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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub remark: Option<String>,
    pub category_id: Option<String>,
    pub is_favorite: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variant {
    pub id: String,
    pub prompt_id: String,
    pub name: String,
    pub content: String,
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
    pub matched_variant: Option<Variant>,
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
                FOREIGN KEY (parent_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                remark TEXT,
                category_id TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS variants (
                id TEXT PRIMARY KEY,
                prompt_id TEXT NOT NULL,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
                UNIQUE(prompt_id, name)
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

        Ok(())
    }

    // Categories
    pub fn get_categories(&self) -> Result<Vec<Category>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, parent_id, sort_order FROM categories ORDER BY sort_order"
        )?;

        let categories = stmt.query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                sort_order: row.get(3)?,
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
            "INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
            params![id, name, parent_id, max_order + 1],
        )?;

        Ok(Category {
            id,
            name: name.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            sort_order: max_order + 1,
        })
    }

    pub fn update_category(&self, id: &str, name: &str, parent_id: Option<&str>, sort_order: i32) -> Result<()> {
        self.conn.execute(
            "UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?",
            params![name, parent_id, sort_order, id],
        )?;
        Ok(())
    }

    pub fn delete_category(&self, id: &str) -> Result<()> {
        // Collect all descendant category IDs using recursive CTE
        let mut descendant_ids: Vec<String> = vec![id.to_string()];
        let mut to_process = vec![id.to_string()];

        while let Some(current_id) = to_process.pop() {
            let mut stmt = self.conn.prepare(
                "SELECT id FROM categories WHERE parent_id = ?"
            )?;
            let children: Vec<String> = stmt.query_map(params![current_id], |row| {
                row.get(0)
            })?.collect::<Result<Vec<_>>>()?;

            for child_id in children {
                descendant_ids.push(child_id.clone());
                to_process.push(child_id);
            }
        }

        // Move prompts in all descendant categories to uncategorized
        for cid in &descendant_ids {
            self.conn.execute(
                "UPDATE prompts SET category_id = NULL WHERE category_id = ?",
                params![cid],
            )?;
        }

        // Delete all descendant categories (children first, then parents)
        // Reverse to delete deepest first
        descendant_ids.reverse();
        for cid in &descendant_ids {
            self.conn.execute(
                "DELETE FROM categories WHERE id = ?",
                params![cid],
            )?;
        }

        Ok(())
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

    // Tags
    pub fn get_tags(&self) -> Result<Vec<Tag>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, color FROM tags ORDER BY name"
        )?;

        let tags = stmt.query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tags)
    }

    pub fn create_tag(&self, name: &str, color: &str) -> Result<Tag> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
            params![id, name, color],
        )?;

        Ok(Tag {
            id,
            name: name.to_string(),
            color: color.to_string(),
        })
    }

    pub fn update_tag(&self, id: &str, name: &str, color: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tags SET name = ?, color = ? WHERE id = ?",
            params![name, color, id],
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
            (Some(cid), true) => (
                "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at FROM prompts WHERE category_id = ?1 AND is_favorite = 1 ORDER BY title ASC".to_string(),
                vec![Box::new(cid.to_string())],
            ),
            (Some(cid), false) => (
                "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at FROM prompts WHERE category_id = ?1 ORDER BY title ASC".to_string(),
                vec![Box::new(cid.to_string())],
            ),
            (None, true) => (
                "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at FROM prompts WHERE is_favorite = 1 ORDER BY title ASC".to_string(),
                vec![],
            ),
            (None, false) => (
                "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at FROM prompts ORDER BY title ASC".to_string(),
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
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(prompts)
    }

    pub fn get_prompt_by_id(&self, id: &str) -> Result<Prompt> {
        self.conn.query_row(
            "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at FROM prompts WHERE id = ?",
            params![id],
            |row| {
                Ok(Prompt {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    remark: row.get(3)?,
                    category_id: row.get(4)?,
                    is_favorite: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
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

    // Variants
    pub fn get_variants(&self, prompt_id: &str) -> Result<Vec<Variant>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, prompt_id, name, content FROM variants WHERE prompt_id = ? ORDER BY name"
        )?;

        let variants = stmt.query_map(params![prompt_id], |row| {
            Ok(Variant {
                id: row.get(0)?,
                prompt_id: row.get(1)?,
                name: row.get(2)?,
                content: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(variants)
    }

    pub fn create_variant(&self, prompt_id: &str, name: &str, content: &str) -> Result<Variant> {
        // Check variant limit
        let count: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM variants WHERE prompt_id = ?",
            params![prompt_id],
            |row| row.get(0),
        )?;

        if count >= 5 {
            return Err(rusqlite::Error::InvalidParameterName("Maximum 5 variants per prompt".to_string()));
        }

        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO variants (id, prompt_id, name, content) VALUES (?, ?, ?, ?)",
            params![id, prompt_id, name, content],
        )?;

        Ok(Variant {
            id,
            prompt_id: prompt_id.to_string(),
            name: name.to_string(),
            content: content.to_string(),
        })
    }

    pub fn update_variant(&self, id: &str, name: &str, content: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE variants SET name = ?, content = ? WHERE id = ?",
            params![name, content, id],
        )?;
        Ok(())
    }

    pub fn delete_variant(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM variants WHERE id = ?",
            params![id],
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
            "SELECT t.id, t.name, t.color FROM tags t INNER JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ? ORDER BY t.name"
        )?;

        let tags = stmt.query_map(params![prompt_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tags)
    }

    // Search
    pub fn search_prompts(&self, query: &str) -> Result<Vec<SearchResult>> {
        // Sanitize FTS5 query: escape special characters
        let sanitized = query.replace('"', "\"\"").replace('*', "").replace('-', "");
        let fts_query = format!("\"{}\"", sanitized);

        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.title, p.content, p.remark, p.category_id, p.is_favorite, p.created_at, p.updated_at
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
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).and_then(|rows| rows.collect::<Result<Vec<_>>>());

        // If FTS match fails (e.g. special chars), fall back to LIKE search
        let prompts = match prompts {
            Ok(p) if !p.is_empty() => p,
            _ => {
                let like_pattern = format!("%{}%", query);
                let mut fallback_stmt = self.conn.prepare(
                    "SELECT id, title, content, remark, category_id, is_favorite, created_at, updated_at
                     FROM prompts
                     WHERE title LIKE ?1 OR content LIKE ?1 OR remark LIKE ?1
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
                        created_at: row.get(6)?,
                        updated_at: row.get(7)?,
                    })
                })?.collect::<Result<Vec<_>>>()?;
                rows
            }
        };

        let query_lower = query.to_lowercase();
        let mut results = Vec::new();

        for prompt in prompts {
            // Check if the prompt itself matches (title, content, remark)
            let prompt_matches = prompt.title.to_lowercase().contains(&query_lower)
                || prompt.content.to_lowercase().contains(&query_lower)
                || prompt.remark.as_ref().map_or(false, |r| r.to_lowercase().contains(&query_lower));

            // Check variants for matches
            let variants = self.get_variants(&prompt.id)?;
            let matched_variant = variants.into_iter().find(|v| {
                v.content.to_lowercase().contains(&query_lower) ||
                v.name.to_lowercase().contains(&query_lower)
            });

            // Prompt match takes priority over variant match
            let match_source = if prompt_matches {
                "prompt".to_string()
            } else if matched_variant.is_some() {
                "variant".to_string()
            } else {
                "prompt".to_string()
            };

            results.push(SearchResult {
                prompt,
                matched_variant,
                match_source,
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

    pub fn create_snapshot(&self, name: Option<&str>) -> Result<Snapshot> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Collect all data
        let categories = self.get_categories()?;
        let tags = self.get_tags()?;
        let prompts = self.get_prompts(None, false)?;

        let mut all_variants = Vec::new();
        let mut all_prompt_tags = Vec::new();

        for prompt in &prompts {
            let variants = self.get_variants(&prompt.id)?;
            all_variants.extend(variants);

            let tags = self.get_prompt_tags(&prompt.id)?;
            for tag in tags {
                all_prompt_tags.push(PromptTag {
                    id: 0,
                    prompt_id: prompt.id.clone(),
                    tag_id: tag.id,
                });
            }
        }

        let snapshot_data = serde_json::json!({
            "categories": categories,
            "tags": tags,
            "prompts": prompts,
            "variants": all_variants,
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

        // Clear all data
        self.conn.execute("DELETE FROM prompt_tags", [])?;
        self.conn.execute("DELETE FROM variants", [])?;
        self.conn.execute("DELETE FROM prompts", [])?;
        self.conn.execute("DELETE FROM tags", [])?;
        self.conn.execute("DELETE FROM categories", [])?;

        // Restore categories
        if let Some(categories) = data["categories"].as_array() {
            for cat in categories {
                self.conn.execute(
                    "INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
                    params![
                        cat["id"].as_str().unwrap(),
                        cat["name"].as_str().unwrap(),
                        cat["parent_id"].as_str(),
                        cat["sort_order"].as_i64().unwrap() as i32,
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
                        tag["id"].as_str().unwrap(),
                        tag["name"].as_str().unwrap(),
                        tag["color"].as_str().unwrap(),
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
                        prompt["id"].as_str().unwrap(),
                        prompt["title"].as_str().unwrap(),
                        prompt["content"].as_str().unwrap(),
                        prompt["remark"].as_str(),
                        prompt["category_id"].as_str(),
                        prompt["is_favorite"].as_i64().unwrap() as i32,
                        prompt["created_at"].as_str().unwrap(),
                        prompt["updated_at"].as_str().unwrap(),
                    ],
                )?;
            }
        }

        // Restore variants
        if let Some(variants) = data["variants"].as_array() {
            for variant in variants {
                self.conn.execute(
                    "INSERT INTO variants (id, prompt_id, name, content) VALUES (?, ?, ?, ?)",
                    params![
                        variant["id"].as_str().unwrap(),
                        variant["prompt_id"].as_str().unwrap(),
                        variant["name"].as_str().unwrap(),
                        variant["content"].as_str().unwrap(),
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
                        pt["prompt_id"].as_str().unwrap(),
                        pt["tag_id"].as_str().unwrap(),
                    ],
                )?;
            }
        }

        Ok(())
    }

    pub fn delete_snapshot(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM snapshots WHERE id = ?",
            params![id],
        )?;
        Ok(())
    }

    // Export
    pub fn clear_all_data(&self) -> Result<()> {
        self.conn.execute("DELETE FROM prompt_tags", [])?;
        self.conn.execute("DELETE FROM variants", [])?;
        self.conn.execute("DELETE FROM prompts", [])?;
        self.conn.execute("DELETE FROM tags", [])?;
        self.conn.execute("DELETE FROM categories", [])?;
        Ok(())
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
        let categories = self.get_categories()?;
        let tags = self.get_tags()?;
        let prompts = self.get_prompts(None, false)?;

        let mut all_variants = Vec::new();
        let mut all_prompt_tags = Vec::new();

        for prompt in &prompts {
            let variants = self.get_variants(&prompt.id)?;
            all_variants.extend(variants);

            let tags = self.get_prompt_tags(&prompt.id)?;
            for tag in tags {
                all_prompt_tags.push(PromptTag {
                    id: 0,
                    prompt_id: prompt.id.clone(),
                    tag_id: tag.id,
                });
            }
        }

        let export_data = serde_json::json!({
            "categories": categories,
            "tags": tags,
            "prompts": prompts,
            "variants": all_variants,
            "prompt_tags": all_prompt_tags,
        });

        Ok(export_data.to_string())
    }

    pub fn export_prompts_json(&self, prompt_ids: &[String]) -> Result<String> {
        let mut prompts = Vec::new();
        let mut all_variants = Vec::new();
        let mut all_prompt_tags = Vec::new();
        let mut category_ids = Vec::new();
        let mut tag_ids = Vec::new();

        for id in prompt_ids {
            let prompt = self.get_prompt_by_id(id)?;
            if let Some(cid) = &prompt.category_id {
                category_ids.push(cid.clone());
            }
            prompts.push(prompt);

            let variants = self.get_variants(id)?;
            all_variants.extend(variants);

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
            "variants": all_variants,
            "prompt_tags": all_prompt_tags,
        });

        Ok(export_data.to_string())
    }

    pub fn import_json(&self, json_data: &str, strategy: &str) -> Result<()> {
        let data: serde_json::Value = serde_json::from_str(json_data)
            .map_err(|_| rusqlite::Error::InvalidParameterName("Invalid JSON data".to_string()))?;

        match strategy {
            "overwrite" => {
                // Clear existing data
                self.conn.execute("DELETE FROM prompt_tags", [])?;
                self.conn.execute("DELETE FROM variants", [])?;
                self.conn.execute("DELETE FROM prompts", [])?;
                self.conn.execute("DELETE FROM tags", [])?;
                self.conn.execute("DELETE FROM categories", [])?;

                // Import all
                self.import_data(&data)?;
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
                    "INSERT OR REPLACE INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
                    params![
                        cat["id"].as_str().unwrap(),
                        cat["name"].as_str().unwrap(),
                        cat["parent_id"].as_str(),
                        cat["sort_order"].as_i64().unwrap() as i32,
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
                        tag["id"].as_str().unwrap(),
                        tag["name"].as_str().unwrap(),
                        tag["color"].as_str().unwrap(),
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
                        prompt["id"].as_str().unwrap(),
                        prompt["title"].as_str().unwrap(),
                        prompt["content"].as_str().unwrap(),
                        prompt["remark"].as_str(),
                        prompt["category_id"].as_str(),
                        prompt["is_favorite"].as_i64().unwrap() as i32,
                        prompt["created_at"].as_str().unwrap(),
                        prompt["updated_at"].as_str().unwrap(),
                    ],
                )?;
            }
        }

        // Import variants
        if let Some(variants) = data["variants"].as_array() {
            for variant in variants {
                self.conn.execute(
                    "INSERT OR REPLACE INTO variants (id, prompt_id, name, content) VALUES (?, ?, ?, ?)",
                    params![
                        variant["id"].as_str().unwrap(),
                        variant["prompt_id"].as_str().unwrap(),
                        variant["name"].as_str().unwrap(),
                        variant["content"].as_str().unwrap(),
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
                        pt["prompt_id"].as_str().unwrap(),
                        pt["tag_id"].as_str().unwrap(),
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
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM categories WHERE id = ?",
                    params![cat["id"].as_str().unwrap()],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
                        params![
                            cat["id"].as_str().unwrap(),
                            cat["name"].as_str().unwrap(),
                            cat["parent_id"].as_str(),
                            cat["sort_order"].as_i64().unwrap() as i32,
                        ],
                    )?;
                }
            }
        }

        // Import tags if not exists
        if let Some(tags) = data["tags"].as_array() {
            for tag in tags {
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM tags WHERE id = ?",
                    params![tag["id"].as_str().unwrap()],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
                        params![
                            tag["id"].as_str().unwrap(),
                            tag["name"].as_str().unwrap(),
                            tag["color"].as_str().unwrap(),
                        ],
                    )?;
                }
            }
        }

        // Import prompts if not exists
        if let Some(prompts) = data["prompts"].as_array() {
            for prompt in prompts {
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM prompts WHERE id = ?",
                    params![prompt["id"].as_str().unwrap()],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        params![
                            prompt["id"].as_str().unwrap(),
                            prompt["title"].as_str().unwrap(),
                            prompt["content"].as_str().unwrap(),
                            prompt["remark"].as_str(),
                            prompt["category_id"].as_str(),
                            prompt["is_favorite"].as_i64().unwrap() as i32,
                            prompt["created_at"].as_str().unwrap(),
                            prompt["updated_at"].as_str().unwrap(),
                        ],
                    )?;
                }
            }
        }

        // Import variants if not exists
        if let Some(variants) = data["variants"].as_array() {
            for variant in variants {
                let exists: bool = self.conn.query_row(
                    "SELECT COUNT(*) > 0 FROM variants WHERE id = ?",
                    params![variant["id"].as_str().unwrap()],
                    |row| row.get(0),
                )?;

                if !exists {
                    self.conn.execute(
                        "INSERT INTO variants (id, prompt_id, name, content) VALUES (?, ?, ?, ?)",
                        params![
                            variant["id"].as_str().unwrap(),
                            variant["prompt_id"].as_str().unwrap(),
                            variant["name"].as_str().unwrap(),
                            variant["content"].as_str().unwrap(),
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
                        pt["prompt_id"].as_str().unwrap(),
                        pt["tag_id"].as_str().unwrap(),
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
                let old_id = cat["id"].as_str().unwrap().to_string();
                let new_id = Uuid::new_v4().to_string();
                category_id_map.insert(old_id, new_id.clone());

                self.conn.execute(
                    "INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)",
                    params![
                        new_id,
                        cat["name"].as_str().unwrap(),
                        cat["parent_id"].as_str(),
                        cat["sort_order"].as_i64().unwrap() as i32,
                    ],
                )?;
            }
        }

        // Import tags with new IDs
        if let Some(tags) = data["tags"].as_array() {
            for tag in tags {
                let old_id = tag["id"].as_str().unwrap().to_string();
                let new_id = Uuid::new_v4().to_string();
                tag_id_map.insert(old_id, new_id.clone());

                self.conn.execute(
                    "INSERT INTO tags (id, name, color) VALUES (?, ?, ?)",
                    params![
                        new_id,
                        tag["name"].as_str().unwrap(),
                        tag["color"].as_str().unwrap(),
                    ],
                )?;
            }
        }

        // Import prompts with new IDs
        if let Some(prompts) = data["prompts"].as_array() {
            for prompt in prompts {
                let old_id = prompt["id"].as_str().unwrap().to_string();
                let new_id = Uuid::new_v4().to_string();
                prompt_id_map.insert(old_id, new_id.clone());

                let category_id = prompt["category_id"].as_str()
                    .and_then(|cid| category_id_map.get(cid))
                    .cloned();

                self.conn.execute(
                    "INSERT INTO prompts (id, title, content, remark, category_id, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        new_id,
                        prompt["title"].as_str().unwrap(),
                        prompt["content"].as_str().unwrap(),
                        prompt["remark"].as_str(),
                        category_id,
                        prompt["is_favorite"].as_i64().unwrap() as i32,
                        prompt["created_at"].as_str().unwrap(),
                        prompt["updated_at"].as_str().unwrap(),
                    ],
                )?;
            }
        }

        // Import variants with new IDs
        if let Some(variants) = data["variants"].as_array() {
            for variant in variants {
                let new_id = Uuid::new_v4().to_string();

                let prompt_id = variant["prompt_id"].as_str()
                    .and_then(|pid| prompt_id_map.get(pid))
                    .cloned()
                    .unwrap_or_else(|| variant["prompt_id"].as_str().unwrap().to_string());

                self.conn.execute(
                    "INSERT INTO variants (id, prompt_id, name, content) VALUES (?, ?, ?, ?)",
                    params![
                        new_id,
                        prompt_id,
                        variant["name"].as_str().unwrap(),
                        variant["content"].as_str().unwrap(),
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
                    .unwrap_or_else(|| pt["prompt_id"].as_str().unwrap().to_string());

                let tag_id = pt["tag_id"].as_str()
                    .and_then(|tid| tag_id_map.get(tid))
                    .cloned()
                    .unwrap_or_else(|| pt["tag_id"].as_str().unwrap().to_string());

                self.conn.execute(
                    "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                    params![prompt_id, tag_id],
                )?;
            }
        }

        Ok(())
    }
}