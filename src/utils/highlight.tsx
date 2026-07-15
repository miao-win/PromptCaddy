import React from 'react';

/**
 * Split text by search terms and wrap matches in <mark> tags.
 * Case-insensitive, supports multiple search terms (space-separated).
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;

  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  // Build a regex that matches any of the search terms
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (terms.some(t => part.toLowerCase() === t.toLowerCase())) {
      return (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      );
    }
    return part;
  });
}
