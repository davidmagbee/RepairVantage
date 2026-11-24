import { useMutation, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { ADD_PROJECT_EXPENSE, GET_PROJECT_REPORT, type ProjectReportTotals } from '../graphql/reports';

type ReportData = {
  project: { id: string; name: string; archivedAt: string | null } | null;
  projectReport: ProjectReportTotals;
};

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dollars = (cents: number) => (cents / 100).toFixed(2);

function csvText(value: string) {
  // A spreadsheet can execute text as a formula even when the CSV cell is quoted.
  const safe = /^[\t\r\n]|^\s*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadReport(name: string, report: ProjectReportTotals) {
  const rows = [
    `Project,${csvText(name)}`,
    `Estimated hours,${report.estimatedHours}`,
    `Actual hours,${report.actualHours}`,
    `Total expenses (USD),${dollars(report.totalExpenseCents)}`,
    '',
    'Expense description,Amount (USD),Recorded at (UTC)',
    ...report.expenses.map(expense => `${csvText(expense.description)},${dollars(expense.amountCents)},${csvText(expense.createdAt)}`),
  ];
  const url = URL.createObjectURL(new Blob([rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'project-report.csv';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ProjectReport() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useQuery<ReportData>(GET_PROJECT_REPORT, {
    variables: { projectId: id }, context: privateOperation, fetchPolicy: 'network-only',
  });
  const [addExpense] = useMutation(ADD_PROJECT_EXPENSE, { context: privateOperation });
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');

  function refresh() {
    return refetch().catch(() => {});
  }

  async function recordExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure('');
    setNotice('');
    const form = event.currentTarget;
    const fields = new FormData(form);
    const description = String(fields.get('description')).trim();
    const amount = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(fields.get('amount')).trim());
    // Convert from decimal text to cents without multiplying a fractional dollar value.
    const amountCents = amount ? Number(amount[1]) * 100 + Number((amount[2] ?? '').padEnd(2, '0')) : 0;
    if (!description || amountCents < 1 || amountCents > 2_147_483_647) {
      setFailure('Enter a description and a positive USD amount with at most two decimals.');
      return;
    }
    setSaving(true);
    try {
      await addExpense({ variables: { projectId: id, description, amountCents } });
      form.reset();
      setNotice('Expense recorded.');
      await refresh();
    } catch {
      setFailure('Could not record the expense. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const project = data?.project;
  const report = data?.projectReport;

  return (
    <section className="space-y-5">
      <Link className="link print:hidden" to={`/projects/${id}`}>Back to project</Link>
      {loading && <p role="status">Loading report…</p>}
      {notice && <p className="print:hidden" role="status">{notice}</p>}
      {error && (
        <div className="space-y-2">
          <p role="alert">Could not load this owner report.</p>
          <button className="btn btn-outline print:hidden" type="button" onClick={() => { void refresh(); }}>Retry report</button>
        </div>
      )}
      {project && report && !error && (
        <>
          <h1 className="break-words text-3xl font-bold">{project.name} report</h1>
          <dl className="flex flex-wrap gap-6">
            <div><dt className="font-bold">Estimated time</dt><dd>{report.estimatedHours} hours</dd></div>
            <div><dt className="font-bold">Actual time</dt><dd>{report.actualHours} hours</dd></div>
            <div><dt className="font-bold">Total expenses (USD)</dt><dd>{usd.format(report.totalExpenseCents / 100)}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button className="btn btn-outline" type="button" onClick={() => downloadReport(project.name, report)}>Download CSV</button>
            <button className="btn btn-outline" type="button" onClick={() => window.print()}>Print / Save as PDF</button>
          </div>
          <div className="print:hidden">
            {failure && <p className="alert alert-error" role="alert">{failure}</p>}
            {project.archivedAt ? <p>This report is read-only while the project is archived.</p> : (
              <form className="flex flex-wrap items-end gap-3" onSubmit={event => { void recordExpense(event); }}>
                <label className="form-control gap-1">
                  <span>Expense description</span>
                  <input className="input input-bordered" name="description" maxLength={200} required disabled={saving} />
                </label>
                <label className="form-control gap-1">
                  <span>Amount (USD)</span>
                  <input className="input input-bordered" name="amount" inputMode="decimal" maxLength={11} placeholder="0.00" required disabled={saving} />
                </label>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add expense'}</button>
              </form>
            )}
          </div>
          <h2 className="text-xl font-bold">Recorded expenses</h2>
          {report.expenses.length ? (
            <table className="table table-fixed">
              <thead><tr><th>Description</th><th>Amount (USD)</th><th>Recorded date</th></tr></thead>
              <tbody>{report.expenses.map(expense => (
                <tr key={expense.id}>
                  <td className="break-words">{expense.description}</td>
                  <td>{usd.format(expense.amountCents / 100)}</td>
                  <td><time dateTime={expense.createdAt}>{new Date(expense.createdAt).toLocaleDateString()}</time></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p>No expenses recorded yet.</p>}
        </>
      )}
    </section>
  );
}
