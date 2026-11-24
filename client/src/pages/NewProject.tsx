import { useMutation } from '@apollo/client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { CREATE_PROJECT } from '../graphql/mutations';

export default function NewProject() {
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState('');
  const [createProject, { loading, error, reset }] = useMutation<{ createProject: { id: string } }>(CREATE_PROJECT, {
    context: privateOperation,
    onCompleted: ({ createProject: project }) => navigate(`/projects/${project.id}`, { replace: true }),
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    reset();

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    if (!name) {
      setValidationError('Enter a project name.');
      return;
    }
    const description = String(form.get('description')).trim();
    void createProject({ variables: { input: { name, description: description || null } } });
  }

  const message = validationError || (error && 'Could not create the project. Try again.');

  return (
    <section className="max-w-xl space-y-4">
      <Link className="link" to="/projects">Back to projects</Link>
      <h1 className="text-3xl font-bold">Create project</h1>
      <p>Your project starts private.</p>
      {message && <p className="alert alert-error" role="alert">{message}</p>}
      <form className="card bg-base-100 shadow" onSubmit={submit}>
        <div className="card-body gap-4">
          <label className="form-control gap-1">
            <span>Project name</span>
            <input className="input input-bordered" name="name" maxLength={120} required />
          </label>
          <label className="form-control gap-1">
            <span>Description (optional)</span>
            <textarea className="textarea textarea-bordered" name="description" rows={5} maxLength={2000} />
          </label>
          <div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating project…' : 'Create project'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
