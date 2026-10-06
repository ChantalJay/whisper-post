import type { PromptCategory } from '@/lib/prompts';

export function CategoryPicker({
  categories,
  selected,
  onSelect
}: {
  categories: PromptCategory[];
  selected: PromptCategory;
  onSelect: (category: PromptCategory) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">Choose a mood</legend>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            aria-pressed={category.id === selected.id}
            className={`category-option ${category.id === selected.id ? 'selected' : ''}`}
            key={category.id}
            onClick={() => onSelect(category)}
            type="button"
          >
            <span>{category.emoji}</span>
            {category.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
