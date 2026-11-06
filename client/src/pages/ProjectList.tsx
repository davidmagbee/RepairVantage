import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { GET_PROJECTS } from '../graphql/queries';
import type { Project } from '../graphql/queries';

function ProjectCards({ projects }: { projects: Project[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <li className="card bg-base-100 shadow" key={project.id}>
          {/* A single link spans the card, including its padding, with the project title as its accessible name. */}
          <Link
            className="card-body group rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to={`/projects/${project.id}`}
            aria-label={project.name}
          >
            <h3 className="card-title group-hover:underline group-focus-visible:underline">{project.name}</h3>
            <p className="badge badge-outline capitalize">{project.status.toLowerCase().replace(/_/g, ' ')}</p>
            {project.description && <p className="line-clamp-3 break-words">{project.description}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectList() {
  const { data, loading, error, refetch } = useQuery<{ projects: Project[]; sharedProjects: Project[] }>(GET_PROJECTS, {
    context: privateOperation,
    fetchPolicy: 'network-only',
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-2">Track the status of your repair work.</p>
        </div>
        <Link className="btn btn-primary" to="/projects/new">Create project</Link>
      </header>

      {loading && <p role="status">Loading projects…</p>}
      {error && (
        <div className="space-y-3">
          <p className="alert alert-error" role="alert">Could not load projects.</p>
          <button className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Try again</button>
        </div>
      )}

      {data && data.projects.length === 0 && data.sharedProjects.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">No projects yet</h2>
            <p>Create your first repair project to start tracking its status.</p>
          </div>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <section aria-labelledby="owned-projects" className="space-y-3">
          <h2 className="text-xl font-bold" id="owned-projects">Owned projects</h2>
          <ProjectCards projects={data.projects} />
        </section>
      )}
      {data && data.sharedProjects.length > 0 && (
        <section aria-labelledby="shared-projects" className="space-y-3">
          <h2 className="text-xl font-bold" id="shared-projects">Shared with you</h2>
          <ProjectCards projects={data.sharedProjects} />
        </section>
      )}
    </section>
  );
}
