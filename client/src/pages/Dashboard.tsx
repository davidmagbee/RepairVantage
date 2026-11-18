import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { GET_DASHBOARD_DATA } from '../graphql/dashboard';
import type { DashboardData } from '../graphql/dashboard';

const statuses = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const activeStatuses = new Set(['PLANNED', 'IN_PROGRESS', 'ON_HOLD']);

function label(status: string) {
  return status.toLowerCase().replace(/_/g, ' ');
}

function dateLabel(value: string, withTime = false) {
  // Explicit UTC avoids shifting saved deadlines to the previous day in another browser timezone.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime && { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
  }).format(new Date(value));
}

function SummaryIcon({ kind }: { kind: 'projects' | 'active' | 'complete' }) {
  return (
    <span className="summary-card__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
        {kind === 'projects' && <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="9" y="15" width="6" height="6" rx="1" /><path d="M6 9v3h12V9m-6 3v3" /></>}
        {kind === 'active' && <><path d="m3 6 2 2 3-4m-5 9 2 2 3-4m-5 9 2 2 3-4M11 6h10M11 13h10M11 20h10" /></>}
        {kind === 'complete' && <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}
      </svg>
    </span>
  );
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useQuery<{ dashboardData: DashboardData }>(GET_DASHBOARD_DATA, {
    context: privateOperation,
    fetchPolicy: 'network-only',
  });
  const dashboard = data?.dashboardData;
  const count = (status: string) => dashboard?.projectsByStatus.find(row => row.status === status)?.count ?? 0;
  // Active matches inventory demand; cancelled projects remain in the total but never count as active.
  const active = dashboard?.projectsByStatus.reduce((total, row) => total + (activeStatuses.has(row.status) ? row.count : 0), 0) ?? 0;
  const completion = dashboard?.totalProjects ? Math.round(dashboard.completedProjects / dashboard.totalProjects * 100) : 0;
  const firstDeadline = dashboard?.upcomingDeadlines[0]?.dueDate;

  return (
    <section className="space-y-6">
      <header className="dashboard-heading flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="dashboard-subtitle mt-2">Your unarchived repair projects at a glance.</p></div>
        <Link className="btn btn-primary" to="/projects/new">Create project</Link>
      </header>
      {loading && <p role="status">Loading dashboard…</p>}
      {error && <div className="space-y-3"><p className="alert alert-error" role="alert">Could not load your dashboard.</p><button className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Retry dashboard</button></div>}
      {dashboard && !error && <>
        <div className="dashboard-stats">
          <section className="summary-card summary-card--primary" aria-label="Total Projects">
            <SummaryIcon kind="projects" /><h2 className="summary-card__label">Total Projects</h2><p className="summary-card__value">{dashboard.totalProjects}</p>
            <div className="summary-card__detail"><span>Project completion</span><progress className="progress" aria-label="Project completion" value={completion} max="100" /><span>{completion}% Complete</span></div>
          </section>
          <section className="summary-card summary-card--orange" aria-label="Active Projects">
            <SummaryIcon kind="active" /><h2 className="summary-card__label">Active Projects</h2><p className="summary-card__value">{active}</p>
            <div className="summary-card__detail"><span>Next deadline · UTC</span><span>{firstDeadline ? dateLabel(firstDeadline) : 'No upcoming deadlines'}</span><Link className="link" to="/projects/schedule">View schedule</Link></div>
          </section>
          <section className="summary-card summary-card--teal" aria-label="Completed">
            <SummaryIcon kind="complete" /><h2 className="summary-card__label">Completed</h2><p className="summary-card__value">{dashboard.completedProjects}</p>
            <div className="summary-card__detail"><span>Completion rate</span><strong>{completion}%</strong></div>
          </section>
        </div>
        {dashboard.totalProjects === 0 && <div className="workspace-panel"><h2 className="panel-heading">No projects yet.</h2><p>Create your first repair project to start tracking its status.</p></div>}
        <div className="dashboard-columns">
          <section className="workspace-panel" aria-labelledby="deadlines-heading">
            <header className="panel-heading"><h2 id="deadlines-heading">Upcoming deadlines</h2><span className="badge badge-primary">{dashboard.upcomingDeadlines.length}</span></header>
            <p className="eyebrow">Next 7 days · UTC</p>
            {dashboard.upcomingDeadlines.length === 0 ? <p>No upcoming deadlines in the next 7 days.</p> : <ul className="activity-list">
              {dashboard.upcomingDeadlines.map(task => <li key={task.id}><Link className="dashboard-row" to={`/projects/${task.project.id}`}><span><strong>{task.name}</strong><span className="dashboard-row__meta">{task.project.name}</span></span>{task.dueDate && <time className="badge badge-primary" dateTime={task.dueDate}>{dateLabel(task.dueDate)}</time>}</Link></li>)}
            </ul>}
            <Link className="btn btn-outline btn-sm mt-4" to="/projects/schedule">View calendar</Link>
          </section>
          <section className="workspace-panel" aria-labelledby="updates-heading">
            <header className="panel-heading"><h2 id="updates-heading">Recent project updates</h2></header>
            <p className="eyebrow">Latest saved project changes</p>
            {dashboard.recentProjects.length === 0 ? <p>No project updates yet.</p> : <ul className="activity-list">
              {dashboard.recentProjects.map(project => <li key={project.id}><Link className="dashboard-row" to={`/projects/${project.id}`}><span><strong>{project.name}</strong><span className="dashboard-row__meta">Updated <time dateTime={project.updatedAt}>{dateLabel(project.updatedAt, true)}</time></span></span><span className="badge badge-outline capitalize">{label(project.status)}</span></Link></li>)}
            </ul>}
          </section>
        </div>
        <section className="workspace-panel" aria-labelledby="status-heading">
          <header className="panel-heading"><h2 id="status-heading">Project status</h2></header>
          <div className="status-breakdown">{statuses.map(status => <div className="status-item" key={status}><span className="capitalize">{label(status)}</span><strong>{count(status)}</strong></div>)}</div>
        </section>
      </>}
    </section>
  );
}
