import { useDraggable } from '@dnd-kit/core';
import PromptCard from './PromptCard';
import { Prompt } from '../types';

interface DraggablePromptCardProps {
  prompt: Prompt;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
  onFocus?: (promptId: string | null) => void;
  searchQuery?: string;
}

export default function DraggablePromptCard({ prompt, isSelected, isMultiSelectMode, onFocus, searchQuery }: DraggablePromptCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ id: prompt.id });

  const style = {
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PromptCard
        prompt={prompt}
        isSelected={isSelected}
        isMultiSelectMode={isMultiSelectMode}
        onFocus={onFocus}
        searchQuery={searchQuery}
      />
    </div>
  );
}
