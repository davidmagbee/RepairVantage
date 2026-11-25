import { useMutation } from '@apollo/client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { privateOperation } from '../graphql/client';
import { UPDATE_PROJECT_DATES } from '../graphql/mutations';
import type { Project } from '../graphql/queries';
import { useTimeZone } from '../context/TimeZoneContext';
import { dateTimeInput, formatDateTime, occurrenceForInstant, parseDateTimeInput } from '../time/date-time';
import DateTimeInput, { type TimeOccurrence } from './DateTimeInput';

export default function ProjectDates({ project }: { project: Project }) {
  const { timeZone } = useTimeZone();
  const [editing, setEditing] = useState(false);
  const [editZone, setEditZone] = useState(timeZone);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [startOccurrence, setStartOccurrence] = useState<TimeOccurrence>('reject');
  const [endOccurrence, setEndOccurrence] = useState<TimeOccurrence>('reject');
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
    // Freeze the editing zone so a display-preference change cannot reinterpret a pending wall-time draft.
    setEditZone(timeZone);
    setStart(dateTimeInput(project.startDate, timeZone));
    setEnd(dateTimeInput(project.endDate, timeZone));
    setStartOccurrence(occurrenceForInstant(project.startDate, timeZone));
    setEndOccurrence(occurrenceForInstant(project.endDate, timeZone));
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
    const startChanged = start !== dateTimeInput(baseline.startDate, editZone) || startOccurrence !== occurrenceForInstant(baseline.startDate, editZone);
    const endChanged = end !== dateTimeInput(baseline.endDate, editZone) || endOccurrence !== occurrenceForInstant(baseline.endDate, editZone);
    const parsedStart = startChanged ? parseDateTimeInput(start, editZone, startOccurrence) : { ok: true as const, value: baseline.startDate ?? null };
    const parsedEnd = endChanged ? parseDateTimeInput(end, editZone, endOccurrence) : { ok: true as const, value: baseline.endDate ?? null };
    if (startInput.validity.badInput || endInput.validity.badInput) {
      setValidationError('Enter valid project dates and times.');
      return;
    }
    if (!parsedStart.ok || !parsedEnd.ok) {
      setValidationError(!parsedStart.ok ? parsedStart.error : !parsedEnd.ok ? parsedEnd.error : 'Enter valid dates.');
      return;
    }
    // Omit untouched values instead of rounding existing seconds down to the input's minute precision.
    const input = {
      ...(startChanged && { startDate: parsedStart.value }),
      ...(endChanged && { endDate: parsedEnd.value }),
    };
    const effectiveStart = parsedStart.value;
    const effectiveEnd = parsedEnd.value;
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
      <p className="text-sm text-slate-500">Times shown in {timeZone.replace(/_/g, ' ')}</p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Start</dt>
          <dd>{project.startDate ? <time dateTime={project.startDate}>{formatDateTime(project.startDate, timeZone)}</time> : 'Not set'}</dd>
        </div>
        <div>
          <dt className="font-semibold">End</dt>
          <dd>{project.endDate ? <time dateTime={project.endDate}>{formatDateTime(project.endDate, timeZone)}</time> : 'Not set'}</dd>
        </div>
      </dl>
      {canEdit && (editing ? (
        <form aria-label="Edit project dates" className="space-y-3" noValidate onSubmit={submit}>
          <p className="text-sm">Editing in {editZone.replace(/_/g, ' ')}. Dates keep this time zone until you save or cancel.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateTimeInput label="Project start" name="startDate" value={start} timeZone={editZone} occurrence={startOccurrence} onChange={setStart} onOccurrence={setStartOccurrence} disabled={loading} />
            <DateTimeInput label="Project end" name="endDate" value={end} timeZone={editZone} occurrence={endOccurrence} onChange={setEnd} onOccurrence={setEndOccurrence} disabled={loading} />
          </div>
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
