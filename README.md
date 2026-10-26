<div align="center">
  <h1 align="center"><a href="https://www.epicweb.dev/epic-stack">The Epic Stack 🚀</a></h1>
  <strong align="center">
    Ditch analysis paralysis and start shipping Epic Web apps.
  </strong>
  <p>
    This is an opinionated project starter and reference that allows teams to
    ship their ideas to production faster and on a more stable foundation based
    on the experience of <a href="https://kentcdodds.com">Kent C. Dodds</a> and
    <a href="https://github.com/epicweb-dev/epic-stack/graphs/contributors">contributors</a>.
  </p>
</div>

```sh
npx create-epic-app@latest
```

[![The Epic Stack](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/246885449-1b00286c-aa3d-44b2-9ef2-04f694eb3592.png)](https://www.epicweb.dev/epic-stack)

[The Epic Stack](https://www.epicweb.dev/epic-stack)

<hr />

## Watch Kent's Introduction to The Epic Stack

[![Epic Stack Talk slide showing Flynn Rider with knives, the text "I've been around and I've got opinions" and Kent speaking in the corner](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/277818553-47158e68-4efc-43ae-a477-9d1670d4217d.png)](https://www.epicweb.dev/talks/the-epic-stack)

["The Epic Stack" by Kent C. Dodds](https://www.epicweb.dev/talks/the-epic-stack)

## Docs

[Read the docs](https://github.com/epicweb-dev/epic-stack/blob/main/docs)
(please 🙏).

## Amp orbs

`.agents/setup` installs Node 24.22.1 and npm 11.21.1 with the locked
dependencies, generates the Prisma client and icons, migrates and seeds a new
local SQLite database. Existing `.env` files and database contents are
preserved. Dependency installs are reused while the manifests, npm
configuration, and toolchain versions are unchanged. No browser downloads or
browser tests are run.

Amp snapshots the prepared environment for new orbs. `.agents/resume` only
restores missing local configuration; it does not install packages or start
servers. No production credentials are needed: development uses the existing API
mocks.

Run unit tests with `npm test -- --run`, or all checks (unit tests, lint,
typecheck, and production build) with `npm run validate`. To start a persistent
development preview and get its portal URL:

```sh
amp orb service start estimator --command 'npm run dev' --port 3000 --portal
```

The lifecycle files must reach the project's default branch before fresh orbs
can use this setup. Do not use `npm run setup` on an existing database: its seed
resets user data; the orb lifecycle seeds only when the local database does not
exist.

## Production deployment on GitHub

The only GitHub Actions job is production deployment to Fly.io, triggered by a
push to `main`. Pull requests and pushes to other branches do not run workflows.
There are no automated lint, test, or separate build checks; run
`npm run validate` locally before merging. The deploy still builds the Docker
image remotely on Fly.io. An in-progress deployment is not cancelled by a newer
push.

Despite its name, the existing Fly app `estimator-staging` is the production
destination for `main`, at https://estimator-staging.fly.dev. The workflow reads
the app name from `fly.toml`; it does not deploy to the separate `estimator`
app.

1. Confirm that `fly.toml` names your existing production Fly app (currently
   `estimator-staging`). The app must already have its persistent `data` volume
   in the primary region (`lax`), LiteFS/Consul lease configuration, and runtime
   secrets. `other/litefs.yml` requires `FLY_CONSUL_URL` and `PRIMARY_REGION` in
   addition to the platform-provided Fly variables. Configure application
   secrets such as `SESSION_SECRET`, `HONEYPOT_SECRET`,
   `INTERNAL_COMMAND_TOKEN`, and `RESEND_API_KEY` on Fly.io, not in the GitHub
   workflow. Never use the development placeholder secrets in production. GitHub
   OAuth credentials and the Sentry DSN also belong on Fly.io if those
   integrations are used.
2. Sign in to Fly with `fly auth login`, then create an app-scoped deploy token:

   ```sh
   fly tokens create deploy --app estimator-staging --expiry 720h
   ```

   Use your app name if different. This token expires after 30 days; rotate it
   before expiry. Copy the entire token, including its `FlyV1` prefix, directly
   into GitHub; do not commit it or post it in a chat.

3. In the GitHub repository, open **Settings → Secrets and variables → Actions →
   New repository secret**. Add `FLY_API_TOKEN` with that token. The existing
   Sentry source-map integration also accepts an optional `SENTRY_AUTH_TOKEN`
   repository secret; leave it unset if Sentry uploads are not configured. If
   `FLY_API_TOKEN` is scoped only to `estimator`, replace it with a token for
   `estimator-staging` before deploying.
4. Under **Settings → Actions → General**, ensure the repository policy permits
   `actions/checkout` and `superfly/flyctl-actions/setup-flyctl`. Read-only
   `GITHUB_TOKEN` permissions are sufficient. Under **Settings → Rules →
   Rulesets** (or **Branches → Branch protection rules**), remove any required
   ESLint, TypeScript, Vitest, Build, or Playwright checks that this workflow no
   longer produces. Do not make the post-merge deploy job a required PR check.
5. Merge the workflow into `main` when ready to deploy. That push automatically
   runs **Actions → Deploy Production**; open its job to see deployment logs.
   Future pushes to `main` deploy the same way. This workflow does not create
   the Fly app, volume, or Consul configuration for you.

**Database warning:** LiteFS startup runs `prisma migrate deploy` on the primary
machine. Back up and test the pending migrations against a copy of production
data before the first deployment of this update.

## Dependency and security maintenance

The updated lockfile retains Remix 2, React 18, Tailwind 3, and Prisma 5 rather
than mixing a framework migration into dependency maintenance. Node 24 is pinned
in `.node-version`, CI, and the Docker base image.

The October 2026 audit reduced npm findings from 85 (11 critical) to 10 (8 high,
2 moderate, none critical). Remaining findings are in the Remix 2 / React Router
6 / turbo-stream dependency chain. Resolving them requires a supported framework
migration; npm's suggested downgrades are not a safe fix. Re-run `npm audit`
when reviewing or deploying: this is not a clean security audit.

Application fixes enforce owner/permission checks on business routes, execute
custom calculations in a bounded QuickJS WASM realm instead of `node:vm`, and
await atomic CSV imports with temporary-file cleanup. Calculation scripts must
be synchronous and use JSON-compatible data; host I/O and imports are not
available.

The unused Sentry 7 native CPU profiler was removed because it cannot load on
Node 24; error reporting and transaction tracing remain enabled when configured.

The new `20261025040000_complete_estimate_models` migration reconciles
checked-in migrations with the current schema while retaining legacy data
tables. Back up and test against a copy of any deployed database before applying
it. Existing duplicate variable names within a model must be resolved before its
unique index can be created. No production migration is performed by this
repository update.

## Support

- 🆘 Join the
  [discussion on GitHub](https://github.com/epicweb-dev/epic-stack/discussions)
  and the [KCD Community on Discord](https://kcd.im/discord).
- 💡 Create an
  [idea discussion](https://github.com/epicweb-dev/epic-stack/discussions/new?category=ideas)
  for suggestions.
- 🐛 Open a [GitHub issue](https://github.com/epicweb-dev/epic-stack/issues) to
  report a bug.

## Branding

Want to talk about the Epic Stack in a blog post or talk? Great! Here are some
assets you can use in your material:
[EpicWeb.dev/brand](https://epicweb.dev/brand)

## Thanks

You rock 🪨
