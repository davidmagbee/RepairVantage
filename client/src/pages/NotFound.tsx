import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="link">RepairVantage home</Link>
    </main>
  );
}
