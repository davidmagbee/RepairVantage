import { gql, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';

const GET_SCHEDULE = gql`
  query GetSchedule($from: DateTime!, $to: DateTime!) {
    schedule(from: $from, to: $to) {
      id kind projectId projectName name startAt endAt assigneeName tools { name quantity }
    }
  }
`;

type Entry = {
  id: string; kind: 'PROJECT' | 'TASK'; projectId: string; projectName: string; name: string;
  startAt: string; endAt: string; assigneeName: string | null; tools: { name: string; quantity: number }[];
};

const dayMs = 86_400_000;
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateLabel = (time: number) => new Date(time).toISOString().slice(0, 10);

function monthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return { start: Date.UTC(year, month, 1), end: Date.UTC(year, month + 1, 1) };
}

function EntryDetails({ entry }: { entry: Entry }) {
  const first = entry.startAt.slice(0, 10);
  const last = entry.endAt.slice(0, 10);
  return (
    <div className="space-y-1 text-sm">
      <Link className="link link-hover font-semibold" to={`/projects/${entry.projectId}`}>{entry.name}</Link>
      <p>{entry.kind === 'TASK' ? `Task · ${entry.projectName}` : 'Project'} · {first}{first !== last && ` – ${last}`}</p>
      {entry.assigneeName && <p>Assignee: {entry.assigneeName}</p>}
      {entry.tools.length > 0 && <p>Project tools: {entry.tools.map(tool => `${tool.name} × ${tool.quantity}`).join(', ')}</p>}
    </div>
  );
}

export default function Schedule() {
  const [range, setRange] = useState(monthRange);
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar');
  const [rangeError, setRangeError] = useState(false);
  const count = (range.end - range.start) / dayMs;
  const { data, loading, error, refetch } = useQuery<{ schedule: Entry[] }>(GET_SCHEDULE, {
    context: privateOperation, fetchPolicy: 'network-only',
    variables: { from: new Date(range.start).toISOString(), to: new Date(range.end).toISOString() },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const start = Date.parse(`${fields.get('start')}T00:00:00.000Z`);
    // The last date is inclusive in the form and exclusive on the wire.
    const end = Date.parse(`${fields.get('end')}T00:00:00.000Z`) + dayMs;
    const valid = Number.isFinite(start) && end > start && end - start <= 93 * dayMs;
    setRangeError(!valid);
    if (valid) setRange({ start, end });
  }

  const entries = data?.schedule.map(entry => ({
    entry,
    // Clip bars to the visible range while keeping full dates in the textual label.
    firstDay: Math.max(0, Math.floor((Date.parse(entry.startAt) - range.start) / dayMs)),
    lastDay: Math.min(count - 1, Math.floor((Date.parse(entry.endAt) - range.start) / dayMs)),
  }));

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Schedule</h1>
      <p>Dates are shown in UTC. The calendar places each item on its first visible day. Timeline shows its full visible span.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <label className="form-control gap-1">From date<input className="input input-bordered" name="start" type="date" defaultValue={dateLabel(range.start)} required /></label>
        <label className="form-control gap-1">Through date<input className="input input-bordered" name="end" type="date" defaultValue={dateLabel(range.end - dayMs)} required /></label>
        <button type="submit" className="btn btn-primary">Apply range</button>
      </form>
      {rangeError && <p role="alert" className="alert alert-error">Choose a date range from 1 to 93 days.</p>}
      <div className="flex gap-2" role="group" aria-label="Schedule view">
        <button type="button" className="btn btn-outline" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button>
        <button type="button" className="btn btn-outline" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</button>
      </div>
      {loading && <p role="status">Loading schedule…</p>}
      {error && <div className="space-y-2">
        <p role="alert" className="alert alert-error">Could not load schedule.</p>
        <button type="button" className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Retry schedule</button>
      </div>}
      {!loading && !error && entries && (entries.length === 0 ? <p>No scheduled work in this range.</p> : view === 'calendar' ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 gap-2" aria-hidden="true">
            {weekdays.map(day => <span key={day} className="font-semibold">{day}</span>)}
          </div>
          <ol aria-label="Calendar dates" className="grid min-w-[42rem] grid-cols-7 gap-2">
            {Array.from({ length: count }, (_, index) => {
              const day = dateLabel(range.start + index * dayMs);
              return (
                <li key={day} style={index === 0 ? { gridColumnStart: new Date(range.start).getUTCDay() + 1 } : undefined}
                  className="min-h-16 space-y-2 rounded-box border border-base-300 bg-base-100 p-2">
                  <time dateTime={day} className="text-sm font-semibold">{day}</time>
                  {entries.filter(({ firstDay }) => firstDay === index).map(({ entry }) => (
                    <EntryDetails key={`${entry.kind}:${entry.id}`} entry={entry} />
                  ))}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <ol aria-label="Timeline rows" className="space-y-3">
          <li className="flex justify-between text-sm font-semibold">
            <time dateTime={dateLabel(range.start)}>{dateLabel(range.start)}</time>
            <time dateTime={dateLabel(range.end - dayMs)}>{dateLabel(range.end - dayMs)}</time>
          </li>
          {entries.map(({ entry, firstDay, lastDay }) => (
            <li key={`${entry.kind}:${entry.id}`} className="space-y-2 rounded-box bg-base-100 p-3">
              <EntryDetails entry={entry} />
              <div aria-hidden="true" className="relative h-3 rounded bg-base-300">
                <div className="absolute h-full rounded bg-primary" style={{ left: `${firstDay / count * 100}%`, width: `${(lastDay - firstDay + 1) / count * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ))}
    </section>
  );
}
