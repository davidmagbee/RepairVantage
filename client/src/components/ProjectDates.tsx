import { useMutation } from '@apollo/client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { privateOperation } from '../graphql/client';
import { UPDATE_PROJECT_DATES } from '../graphql/mutations';
import type { Project } from '../graphql/queries';

function inputDate(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function parseInput(value: string) {
  if (!value) return null;
  // datetime-local has no zone; round-trip explicitly through UTC to reject normalized invalid dates.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value ? date.toISOString() : undefined;
}

export default function ProjectDates({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [baseline, setBaseline] = useState<{ startDate?: string | null; endDate?: string | null }>({});
  const [validationError, setValidationError] = useState('');
  const [updateDates, { loading, error, reset }] = useMutation(UPDATE_PROJECT_DATES, {
    context: privateOperation,
    onCompleted: () => setEditing(false),
    onError: () => {},
  });
  const canEdit = project.canManage && !project.archivedAt;

  function beginEdit() {
    // Snapshot only date fields; unrelated editor saves must not replace this draft or its precision.
    setBaseline({ startDate: project.startDate, endDate: project.endDate });
    setStart(inputDate(project.startDate));
    setEnd(inputDate(project.endDate));
    setValidationError('');
    reset();
    setEditing(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    reset();
    const startInput = event.currentTarget.elements.namedItem('startDate') as HTMLInputElement;
    const endInput = event.currentTarget.elements.namedItem('endDate') as HTMLInputElement;
    const parsedStart = parseInput(start);
    const parsedEnd = parseInput(end);
    if (startInput.validity.badInput || endInput.validity.badInput || parsedStart === undefined || parsedEnd === undefined) {
      setValidationError('Enter valid project dates in UTC.');
      return;
    }
    const startChanged = start !== inputDate(baseline.startDate);
    const endChanged = end !== inputDate(baseline.endDate);
    // Omit untouched values instead of rounding existing seconds down to the input's minute precision.
    const input = {
      ...(startChanged && { startDate: parsedStart }),
      ...(endChanged && { endDate: parsedEnd }),
    };
    const effectiveStart = startChanged ? parsedStart : baseline.startDate;
    const effectiveEnd = endChanged ? parsedEnd : baseline.endDate;
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd).getTime() < new Date(effectiveStart).getTime()) {
      setValidationError('Project end must be on or after project start.');
      return;
    }
    if (!Object.keys(input).length) {
      setEditing(false);
      return;
    }
    void updateDates({ variables: { id: project.id, input } });
  }

  const message = validationError || (error && 'Could not update project dates. Try again.');
  return (
    <section className="space-y-3" aria-label="Project dates">
      <dl className="flex flex-wrap gap-4">
        <div>
          <dt className="font-semibold">Start (UTC)</dt>
          <dd>{project.startDate ? <time dateTime={project.startDate}>{inputDate(project.startDate).replace('T', ' ')} UTC</time> : 'Not set'}</dd>
        </div>
        <div>
          <dt className="font-semibold">End (UTC)</dt>
          <dd>{project.endDate ? <time dateTime={project.endDate}>{inputDate(project.endDate).replace('T', ' ')} UTC</time> : 'Not set'}</dd>
        </div>
      </dl>
      {canEdit && (editing ? (
        <form aria-label="Edit project dates" className="space-y-3" noValidate onSubmit={submit}>
          <label className="form-control gap-1">
            <span>Project start (UTC)</span>
            <input className="input input-bordered" type="datetime-local" name="startDate" value={start} onChange={event => setStart(event.target.value)} disabled={loading} />
          </label>
          <label className="form-control gap-1">
            <span>Project end (UTC)</span>
            <input className="input input-bordered" type="datetime-local" name="endDate" value={end} onChange={event => setEnd(event.target.value)} disabled={loading} />
          </label>
          {message && <p className="alert alert-error" role="alert">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save dates'}</button>
            <button className="btn btn-ghost" type="button" disabled={loading} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : <button className="btn btn-outline btn-sm" type="button" onClick={beginEdit}>Edit dates</button>)}
    </section>
  );
}
