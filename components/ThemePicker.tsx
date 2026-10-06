import type { EmailTheme } from '@/lib/validation/message';

const options: { id: EmailTheme; label: string; swatch: string }[] = [
  { id: 'midnight', label: 'Midnight', swatch: 'swatch-midnight' },
  { id: 'neon', label: 'Neon', swatch: 'swatch-neon' },
  { id: 'golden', label: 'Golden hour', swatch: 'swatch-golden' },
  { id: 'minimal', label: 'Minimal', swatch: 'swatch-minimal' }
];

export function ThemePicker({ value, onChange }: { value: EmailTheme; onChange: (theme: EmailTheme) => void }) {
  return (
    <fieldset>
      <legend className="field-label">Email style</legend>
      <div className="theme-grid">
        {options.map((option) => (
          <button
            aria-pressed={option.id === value}
            className={`theme-option ${option.id === value ? 'selected' : ''}`}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <span className={`theme-swatch ${option.swatch}`} />
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
