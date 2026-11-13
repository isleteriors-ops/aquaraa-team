# Aquaraa Team — standalone edition

Hotel employee management with email/password authentication through Supabase. The previous Sites deployment is retained during cutover.

## Features and access

Employee profiles, shifts, attendance, leave, saved payroll, MVR and USD amounts, equal service-charge distribution, and staff registration are retained. Owner `hello@aquaraa.com` manages staff and managers. Managers manage all operational records; staff see only their own shifts, attendance, leave and payroll, and can change only their own pending leave requests. Roles and active status are checked server-side on every request. The database has RLS enabled with no browser grants. Only the server service key accesses it.

No public account registration route is provided. The administrator registers staff emails, then creates one-time setup links for private delivery. The provider stores passwords. Application sessions use HTTP-only, same-site cookies; identity is verified with Supabase `getUser`. ChatGPT identity headers are not accepted. Staff emails bind to a verified, stable Supabase ID at first access. Revoked or inactive accounts lose hotel access on the next request.

## Remaining provider setup

1. Connect Supabase and create a dedicated Aquaraa project in the intended organization. Choose Singapore if available. No real project has been created by this source preparation.
2. Apply `supabase/migrations/001_aquaraa.sql` to the dedicated project. Do not use an unrelated existing application's database.
3. Disable public signups. Enable email/password auth, require email confirmation, set minimum password length to 12, and set account link expiry (recommended 1 hour). Keep secure email changes enabled.
4. Password recovery defaults to private administrator-issued setup/reset links. To enable email recovery, configure production SMTP and the two HTML templates in `supabase/email-templates`, verify delivery, then set `AQUARAA_EMAIL_RESET_ENABLED=true`. These token-hash templates are required; default implicit-flow email templates are not supported by these server-only sessions.
5. Set Site URL and allowed redirects to the final HTTPS origin. Keep localhost allowlisted only for local testing.
6. Set environment variables from `.env.example` through Render's secret configuration. No Supabase secret is exposed to browser code. `SITE_URL` must equal the exact public origin used for login (no trailing path). Add a custom domain only after DNS validation, then update this setting and Supabase's settings together.
7. Publish the source to a private GitHub repository accessible to Render. The user confirmed Render workspace `isleteriors` (`tea-db8cpmks728c73907i40`). Existing `isleteriors-os` is unrelated and must not be changed.
8. Use the web-service configuration in `render.yaml`. It starts on a free plan for setup/testing; Render advises against using free plans for production. Confirm an appropriate paid plan and cost before staff rollout. No paid plan has been purchased.

## Data migration and cutover

Do not open the destination to users before importing existing records: the first admin login initializes a new blank workspace. Coordinate a brief pause in edits to the old site, then export the live D1 workspace and member registrations through the Sites owner tools. Store this export outside the repository in a private file. Do not use local QA data as a production export.

The import document is `{ownerId,revision,data,members}` where `data` is the original complete workspace object and member rows contain `id,employee_id,email,role,created_at`. Preserve employee IDs and payroll snapshots. Run `npx tsx scripts/import-records.ts /absolute/private/export.json` with server credentials securely loaded. The import is transactional, refuses to overwrite an initialized destination, retains the original workspace key, and intentionally discards old ChatGPT account bindings. Verify counts, member mappings and exact workspace data before cutover. If no workspace exists on the old site, skip the import and bootstrap normally.

Run `node scripts/admin-setup.mjs /absolute/private/admin-link.txt` to create a one-time setup link for `hello@aquaraa.com`; no email is sent. The output file is created with mode 0600 and is not overwritten. Share the link privately with the owner, who chooses their own password. After the owner has signed in, verify roles using dedicated test accounts (not real staff payroll). Remove test accounts and test records before staff rollout.

Do not retire the old site until the new admin login, staff isolation, registration/revocation, password recovery, and record comparison have all passed. Verify reset email delivery separately before enabling email recovery. Keep a private export for recovery. Configure provider backups before operational use; this source does not configure backups or email services automatically.

## Local development and checks

Node 24 is recommended. Run `npm ci`, copy `.env.example` to `.env.local` and populate a dedicated test project's values, then run `npm run dev`. A production build uses `npm run build`; `npm start` binds `0.0.0.0:$PORT` (3000 by default). `/api/health` returns 503 until Supabase and the schema are reachable.

- `npm test`: calculation, staff isolation, auth redirect/origin, and PostgreSQL migration/access tests using an isolated PGlite database.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: production Next.js bundle.

Local database tests do not replace hosted Supabase integration tests, real email delivery checks, or post-deployment verification. Credentials are required for those checks.

Payroll remains an operational calculation tool: full monthly base, recurring allowances, manual additions/deductions, and equal service charge in each currency. It does not calculate statutory tax/pension, overtime, salary proration, or transfer bank payments.
