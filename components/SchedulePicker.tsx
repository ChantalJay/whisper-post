'use client';

const presets = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'Tomorrow at 9', days: 1, hour: 9 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 }
];

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function SchedulePicker({
  scheduled,
  onScheduledChange,
  value,
  onValueChange
}: {
  scheduled: boolean;
  onScheduledChange: (scheduled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const now = new Date();
  const min = new Date(now.getTime() + 60_000);
  const max = new Date(now);
  max.setDate(max.getDate() + 365);

  function setPreset(preset: (typeof presets)[number]) {
    const date = new Date();
    if (preset.hours) date.setHours(date.getHours() + preset.hours);
    if (preset.days) date.setDate(date.getDate() + preset.days);
    if (preset.hour !== undefined) date.setHours(preset.hour, 0, 0, 0);
    onValueChange(localDateTime(date));
  }

  return (
    <fieldset className="schedule-box">
      <legend className="field-label">Delivery time</legend>
      <div className="schedule-switch">
        <button aria-pressed={!scheduled} className={!scheduled ? 'selected' : ''} onClick={() => onScheduledChange(false)} type="button">
          Send now
        </button>
        <button aria-pressed={scheduled} className={scheduled ? 'selected' : ''} onClick={() => onScheduledChange(true)} type="button">
          Schedule for later
        </button>
      </div>
      {scheduled && (
        <div className="schedule-options">
          <label className="field-label" htmlFor="schedule-date">Your local time</label>
          <input
            id="schedule-date"
            max={localDateTime(max)}
            min={localDateTime(min)}
            onChange={(event) => onValueChange(event.target.value)}
            required
            type="datetime-local"
            value={value}
          />
          <div className="preset-row">
            {presets.map((preset) => (
              <button key={preset.label} onClick={() => setPreset(preset)} type="button">{preset.label}</button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}
