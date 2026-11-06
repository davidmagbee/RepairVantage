import { useMutation, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { privateOperation } from '../graphql/client';
import { CREATE_INVENTORY_ITEM, GET_INVENTORY, UPDATE_INVENTORY_ITEM, type InventoryItem } from '../graphql/inventory';

export default function Inventory() {
  // Undefined closes the form. Null starts a new item.
  const [editing, setEditing] = useState<InventoryItem | null>();
  const { data, loading, error, refetch } = useQuery<{ inventory: InventoryItem[] }>(GET_INVENTORY, {
    context: privateOperation, fetchPolicy: 'network-only',
  });
  const [save, write] = useMutation(editing ? UPDATE_INVENTORY_ITEM : CREATE_INVENTORY_ITEM, {
    context: privateOperation,
    refetchQueries: [GET_INVENTORY],
    onCompleted: () => setEditing(undefined),
    onError: () => {},
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void save({ variables: {
      ...editing && { id: editing.id },
      kind: editing?.kind ?? fields.get('kind'),
      name: String(fields.get('name')).trim(),
      onHand: Number(fields.get('onHand')),
    } });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Inventory</h1>
      <p>Shortfalls compare on-hand stock with requirements from unfinished, active projects.</p>
      {loading && <p role="status">Loading inventory…</p>}
      {error && <div className="space-y-2">
        <p role="alert" className="alert alert-error">Could not load inventory.</p>
        <button type="button" className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Retry inventory</button>
      </div>}
      {data && (
        <>
          {editing === undefined ? (
            <button type="button" className="btn btn-primary" onClick={() => { write.reset(); setEditing(null); }}>Add item</button>
          ) : (
            <form className="space-y-3" key={editing?.id ?? 'new'} onSubmit={submit}>
              <fieldset disabled={write.loading} className="flex flex-wrap items-end gap-3">
                <legend className="font-semibold">{editing ? 'Edit inventory item' : 'New inventory item'}</legend>
                <label className="form-control gap-1">
                  <span>Item kind</span>
                  <select name="kind" className="select select-bordered" disabled={Boolean(editing)} defaultValue={editing?.kind ?? 'PART'}>
                    <option value="PART">Part</option><option value="TOOL">Tool</option>
                  </select>
                </label>
                <label className="form-control gap-1">
                  <span>Item name</span>
                  <input name="name" className="input input-bordered" defaultValue={editing?.name} maxLength={120} required />
                </label>
                <label className="form-control gap-1">
                  <span>On hand</span>
                  <input name="onHand" type="number" className="input input-bordered" defaultValue={editing?.onHand ?? 0}
                    min={0} max={2147483647} required />
                </label>
                <button className="btn btn-primary" type="submit">Save item</button>
                <button className="btn btn-ghost" type="button" onClick={() => setEditing(undefined)}>Cancel</button>
              </fieldset>
              {write.error && <p role="alert" className="alert alert-error">Could not save the inventory item. Check the name and quantity.</p>}
            </form>
          )}
          {data.inventory.length ? (
            <div className="overflow-x-auto rounded-box bg-base-100">
              <table className="table">
                <thead><tr><th>Item</th><th>Kind</th><th>On hand</th><th>Required</th><th>Shortfall</th><th>Action</th></tr></thead>
                <tbody>{data.inventory.map(item => (
                  <tr key={`${item.kind}:${item.id}`}>
                    <td>{item.name}</td><td className="capitalize">{item.kind.toLowerCase()}</td>
                    <td>{item.onHand}</td><td>{item.required}</td><td>{item.shortfall}</td>
                    <td><button className="btn btn-sm btn-ghost" type="button" disabled={write.loading}
                      onClick={() => { write.reset(); setEditing(item); }}>Edit</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p>No inventory items yet.</p>}
        </>
      )}
    </section>
  );
}
