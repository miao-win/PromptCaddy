export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  remark: string | null;
  category_id: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: string;
  prompt_id: string;
  name: string;
  content: string;
}

export interface PromptTag {
  id: number;
  prompt_id: string;
  tag_id: string;
}

export interface Snapshot {
  id: string;
  name: string | null;
  snapshot_data: string;
  created_at: string;
}

export interface SearchResult {
  prompt: Prompt;
  matched_variant: Variant | null;
  match_source: string;
}

export interface ExportData {
  categories: Category[];
  tags: Tag[];
  prompts: Prompt[];
  variants: Variant[];
  prompt_tags: PromptTag[];
}