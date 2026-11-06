import { useMutation, useQuery } from '@apollo/client';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { GET_INVENTORY, GET_PROJECT_REQUIREMENTS, REMOVE_PROJECT_REQUIREMENT, SET_PROJECT_REQUIREMENT,
  type InventoryItem, type ProjectRequirement } from '../graphql/inventory';

const itemKey = (item: InventoryItem) => `${item.kind}:${item.id}`;

export default function ProjectRequirements({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const requirements = useQuery<{ projectRequirements: ProjectRequirement[] }>(GET_PROJECT_REQUIREMENTS, {
    variables: { projectId }, context: privateOperation, fetchPolicy: 'network-only',
  });
  const inventory = useQuery<{ inventory: InventoryItem[] }>(GET_INVENTORY, {
    context: privateOperation, skip: readOnly, fetchPolicy: 'network-only',
  });
  // Refetch the project list and any open forecast because a requirement can change both.
  const options = { context: privateOperation, refetchQueries: [GET_PROJECT_REQUIREMENTS, GET_INVENTORY], onError: () => {} };
  const [setRequirement, setResult] = useMutation(SET_PROJECT_REQUIREMENT, options);
  const [removeRequirement, removeResult] = useMutation(REMOVE_PROJECT_REQUIREMENT, options);
  const pending = setResult.loading || removeResult.loading;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const item = inventory.data?.inventory.find(entry => itemKey(entry) === fields.get('item'));
    if (item) void setRequirement({ variables: { projectId, kind: item.kind, itemId: item.id, quantity: Number(fields.get('quantity')) } });
  }

  return (
    <section className="space-y-4 rounded-box bg-base-100 p-4 shadow" aria-labelledby="requirements-heading">
      <h2 id="requirements-heading" className="text-xl font-bold">Inventory requirements</h2>
      {(requirements.loading || inventory.loading) && <p role="status">Loading requirements…</p>}
      {(requirements.error || inventory.error) && <p role="alert" className="alert alert-error">Could not load inventory requirements. Reopen the panel to retry.</p>}
      {(setResult.error || removeResult.error) && <p role="alert" className="alert alert-error">Could not save the requirement change. Try again.</p>}
      {requirements.data && (
        requirements.data.projectRequirements.length ? (
          <ul className="space-y-2">
            {requirements.data.projectRequirements.map(({ itemId, kind, name, quantity }) => (
              <li className="flex flex-wrap items-center gap-3" key={`${kind}:${itemId}`}>
                <span>{name} · {quantity}</span>
                {!readOnly && <button type="button" className="btn btn-sm btn-ghost" aria-label={`Remove ${name}`} disabled={pending}
                  onClick={() => void removeRequirement({ variables: { projectId, itemId, kind } })}>Remove</button>}
              </li>
            ))}
          </ul>
        ) : <p>No inventory requirements yet.</p>
      )}
      {!readOnly && inventory.data && (inventory.data.inventory.length ? (
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <label className="form-control gap-1">
            <span>Inventory item</span>
            <select name="item" className="select select-bordered" defaultValue="" required>
              <option value="" disabled>Choose an item</option>
              {inventory.data.inventory.map(item => <option key={itemKey(item)} value={itemKey(item)}>{item.name} ({item.kind.toLowerCase()})</option>)}
            </select>
          </label>
          <label className="form-control gap-1">
            <span>Required quantity</span>
            <input name="quantity" className="input input-bordered w-32" type="number" min={1} max={2147483647} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending}>Save requirement</button>
        </form>
      ) : <p>Add parts or tools in <Link className="link" to="/projects/inventory">Inventory</Link> first.</p>)}
    </section>
  );
}
