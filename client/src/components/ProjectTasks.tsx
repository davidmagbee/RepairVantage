import { useMutation, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { privateOperation } from '../graphql/client';
import TaskBoard from './TaskBoard';
import {
  CREATE_PROJECT_TASK, DELETE_PROJECT_TASK, GET_PROJECT_TASKS, SET_PROJECT_TASK_ASSIGNEE, UPDATE_PROJECT_TASK,
  taskStatusLabels, taskStatuses, type ProjectTaskMember, type Task, type TaskInput, type TaskStatus,
} from '../graphql/tasks';

function localDateTime(date: Date) {
  // datetime-local expects a wall time without an offset.
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type TaskAction = { kind: 'create' } | { kind: 'edit' | 'assign' | 'delete'; task: Task };

function TaskEditor({ task, pending, onSave, onCancel }: {
  task?: Task;
  pending: boolean;
  onSave: (input: TaskInput) => void;
  onCancel: () => void;
}) {
  const [validationError, setValidationError] = useState('');
  const savedDue = task?.dueDate ? localDateTime(new Date(task.dueDate)) : '';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    const form = new FormData(event.currentTarget);
    const rawName = String(form.get('name'));
    const name = rawName === task?.name ? task.name : rawName.trim();
    if (!name) {
      setValidationError('Enter a task name.');
      return;
    }
    const due = String(form.get('dueDate'));
    let dueDate = task?.dueDate ?? null;
    // The control displays minutes. Preserve the original seconds and offset if it is untouched.
    if (due !== savedDue) {
      dueDate = null;
      if (due) {
        const date = new Date(due);
        if (!Number.isFinite(date.getTime()) || localDateTime(date) !== due) {
          setValidationError('Enter a valid local due date and time.');
          return;
        }
        dueDate = date.toISOString();
      }
    }
    const description = String(form.get('description'));
    const savedDescription = (task?.description ?? '').replace(/\r\n?/g, '\n');
    const estimatedHours = form.get('estimatedHours');
    const actualHours = form.get('actualHours');
    onSave({
      name,
      description: task && description === savedDescription ? task.description : description.trim() || null,
      status: form.get('status') as TaskStatus,
      dueDate,
      // Empty fields clear recorded time. A typed zero remains a recorded value.
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      actualHours: actualHours ? Number(actualHours) : null,
    });
  }

  return (
    <form className="space-y-3 rounded-box border border-base-300 p-4" onSubmit={submit}>
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="font-bold">{task ? 'Edit task' : 'New task'}</legend>
        <label className="form-control gap-1">
          <span>Task name</span>
          <input className="input input-bordered" name="name" defaultValue={task?.name} maxLength={120} autoFocus required />
        </label>
        <label className="form-control gap-1">
          <span>Description (optional)</span>
          <textarea className="textarea textarea-bordered" name="description" defaultValue={task?.description ?? ''} maxLength={2000} rows={3} />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="form-control gap-1">
            <span>Task status</span>
            <select className="select select-bordered" name="status" defaultValue={task?.status ?? 'TODO'}>
              {taskStatuses.map(status => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}
            </select>
          </label>
          <label className="form-control gap-1">
            <span>Due date and time (local, optional)</span>
            <input className="input input-bordered" type="datetime-local" name="dueDate" defaultValue={savedDue} max="9999-12-31T23:59" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="form-control gap-1">
            <span>Estimated hours (optional)</span>
            <input className="input input-bordered" type="number" name="estimatedHours" defaultValue={task?.estimatedHours ?? ''} min="0" step="any" />
          </label>
          <label className="form-control gap-1">
            <span>Actual hours (optional)</span>
            <input className="input input-bordered" type="number" name="actualHours" defaultValue={task?.actualHours ?? ''} min="0" step="any" />
          </label>
        </div>
        {validationError && <p className="alert alert-error" role="alert">{validationError}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">
            {pending ? 'Saving…' : task ? 'Save task' : 'Create task'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
    </form>
  );
}

export default function ProjectTasks({ projectId, canManage, readOnly }: {
  projectId: string;
  canManage: boolean;
  readOnly: boolean;
}) {
  const { data, loading, error, refetch } = useQuery<{ tasks: Task[]; projectMembers?: ProjectTaskMember[] }>(GET_PROJECT_TASKS, {
    context: privateOperation,
    // The API scopes task reads. Request the member roster only for the owner assignment form.
    variables: { projectId, canManage },
    fetchPolicy: 'network-only',
  });
  const [createTask] = useMutation(CREATE_PROJECT_TASK, { context: privateOperation });
  const [updateTask] = useMutation(UPDATE_PROJECT_TASK, { context: privateOperation });
  const [deleteTask] = useMutation(DELETE_PROJECT_TASK, { context: privateOperation });
  const [setTaskAssignee] = useMutation(SET_PROJECT_TASK_ASSIGNEE, { context: privateOperation });
  const [action, setAction] = useState<TaskAction | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [writeError, setWriteError] = useState('');

  function refresh() {
    // A failed refresh belongs to the query alert, even after a write succeeded.
    return refetch().catch(() => {});
  }

  function closeAction() {
    setAction(null);
    setWriteError('');
  }

  async function change(write: () => Promise<unknown>, failure: string) {
    setPending(true);
    setNotice('');
    setWriteError('');
    try {
      await write();
      closeAction();
      setNotice('Task board updated.');
      await refresh();
    } catch {
      setWriteError(failure);
    } finally {
      setPending(false);
    }
  }

  function save(input: TaskInput) {
    if (action?.kind === 'create') {
      void change(() => createTask({ variables: { input: { ...input, projectId } } }), 'Could not create the task. Try again.');
      return;
    }
    if (action?.kind !== 'edit') return;
    const { task } = action;
    // Send only edited fields so a separate status change does not replace a saved description or deadline.
    const changes: Partial<TaskInput> = {
      ...(input.name !== task.name && { name: input.name }),
      ...(input.description !== task.description && { description: input.description }),
      ...(input.status !== task.status && { status: input.status }),
      ...(input.dueDate !== task.dueDate && { dueDate: input.dueDate }),
      ...(input.estimatedHours !== task.estimatedHours && { estimatedHours: input.estimatedHours }),
      ...(input.actualHours !== task.actualHours && { actualHours: input.actualHours }),
    };
    if (Object.keys(changes).length) {
      void change(() => updateTask({ variables: { id: task.id, input: changes } }), 'Could not update the task. Try again.');
    } else {
      closeAction();
    }
  }

  function assign(event: FormEvent<HTMLFormElement>, task: Task) {
    event.preventDefault();
    const userId = String(new FormData(event.currentTarget).get('assignee') || '') || null;
    if (userId === (task.assignee?.id ?? null)) {
      closeAction();
      return;
    }
    void change(
      () => setTaskAssignee({ variables: { id: task.id, userId } }),
      'Could not change the assignee. Check project membership and try again.',
    );
  }

  return (
    <section className="space-y-4 rounded-box bg-base-100 p-4 shadow sm:p-6" aria-labelledby="project-tasks-heading">
      <h2 className="text-xl font-bold" id="project-tasks-heading">Tasks</h2>
      {loading && <p role="status">Loading tasks…</p>}
      {error && (
        <div className="space-y-2">
          <p className="alert alert-error" role="alert">Could not load tasks.</p>
          <button className="btn btn-outline" type="button" onClick={() => { void refresh(); }}>Retry tasks</button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {writeError && <p className="alert alert-error" role="alert">{writeError}</p>}
      {data && (
        <>
          {readOnly ? <p>Tasks are read-only while this project is archived.</p> : (
            <>
              {canManage && !action && (
                <button className="btn btn-primary" type="button" onClick={() => setAction({ kind: 'create' })} disabled={pending}>Add task</button>
              )}
              {(action?.kind === 'edit' || (canManage && action?.kind === 'create')) && (
                <TaskEditor task={action.kind === 'edit' ? action.task : undefined} pending={pending} onSave={save} onCancel={closeAction} />
              )}
              {canManage && action?.kind === 'assign' && (
                <form className="space-y-2 rounded-box border border-base-300 p-4" onSubmit={event => assign(event, action.task)}>
                  <p>Assign <strong>{action.task.name}</strong> to an existing project member.</p>
                  <label className="form-control gap-1">
                    <span>Task assignee</span>
                    <select className="select select-bordered" name="assignee" defaultValue={action.task.assignee?.id ?? ''} disabled={pending} autoFocus>
                      <option value="">Unassigned</option>
                      {data.projectMembers?.map(({ user }) => (
                        <option key={user.id} value={user.id}>{user.name ? `${user.name} · ${user.email}` : user.email}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost" type="button" disabled={pending} onClick={closeAction}>Cancel</button>
                    <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save assignee'}</button>
                  </div>
                </form>
              )}
              {canManage && action?.kind === 'delete' && (
                <div className="space-y-2 rounded-box border border-base-300 p-4" role="group" aria-label="Confirm task deletion">
                  <p>Delete <strong>{action.task.name}</strong>? This is permanent.</p>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost" type="button" disabled={pending} onClick={closeAction} autoFocus>Cancel</button>
                    <button className="btn btn-error" type="button" disabled={pending} onClick={() => {
                      void change(() => deleteTask({ variables: { id: action.task.id } }), 'Could not delete the task. Try again.');
                    }}>Delete task</button>
                  </div>
                </div>
              )}
            </>
          )}
          <TaskBoard
            tasks={data.tasks}
            canManage={canManage}
            readOnly={readOnly}
            busy={pending || Boolean(action)}
            onEdit={task => setAction({ kind: 'edit', task })}
            onAssign={task => setAction({ kind: 'assign', task })}
            onDelete={task => setAction({ kind: 'delete', task })}
            onMove={(task, status) => {
              void change(() => updateTask({ variables: { id: task.id, input: { status } } }), 'Could not move the task. Try again.');
            }}
          />
        </>
      )}
    </section>
  );
}
