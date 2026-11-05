# Deployment

## Target

Vercel project `davidmagbees-projects/repairvantage` serves the Vite assets and the Express application at the same HTTPS origin. PostgreSQL runs in the dedicated `repairvantage` Neon project. Use the pooled connection as the Vercel runtime `DATABASE_URL` with the restricted application role. Use the direct owner connection only for migrations from a trusted release runner. Keep previews isolated from production data.

## Configure sign-in

Set `APP_ORIGIN` to the exact site origin. Configure `BETTER_AUTH_SECRET`, `DATABASE_URL`, and `TRUST_PROXY_HOPS` per the [server runbook](../server/README.md). The production target also requires:

| Setting | Source |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Web client. For the initial origin register `https://repairvantage.vercel.app/api/auth/callback/google` exactly. [Google setup](https://developers.google.com/identity/protocols/oauth2/web-server) |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | A sending key and an address on a verified sender domain. Use the Production environment in Vercel. [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction) |

Production checks require actual provider acceptance. Use a separate test database and provider configuration for hosted staging if one is needed. Keep credentials in the host's secret store.

## Package and release

1. Verify the reviewed commit locally or in CI. Check the server and client runtime audit results. Apply migrations using `DATABASE_URL` set to the verified direct connection and `npm --prefix server run prisma:deploy`.
2. Run `node scripts/package-vercel.mjs <reviewed-commit>`. The command prints the generated directory. Inspect the source revision, bundled assets and server files. The packager reads the committed tree.
3. Link only the generated directory to the verified Vercel project. From that directory use `vercel project inspect --non-interactive` and confirm the owner, project, and Node runtime before deploying. Use the remote build so Prisma's runtime engine is produced for Vercel's Linux environment. [Vercel Express deployment](https://vercel.com/docs/frameworks/backend/express)
4. Stage the release with `vercel deploy --prod --skip-domain`, then inspect its build and routes. Promote the verified production deployment to the canonical origin. The configured `APP_ORIGIN` is required for authentication and GraphQL writes, so exercise those flows at the canonical URL. [Vercel promotion and rollback](https://vercel.com/docs/cli/deploying-from-cli)
5. Record the source revision, public URL, migration state, and verification. For a failed release with a previous working deployment, roll back the Vercel deployment and assess schema compatibility separately.

## Release QA

- Request `/`, `/health`, and `/ready`. Open and refresh a nested client route. Confirm GraphQL and auth paths receive API responses.
- In clean browser sessions, complete Google consent and an emailed sign-in code. Verify logout and that a signed-out browser cannot open the private workspace. Test both providers with the same verified address before claiming account linking.
- Create a real repair project, update status, and reopen it after signing out. Invite a second verified account. It can read and comment. Remove it and retry the private URL and old invite.
- Publish a Showcase title and summary. Open the link signed out and check the public fields. Unpublish it and verify the URL stops resolving.
