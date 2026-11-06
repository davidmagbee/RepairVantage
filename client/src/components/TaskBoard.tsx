import type { DragEvent } from 'react';
import { taskStatusLabels, taskStatuses, type Task, type TaskStatus } from '../graphql/tasks';

const taskDragType = 'application/x-repairvantage-task';

function allowTaskDrop(event: DragEvent<HTMLElement>) {
  // Accept task drags only. Keep ordinary text and link drops out of the board.
  if (!event.dataTransfer.types.includes(taskDragType)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

export default function TaskBoard({ tasks, readOnly, busy, onEdit, onDelete, onMove }: {
  tasks: Task[];
  readOnly: boolean;
  busy: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
}) {
  const canMove = !readOnly && !busy;

  function dropTask(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData(taskDragType);
    const task = tasks.find(item => item.id === id);
    if (task && task.status !== status) onMove(task, status);
  }

  if (!tasks.length) return <p>No tasks yet.</p>;

  return (
    <div className="space-y-3">
      {!readOnly && <p>Drag tasks between columns, or select Edit to change a task’s status.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {taskStatuses.map(status => (
          <section
            className="min-h-24 min-w-0 space-y-3 rounded-box border border-base-300 bg-base-200 p-3"
            key={status}
            aria-label={taskStatusLabels[status]}
            onDragOver={canMove ? allowTaskDrop : undefined}
            onDrop={canMove ? event => dropTask(event, status) : undefined}
          >
            <h3 className="font-bold">{taskStatusLabels[status]}</h3>
            <ul className="space-y-2">
              {tasks.filter(task => task.status === status).map(task => (
                <li
                  className="space-y-1 rounded-box bg-base-100 p-3"
                  key={task.id}
                  draggable={canMove}
                  onDragStart={event => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(taskDragType, task.id);
                  }}
                >
                  <h4 className="break-words font-bold">{task.name}</h4>
                  {task.description && <p className="whitespace-pre-wrap break-words">{task.description}</p>}
                  {task.dueDate && <p>Due <time dateTime={task.dueDate}>{new Date(task.dueDate).toLocaleString()}</time></p>}
                  {task.completedDate && <p>Completed <time dateTime={task.completedDate}>{new Date(task.completedDate).toLocaleString()}</time></p>}
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        aria-label={`Edit ${task.name}`}
                        disabled={busy}
                        onClick={() => onEdit(task)}
                      >Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        aria-label={`Delete ${task.name}`}
                        disabled={busy}
                        onClick={() => onDelete(task)}
                      >Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
