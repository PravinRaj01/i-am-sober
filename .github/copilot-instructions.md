This file contains short, actionable guidance for AI coding agents working in the
`iams-sober-path` repository. Keep edits concise and only modify code with tests
or clear local verification steps when possible.

Quick context
- Framework: Vite + React (TSX) using `@vitejs/plugin-react-swc`.
- Styling: Tailwind CSS (see `tailwind.config.ts` and `index.css`).
- State / Data: Supabase for auth, storage and serverless functions. Client is
  at `src/integrations/supabase/client.ts` (uses a hard-coded url/key in repo).
- Data fetching: `@tanstack/react-query` via a single `QueryClient` in `src/App.tsx`.
- Routing: `react-router-dom` with a nested `Routes` structure (see `AppContent` in
  `src/App.tsx`). Main pages are under `src/pages/`.
- Serverless: Supabase Edge Functions live under `supabase/functions/`.

What to know before making changes
- Dev commands (from `package.json`):
  - `npm run dev` or `vite` — start local dev server (port configured in `vite.config.ts` to 8080).
  - `npm run build` — production build.
  - `npm run preview` — preview built assets.
  - `npm run lint` — run eslint over the codebase.
- Entry points:
  - `src/main.tsx` (root providers: `BackgroundProvider`)
  - `src/App.tsx` (QueryClient, TooltipProvider, Router and global UI providers)

Patterns and conventions
- UI primitives are in `src/components/ui/` and follow Radix primitives wrapped
  with Tailwind classes. Reuse them rather than adding new low-level markup.
- Sidebar and layout: `AppSidebar` is a stateful component that uses `useSidebar`
  context from `src/components/ui/sidebar`. Mobile behavior uses `isMobile` and
  `openMobile` flags — prefer using the context API rather than direct DOM toggles.
- Supabase usage:
  - Import the client: `import { supabase } from "@/integrations/supabase/client"`.
  - Storage example: `supabase.storage.from('logos').getPublicUrl('logo.png')` is
    used in `AppSidebar` and `StorageImage`.
  - Edge functions: call via fetch to your Supabase functions endpoint. Many
    functions expect JWT verification (see `supabase/config.toml`).
- Rate limits and error handling: several pages and serverless functions have
  explicit rate limit checks (see `supabase/functions/*` and `src/pages/*`). When
  adding new calls to AI or external APIs, follow the existing pattern of
  returning clear JSON errors and throttle logic.

Tests and validation
- There are no unit tests in the repo. For any change that affects runtime
  behavior, verify by running `npm run dev` and exercising flows in the browser.
- Linting: `npm run lint` — fix ESLint issues when editing shared UI primitives.

Files to inspect often
- `vite.config.ts` — dev server port + aliases (`@` -> `./src`).
- `src/integrations/supabase/client.ts` — supabase client and auth settings.
- `src/App.tsx` — global providers, routing, and QueryClient setup.
- `src/main.tsx` — root provider `BackgroundProvider` initialization.
- `src/components/ui/` — shared components built on Radix primitives.
- `supabase/functions/` — serverless functions; check `verify_jwt` settings in
  `supabase/config.toml` before changing auth behavior.

Small examples you can safely follow
- Adding a data-fetch with react-query:
  - Create a hook that uses `useQuery` and references `supabase` imports from
    `src/integrations/supabase`.
  - Register optimistic updates according to patterns in `src/pages/Community.tsx`.
- Updating storage assets:
  - Use `StorageImage` component for images uploaded to Supabase storage.
  - If you need to list or fetch bucket files, follow `AppSidebar`'s fallback pattern
    (try `getPublicUrl`, otherwise `list()` then `getPublicUrl`).

When to ask the maintainer
- Any change that touches authentication flows, the Supabase project ID/key,
  or serverless function `verify_jwt` configuration.
- API key, secret, or billing-related changes (AI usage limits) — these require
  explicit confirmation.

If you modify project settings
- Update `vite.config.ts` only if you understand the dev port and alias effects.
- If adding new dependencies, ensure they are added in `package.json` and are
  compatible with TypeScript 5.x and Vite 5.x (the repo uses these major versions).

Feedback
- If anything here is unclear or you want a shorter or more prescriptive set of
  rules (for example commit style, PR templates, or test expectations), tell me
  and I'll update this file.
