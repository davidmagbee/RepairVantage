import { useQuery } from '@apollo/client';
import { Link, useParams } from 'react-router-dom';
import { GET_SHOWCASE, type ShowcaseProject } from '../graphql/sharing';

/** Public, unlisted projection. The workspace query never runs on this route. */
export default function Showcase() {
  const { slug = '' } = useParams();
  const { data, loading, error, refetch } = useQuery<{ showcaseProject: ShowcaseProject | null }>(GET_SHOWCASE, {
    variables: { slug },
    fetchPolicy: 'no-cache',
  });
  const project = data?.showcaseProject;

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
        <Link to="/" className="font-bold text-base-content">RepairVantage</Link>
        <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="mb-3 font-semibold text-primary">Project Showcase</p>
        {loading && <p role="status">Loading showcase…</p>}
        {error && (
          <div role="alert" className="space-y-4">
            <p>Couldn’t load this showcase.</p>
            <button className="btn btn-outline" type="button" onClick={() => void refetch().catch(() => {})}>Try again</button>
          </div>
        )}
        {!loading && !error && (project ? (
          <article className="rounded-box border border-base-300 bg-base-100 p-6 sm:p-10">
            <h1 className="break-words text-3xl font-bold tracking-tight sm:text-5xl">{project.title}</h1>
            <p className="mt-4 capitalize">Status · {project.status.toLowerCase().replace(/_/g, ' ')}</p>
            <p className="mt-6 whitespace-pre-wrap break-words text-lg leading-relaxed">{project.summary}</p>
          </article>
        ) : (
          <div>
            <h1 className="text-3xl font-bold">Showcase unavailable</h1>
            <p className="mt-3">This link may have been removed or entered incorrectly.</p>
          </div>
        ))}
      </main>
    </div>
  );
}
