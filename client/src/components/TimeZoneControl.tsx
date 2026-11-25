import { useState } from 'react';
import { useTimeZone } from '../context/TimeZoneContext';
import { DEFAULT_TIME_ZONE, detectTimeZone } from '../time/date-time';

const names: Record<string, string> = {
  'America/New_York': 'Eastern Time · New York',
  'America/Chicago': 'Central Time · Chicago',
  'America/Denver': 'Mountain Time · Denver',
  'America/Los_Angeles': 'Pacific Time · Los Angeles',
  'America/Anchorage': 'Alaska Time · Anchorage',
  'Pacific/Honolulu': 'Hawaii Time · Honolulu',
  UTC: 'UTC',
};

/** Use the browser's IANA database where available; common zones remain usable on older browsers. */
function availableZones() {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  return intl.supportedValuesOf?.('timeZone') ?? Object.keys(names);
}

export default function TimeZoneControl() {
  const { timeZone, setTimeZone } = useTimeZone();
  const [zones] = useState(availableZones);
  const choices = [...new Set([DEFAULT_TIME_ZONE, detectTimeZone(), timeZone, 'UTC', ...zones])];
  return (
    <div className="workspace-time-zone print:hidden">
      <label className="form-control gap-1"><span>Time zone</span>
        <select className="select select-bordered select-sm" aria-label="Display time zone" value={timeZone} onChange={event => setTimeZone(event.target.value)}>
          {choices.map(zone => <option key={zone} value={zone}>{names[zone] ?? zone.replace(/_/g, ' ')}</option>)}
        </select>
      </label>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setTimeZone(detectTimeZone())}>Use device time zone</button>
    </div>
  );
}
