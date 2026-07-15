import { Category } from '../types';

/** Build the full category path string like "Parent - Child" */
export function buildCategoryPath(cat: Category, categories: Category[]): string {
  const parts: string[] = [cat.name];
  let current = cat;
  while (current.parent_id) {
    const parent = categories.find(c => c.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' - ');
}

/** Get a flat list of all categories with their full path labels, ordered by tree hierarchy. */
export function getFlatCategoryList(categories: Category[]): { id: string; label: string }[] {
  const rootCats = categories.filter(c => !c.parent_id);
  const result: { id: string; label: string }[] = [];
  const traverse = (cat: Category) => {
    result.push({ id: cat.id, label: buildCategoryPath(cat, categories) });
    const children = categories.filter(c => c.parent_id === cat.id);
    children.forEach(child => traverse(child));
  };
  rootCats.forEach(cat => traverse(cat));
  return result;
}
