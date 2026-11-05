import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProjectSharing from '../components/ProjectSharing';
import { privateOperation } from '../graphql/client';
import { ADD_PROJECT_COMMENT, UPDATE_PROJECT_STATUS } from '../graphql/mutations';
import { GET_PROJECT_DETAILS } from '../graphql/queries';
import type { Project, ProjectWithComments } from '../graphql/queries';

const projectStatuses = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

function displayLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ');
}

function StatusControl({ project }: { project: Project }) {
  const [updateStatus, { loading, error }] = useMutation(UPDATE_PROJECT_STATUS, {
    context: privateOperation,
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const status = new FormData(event.currentTarget).get('status');
    if (status !== project.status) void updateStatus({ variables: { id: project.id, status } });
  }

  return (
    <form className="space-y-2" key={project.status} onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control gap-1">
          <span>Project status</span>
          <select className="select select-bordered capitalize" name="status" defaultValue={project.status} disabled={loading}>
            {projectStatuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save status'}
        </button>
      </div>
      {error && <p className="alert alert-error" role="alert">Could not update project status. Try again.</p>}
    </form>
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
      </div>
    </section>
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useQuery<{ project: ProjectWithComments | null }>(GET_PROJECT_DETAILS, {
    context: privateOperation,
    variables: { id },
    fetchPolicy: 'network-only',
  });
  const project = data?.project;

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
              {project.canManage && <StatusControl project={project} />}
            </div>
          </article>
          <ProjectComments key={project.id} project={project} />
          {project.canManage && <ProjectSharing key={`sharing-${project.id}`} projectId={project.id} />}
        </>
      )}
    </div>
  );
}
