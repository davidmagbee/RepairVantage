import { useQuery } from '@apollo/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { GET_PROJECTS } from '../graphql/queries';
import type { Project } from '../graphql/queries';

const statuses = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ');

function ProjectCards({ projects }: { projects: Project[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li className={`card project-card bg-base-100 ${project.archivedAt ? 'project-card--archived' : ''}`} key={project.id}>
          {/* A single link spans the card, including its padding, with the project title as its accessible name. */}
          <Link
            className="card-body group rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to={`/projects/${project.id}`}
            aria-label={project.name}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="project-card__symbol" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 6a4 4 0 0 0-5 5l-6 6a2 2 0 0 0 4 4l6-6a4 4 0 0 0 5-5l-3 3-3-3 3-3Z" />
                </svg>
              </span>
              <span className={`badge project-status project-status--${project.status.toLowerCase()} capitalize`}>{label(project.status)}</span>
            </div>
            <h3 className="card-title break-words group-hover:underline group-focus-visible:underline">{project.name}</h3>
            <p className="line-clamp-3 break-words text-sm text-base-content/70">{project.description || 'Add a description to outline the repair.'}</p>
            <div className="project-card__footer flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs capitalize text-base-content/70">{label(project.priority)} priority</span>
              {project.archivedAt ? <span className="badge badge-neutral">Archived</span> : <span className="text-sm font-semibold text-primary" aria-hidden="true">View project <span className="ml-1">→</span></span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery<{ projects: Project[]; sharedProjects: Project[] }>(GET_PROJECTS, {
    context: privateOperation,
    fetchPolicy: 'network-only',
  });
  // Filter only the account-scoped records already returned by the API; shared access stays separate.
  const matches = (project: Project) => (!status || project.status === status)
    && `${project.name} ${project.description ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const owned = data?.projects.filter(matches) ?? [];
  const shared = data?.sharedProjects.filter(matches) ?? [];
  const hasProjects = Boolean(data && data.projects.length + data.sharedProjects.length);

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="dashboard-subtitle">A clear view of every repair, from planning to completion.</p>
        </div>
        <Link className="btn btn-primary" to="/projects/new"><span aria-hidden="true">＋</span> Create project</Link>
      </header>

      {loading && <p role="status">Loading projects…</p>}
      {error && (
        <div className="space-y-3">
          <p className="alert alert-error" role="alert">Could not load projects.</p>
          <button className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Try again</button>
        </div>
      )}

      {hasProjects && (
        <div className="workspace-panel flex flex-wrap items-end gap-4 p-5">
          <label className="form-control min-w-0 flex-1 gap-2">
            <span className="text-sm font-semibold">Search projects</span>
            <input className="input input-bordered w-full" type="search" placeholder="Search by name or description…" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="form-control gap-2">
            <span className="text-sm font-semibold">Filter by status</span>
            <select className="select select-bordered capitalize" value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </label>
          {(search || status) && <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setStatus(''); }}>Clear filters</button>}
        </div>
      )}

      {data && !hasProjects && (
        <div className="workspace-panel">
          <div className="card-body py-12 text-center">
            <h2 className="card-title justify-center">No projects yet</h2>
            <p>Create your first repair project to start tracking its status.</p>
          </div>
        </div>
      )}
      {hasProjects && owned.length === 0 && shared.length === 0 && <p role="status">No projects match your filters.</p>}

      {owned.length > 0 && (
        <section aria-labelledby="owned-projects" className="space-y-4">
          <h2 className="panel-heading" id="owned-projects">Owned projects <span className="badge badge-primary badge-outline ml-2">{owned.length}</span></h2>
          <ProjectCards projects={owned} />
        </section>
      )}
      {shared.length > 0 && (
        <section aria-labelledby="shared-projects" className="space-y-4">
          <h2 className="panel-heading" id="shared-projects">Shared with you <span className="badge badge-primary badge-outline ml-2">{shared.length}</span></h2>
          <ProjectCards projects={shared} />
        </section>
      )}
    </section>
  );
}
