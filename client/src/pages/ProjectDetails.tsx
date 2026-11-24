import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProjectSharing from '../components/ProjectSharing';
import ProjectTasks from '../components/ProjectTasks';
import ProjectRequirements from '../components/ProjectRequirements';
import ProjectDates from '../components/ProjectDates';
import { privateOperation } from '../graphql/client';
import { ADD_PROJECT_COMMENT, ARCHIVE_PROJECT, DELETE_PROJECT, RESTORE_PROJECT, UPDATE_PROJECT_DETAILS, UPDATE_PROJECT_PRIORITY, UPDATE_PROJECT_STATUS } from '../graphql/mutations';
import { GET_PROJECT_DETAILS } from '../graphql/queries';
import type { Project, ProjectWithComments } from '../graphql/queries';

const projectFieldControls = {
  status: {
    options: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    mutation: UPDATE_PROJECT_STATUS,
  },
  priority: {
    options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    mutation: UPDATE_PROJECT_PRIORITY,
  },
};

function displayLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ');
}

function ProjectDetailsEditor({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [updateDetails, { loading, error, reset }] = useMutation(UPDATE_PROJECT_DETAILS, {
    context: privateOperation,
    onCompleted: () => setEditing(false),
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    reset();

    const form = new FormData(event.currentTarget);
    const enteredName = String(form.get('name'));
    const name = enteredName.trim();
    if (!name) {
      setValidationError('Enter a project name.');
      return;
    }

    const description = String(form.get('description'));
    const savedDescription = (project.description ?? '').replace(/\r\n?/g, '\n');
    // Omit untouched fields. An explicitly emptied description is stored as null.
    const input = {
      ...(enteredName !== project.name && name !== project.name && { name }),
      ...(description !== savedDescription && { description: description.trim() || null }),
    };
    if (!Object.keys(input).length) {
      setEditing(false);
      return;
    }
    void updateDetails({ variables: { id: project.id, input } });
  }

  const message = validationError || (error && 'Could not update project details. Try again.');

  if (!editing) {
    return (
      <button className="btn btn-outline btn-sm self-start" type="button" onClick={() => {
        setValidationError('');
        reset();
        setEditing(true);
      }}>
        Edit details
      </button>
    );
  }

  return (
    <form aria-label="Edit project details" className="space-y-3" onSubmit={submit}>
      <label className="form-control gap-1">
        <span>Project name</span>
        <input className="input input-bordered" name="name" defaultValue={project.name} maxLength={120} disabled={loading} required />
      </label>
      <label className="form-control gap-1">
        <span>Description (optional)</span>
        <textarea className="textarea textarea-bordered" name="description" defaultValue={project.description ?? ''} rows={5} maxLength={2000} disabled={loading} />
      </label>
      {message && <p className="alert alert-error" role="alert">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save details'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)} disabled={loading}>Cancel</button>
      </div>
    </form>
  );
}

function ProjectFieldControl({ project, field }: { project: Project; field: keyof typeof projectFieldControls }) {
  const { options, mutation } = projectFieldControls[field];
  const savedValue = project[field];
  const [updateField, { loading, error }] = useMutation(mutation, {
    context: privateOperation,
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get(field);
    if (value !== savedValue) void updateField({ variables: { id: project.id, [field]: value } });
  }

  return (
    // Remount the uncontrolled select when this field saves. Other field drafts stay intact.
    <form className="space-y-2" key={savedValue} onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control gap-1">
          <span>Project {field}</span>
          <select className="select select-bordered capitalize" name={field} defaultValue={savedValue} disabled={loading}>
            {options.map(option => <option key={option} value={option}>{displayLabel(option)}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : `Save ${field}`}
        </button>
      </div>
      {error && <p className="alert alert-error" role="alert">Could not update project {field}. Try again.</p>}
    </form>
  );
}

function ProjectArchiveControl({ project }: { project: Project }) {
  const archived = Boolean(project.archivedAt);
  const [changeArchive, { loading, error }] = useMutation(archived ? RESTORE_PROJECT : ARCHIVE_PROJECT, {
    context: privateOperation,
    onError: () => {},
  });
  return (
    <div className="space-y-2">
      <button
        className="btn btn-outline btn-sm"
        type="button"
        disabled={loading}
        onClick={() => void changeArchive({ variables: { id: project.id } })}
      >
        {archived ? 'Restore project' : 'Archive project'}
      </button>
      {error && <p className="alert alert-error" role="alert">Could not {archived ? 'restore' : 'archive'} the project. Try again.</p>}
    </div>
  );
}

function ProjectDeleteControl({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [deleteProject, { loading, error }] = useMutation<{ deleteProject: boolean }>(DELETE_PROJECT, {
    context: privateOperation,
    onCompleted: ({ deleteProject: deleted }) => {
      if (deleted) void navigate('/projects', { replace: true });
    },
    onError: () => {},
  });
  return (
    <div className="space-y-2">
      <button className="btn btn-error btn-outline btn-sm" type="button" disabled={loading} onClick={() => {
        // Require a fresh confirmation before every permanent deletion attempt.
        if (window.confirm(`Permanently delete “${project.name}” and its related work and sharing? This cannot be undone.`)) {
          void deleteProject({ variables: { id: project.id } });
        }
      }}>
        Delete project permanently
      </button>
      {error && <p className="alert alert-error" role="alert">Could not delete the project. Try again.</p>}
    </div>
  );
}

function ProjectComments({ project }: { project: ProjectWithComments }) {
  const [body, setBody] = useState('');
  const [addComment, { loading, error }] = useMutation(ADD_PROJECT_COMMENT, {
    context: privateOperation,
    // Reload the server-ordered comments so this list can pick up recent comments from other members.
    refetchQueries: [GET_PROJECT_DETAILS],
    onCompleted: () => setBody(''),
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim()) void addComment({ variables: { projectId: project.id, body: body.trim() } });
  }

  return (
    <section className="card bg-base-100 shadow" aria-labelledby="comments-heading">
      <div className="card-body gap-4">
        <h2 className="card-title" id="comments-heading">Comments</h2>
        {project.comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul className="space-y-4">
            {project.comments.map((comment) => (
              <li className="rounded-box bg-base-200 p-4" key={comment.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <strong className="break-all">{comment.author.name || 'Project member'}</strong>
                  <time className="text-sm" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        {!project.archivedAt && (
          <>
            {error && <p className="alert alert-error" role="alert">Could not add your comment. Try again.</p>}
            <form className="space-y-3" onSubmit={submit}>
              <label className="form-control gap-1">
                <span>Comment</span>
                <textarea
                  className="textarea textarea-bordered"
                  rows={3}
                  maxLength={2000}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={loading || !body.trim()}>
                {loading ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const [taskProjectId, setTaskProjectId] = useState<string>();
  const [requirementProjectId, setRequirementProjectId] = useState<string>();
  const { data, loading, error, refetch } = useQuery<{ project: ProjectWithComments | null }>(GET_PROJECT_DETAILS, {
    context: privateOperation,
    variables: { id },
    fetchPolicy: 'network-only',
  });
  const project = data?.project;
  const tasksExpanded = Boolean(project && taskProjectId === project.id);
  const requirementsExpanded = Boolean(project && requirementProjectId === project.id);

  return (
    <div className="space-y-4">
      <Link className="link" to="/projects">Back to projects</Link>
      {loading && <p role="status">Loading project…</p>}
      {error && (
        <div className="space-y-3">
          <p className="alert alert-error" role="alert">Could not load the project.</p>
          <button className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Try again</button>
        </div>
      )}
      {!loading && !error && !project && (
        <h1 className="text-3xl font-bold">Project not found</h1>
      )}
      {project && (
        <>
          <article className="card bg-base-100 shadow">
            <div className="card-body gap-4">
              <h1 className="break-words text-3xl font-bold">{project.name}</h1>
              <dl className="flex flex-wrap gap-4">
                <div>
                  <dt className="font-semibold">Status</dt>
                  <dd className="capitalize">{displayLabel(project.status)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Priority</dt>
                  <dd className="capitalize">{displayLabel(project.priority)}</dd>
                </div>
              </dl>
              {project.description && <p className="whitespace-pre-wrap break-words">{project.description}</p>}
              <ProjectDates key={`dates-${project.id}`} project={project} />
              {project.archivedAt && <p role="status">This project is archived and read-only.</p>}
              {project.canManage && !project.archivedAt && (
                <>
                  <ProjectDetailsEditor key={project.id} project={project} />
                  <ProjectFieldControl key={`status-${project.id}`} project={project} field="status" />
                  <ProjectFieldControl key={`priority-${project.id}`} project={project} field="priority" />
                </>
              )}
              {project.canManage && <ProjectArchiveControl key={project.id} project={project} />}
              {project.canManage && <Link className="link self-start" to={`/projects/${project.id}/report`}>Project report</Link>}
            </div>
          </article>
          <div className="space-y-3">
              <button
                className="btn btn-outline"
                type="button"
                aria-expanded={tasksExpanded}
                aria-controls="project-tasks"
                onClick={() => setTaskProjectId(tasksExpanded ? undefined : project.id)}
              >
                {tasksExpanded ? 'Hide tasks' : 'Show tasks'}
              </button>
              {/* Fetch authorized tasks and any owner roster when the reader opens the board. */}
              <div id="project-tasks">
                {tasksExpanded && <ProjectTasks key={project.id} projectId={project.id} readOnly={Boolean(project.archivedAt)} canManage={project.canManage} />}
              </div>
          </div>
          {project.canManage && (
            <div className="space-y-3">
              <button className="btn btn-outline" type="button" aria-expanded={requirementsExpanded}
                aria-controls="project-requirements" onClick={() => setRequirementProjectId(requirementsExpanded ? undefined : project.id)}>
                {requirementsExpanded ? 'Hide requirements' : 'Show requirements'}
              </button>
              {/* The owner catalog stays private and loads only when requested. */}
              <div id="project-requirements">
                {requirementsExpanded && <ProjectRequirements key={project.id} projectId={project.id} readOnly={Boolean(project.archivedAt)} />}
              </div>
            </div>
          )}
          <ProjectComments key={project.id} project={project} />
          {project.canManage && <ProjectSharing key={`sharing-${project.id}`} projectId={project.id} archived={Boolean(project.archivedAt)} />}
          {project.canManage && !project.archivedAt && <ProjectDeleteControl key={`delete-${project.id}`} project={project} />}
        </>
      )}
    </div>
  );
}
