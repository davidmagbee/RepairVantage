import { parseDateTimeInput } from '../time/date-time';

export type TimeOccurrence = 'reject' | 'earlier' | 'later';

/** Repeated daylight-saving wall times require an explicit occurrence; skipped times are never shifted silently. */
export default function DateTimeInput({ label, name, value, timeZone, occurrence, onChange, onOccurrence, disabled }: {
  label: string; name: string; value: string; timeZone: string; occurrence: TimeOccurrence;
  onChange: (value: string) => void; onOccurrence: (value: TimeOccurrence) => void; disabled?: boolean;
}) {
  const result = parseDateTimeInput(value, timeZone);
  return (
    <div className="space-y-2 min-w-0">
      <label className="form-control gap-1"><span>{label}</span>
        <input className="input input-bordered w-full" type="datetime-local" name={name} value={value} max="9999-12-31T23:59" disabled={disabled}
          onChange={event => { onChange(event.target.value); onOccurrence('reject'); }} />
      </label>
      {!result.ok && result.kind === 'ambiguous' && (
        <label className="form-control gap-1"><span>{label}: repeated hour</span>
          <select className="select select-bordered w-full" aria-label={`${label} occurrence`} disabled={disabled} value={occurrence} onChange={event => onOccurrence(event.target.value as TimeOccurrence)}>
            <option value="reject">Choose which occurrence</option>
            <option value="earlier">First occurrence · before clocks move back</option>
            <option value="later">Second occurrence · after clocks move back</option>
          </select>
        </label>
      )}
    </div>
  );
}
