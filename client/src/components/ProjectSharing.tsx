import { useMutation, useQuery } from '@apollo/client';
import { type FormEvent, useState } from 'react';
import {
  GET_PROJECT_SHARING,
  INVITE_TO_PROJECT,
  PUBLISH_PROJECT,
  REMOVE_PROJECT_MEMBER,
  REVOKE_PROJECT_INVITE,
  UNPUBLISH_PROJECT,
  type InvitationData,
  type ProjectSharingData,
} from '../graphql/sharing';

/** Text stays selectable if browser clipboard access is unavailable. */
function ShareLink({ label, url }: { label: string; url: string }) {
  const [message, setMessage] = useState('');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Link copied.');
    } catch {
      setMessage('Select and copy the link from the field.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="form-control min-w-0 flex-1">
          <span className="label-text mb-1">{label}</span>
          <input className="input input-bordered w-full" type="text" value={url} readOnly onFocus={event => event.target.select()} />
        </label>
        <button className="btn btn-outline" type="button" onClick={() => void copyLink()}>Copy link</button>
      </div>
      <p role="status" className="mt-2 text-sm">{message}</p>
    </div>
  );
}

/** Owner-only controls. An invitation and a publication are separate grants. */
export default function ProjectSharing({ projectId, archived }: { projectId: string; archived: boolean }) {
  const { data, error, loading, refetch } = useQuery<ProjectSharingData>(GET_PROJECT_SHARING, {
    variables: { projectId },
    fetchPolicy: 'no-cache',
  });
  const [invite] = useMutation<InvitationData>(INVITE_TO_PROJECT);
  const [revokeInvite] = useMutation(REVOKE_PROJECT_INVITE);
  const [removeMember] = useMutation(REMOVE_PROJECT_MEMBER);
  const [publish] = useMutation(PUBLISH_PROJECT);
  const [unpublish] = useMutation(UNPUBLISH_PROJECT);
  const [invitation, setInvitation] = useState<{ email: string; url: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const showcase = data?.project?.showcase;

  async function change(action: () => Promise<unknown>, success: string, failure: string) {
    setPending(true);
    setFeedback(undefined);
    try {
      await action();
      setFeedback({ text: success, error: false });
      // A refresh error is distinct from a mutation failure. It must not imply that writes rolled back.
      await refetch().catch(() => setFeedback({ text: `${success} Refresh this page to see the updated list.`, error: false }));
    } catch {
      setFeedback({ text: failure, error: true });
    } finally {
      setPending(false);
    }
  }

  function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim().toLowerCase();
    void change(async () => {
      const result = await invite({ variables: { projectId, email } });
      const token = result.data?.inviteToProject.token;
      if (!token) throw new Error('No invitation was returned');
      const url = new URL('/invite', window.location.origin);
      // Fragments stay out of HTTP requests and server access logs.
      url.hash = new URLSearchParams({ token }).toString();
      setInvitation({ email, url: url.href });
      form.reset();
    }, 'Invitation created.', 'Couldn’t create the invitation. Check the address and try again.');
  }

  function publishShowcase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const summary = String(form.get('summary') ?? '').trim();
    void change(async () => {
      await publish({ variables: { projectId, title, summary } });
      setEditing(false);
    }, 'Showcase published.', 'Couldn’t publish the showcase. Check the title and summary.');
  }

  if (loading && !data) return <p role="status">Loading sharing settings…</p>;
  if (error || !data) return <p role="alert">Sharing settings are unavailable. Refresh to try again.</p>;

  return (
    <section aria-labelledby="sharing-heading" className="space-y-6 rounded-box border border-base-300 bg-base-100 p-6">
      <h2 id="sharing-heading" className="text-xl font-bold">Project sharing</h2>
      {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}

      <section aria-labelledby="invite-heading" className="space-y-3">
        <h3 id="invite-heading" className="font-bold">Invite people</h3>
        {archived ? <p>Existing invitation links can grant read-only access.</p> : (
          <>
            <p>Invitees can read the project and leave comments after they sign in with the invited address.</p>
            <form className="flex flex-wrap items-end gap-2" onSubmit={createInvitation}>
              <label className="form-control flex-1">
                <span className="label-text mb-1">Email address</span>
                <input className="input input-bordered" name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <button type="submit" className="btn btn-primary" disabled={pending}>Create invite link</button>
            </form>
          </>
        )}
        {invitation && <ShareLink key={invitation.url} label={`Invitation for ${invitation.email}`} url={invitation.url} />}
        {data.projectInvites.length > 0 && (
          <ul aria-label="Pending invitations" className="divide-y divide-base-300">
            {data.projectInvites.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="break-all">{item.email} · Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} aria-label={`Revoke invitation for ${item.email}`} onClick={() => void change(async () => {
                  await revokeInvite({ variables: { projectId, id: item.id } });
                  setInvitation(current => current?.email === item.email ? null : current);
                }, 'Invitation revoked.', 'Couldn’t revoke the invitation.')}>Revoke</button>
              </li>
            ))}
          </ul>
        )}
        {data.projectMembers.length > 0 && (
          <ul aria-label="Members" className="divide-y divide-base-300">
            {data.projectMembers.map(({ user }) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="break-all">{user.name || user.email}{user.name && ` · ${user.email}`}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} aria-label={`Remove ${user.email}`} onClick={() => void change(
                  () => removeMember({ variables: { projectId, userId: user.id } }),
                  'Member removed.', 'Couldn’t remove this member.',
                )}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="showcase-heading" className="space-y-3 border-t border-base-300 pt-5">
        <h3 id="showcase-heading" className="font-bold">Showcase</h3>
        <p>Anyone with the link can see the published title, summary, and current status. Keep private details out of the summary.</p>
        {showcase && (
          <>
            <ShareLink key={showcase.slug} label="Public Showcase link" url={new URL(`/showcase/${encodeURIComponent(showcase.slug)}`, window.location.origin).href} />
            <div className="flex flex-wrap gap-2">
              {!archived && !editing && <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)} disabled={pending}>Edit Showcase</button>}
              <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => void change(async () => {
                await unpublish({ variables: { projectId } });
                setEditing(false);
              }, 'Showcase unpublished.', 'Couldn’t unpublish the showcase.')}>Unpublish</button>
            </div>
          </>
        )}
        {!archived && (!showcase || editing) && (
          <form className="space-y-3" onSubmit={publishShowcase}>
            <label className="form-control">
              <span className="label-text mb-1">Public title</span>
              <input className="input input-bordered" name="title" defaultValue={showcase?.title} maxLength={120} required />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Public summary</span>
              <textarea className="textarea textarea-bordered" name="summary" defaultValue={showcase?.summary} maxLength={2000} rows={4} required />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={pending}>{showcase ? 'Save Showcase changes' : 'Publish Showcase'}</button>
              {editing && <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={pending}>Cancel</button>}
            </div>
          </form>
        )}
      </section>
    </section>
  );
}
