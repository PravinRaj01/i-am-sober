# I AM Sober

Light Vite + React TypeScript app for tracking sobriety progress, goals and community support.

This README focuses on what a developer (or an AI coding agent) needs to be productive.

Quick start

Prerequisites:

- Node.js (recommended 16+)
- npm (or compatible client)

Install and run locally (dev server runs on port 8080):

```bash
git clone https://github.com/PravinRaj01/iams-sober-path.git
cd iams-sober-path
npm install
npm run dev
```

Open http://localhost:8080 in your browser.

Available scripts (from `package.json`):

- `npm run dev` — start Vite dev server (port 8080; alias `@` -> `./src`).
- `npm run build` — production build.
- `npm run build:dev` — build with development mode.
- `npm run preview` — preview production build.
- `npm run lint` — run ESLint.

Architecture & important files

- Vite + React (TSX) with `@vitejs/plugin-react-swc` — config in `vite.config.ts`.
- Tailwind CSS is used for styling — see `tailwind.config.ts` and `src/index.css`.
- App entry: `src/main.tsx` (wraps `App` with `BackgroundProvider`).
- Global providers and routing: `src/App.tsx` (creates `QueryClient`, `TooltipProvider`, `BrowserRouter`).
- UI primitives built on Radix are in `src/components/ui/` — prefer reusing these components.

Supabase integration

- Client: `src/integrations/supabase/client.ts` — contains SUPABASE_URL and publishable key (present in the repo).
- Storage example: `src/components/AppSidebar.tsx` uses `supabase.storage.from('logos').getPublicUrl('logo.png')` and falls back to `list()`.
- Edge functions: located at `supabase/functions/*`. Many functions require JWT verification — check `supabase/config.toml` and the individual function headers (e.g. `verify_jwt = true`).

Routing and pages

- `src/App.tsx` defines routes and contains a nested routing pattern: top-level routes for `/auth` and `/onboarding`, and a `/*` route that wraps the sidebar and inner routes (Dashboard, Journal, Goals, Coping, Progress, Achievements, Community, Settings).
- Pages live in `src/pages/` (e.g. `Journal.tsx`, `Dashboard.tsx`, `Community.tsx`).

Conventions and examples

- Use the `@` path alias when importing from `src` (configured in `vite.config.ts`). Example:

  import { supabase } from "@/integrations/supabase/client";

- Sidebar behavior: `src/components/AppSidebar.tsx` uses `useSidebar()` (from `src/components/ui/sidebar`) and supports a `collapsed` desktop state and separate `openMobile` state — use the same context pattern for new layout pieces.

- React Query: a single `QueryClient` is created in `src/App.tsx`. Hooks and pages use `useQuery`/`useMutation` patterns — follow existing examples in `src/pages/Community.tsx` and `src/pages/Progress.tsx`.

- Rate limiting / errors: many Supabase functions and client pages implement rate checks and return JSON { error: string } responses. Mirror that shape in UI error handling.

Testing & linting

- There are no unit tests at present. Validate changes by running the dev server and exercising flows in the browser.
- Run `npm run lint` to catch linter issues. Fix shared UI primitives carefully.

License

This repository contains an MIT `LICENSE` file and `package.json` declares `"license": "MIT"`.

Where to look for help

- For auth or Supabase key changes, contact the maintainer — changing keys or `verify_jwt` flags impacts production behavior.
- For UI patterns, inspect `src/components/ui/*` and `src/components/AppSidebar.tsx`.

If you'd like, I can also:

- add a `CONTRIBUTING.md` with branch/commit conventions,
- scaffold a small test harness (Jest + React Testing Library) with 2-3 starter tests,
- or open a PR that wires a `.env.example` and documents required Supabase env variables.

---

Stay strong — every day counts.
# I AM Sober

I am Sober Path is a comprehensive application designed to support individuals on their sobriety journey. The platform offers a suite of features to help users track progress, set and achieve goals, and access motivational resources, all within a secure and user-friendly environment.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Authentication:** Secure sign-up, login, and profile management.
- **Daily Sobriety Tracking:** Log daily progress and milestones.
- **Goal Setting:** Create, edit, and track personal sobriety goals.
- **Progress Visualization:** Interactive charts and statistics to visualize achievements.
- **Motivational Quotes & Resources:** Curated content to inspire and support users.
- **Responsive Design:** Optimized for both desktop and mobile devices.
- **Data Privacy:** User data is handled securely and confidentially.

## Demo

A live demo (if available) can be accessed at: [Demo Link](https://your-demo-link.com)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm or yarn

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/iams-sober-path.git
cd iams-sober-path
npm install
```

### Running the Application

Start the development server:

```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

To create a production build:

```bash
npm run build
```

## Project Structure

```
iams-sober-path/
├── public/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Application pages (Home, Dashboard, etc.)
│   ├── utils/           # Utility functions and helpers
│   ├── App.js           # Main application component
│   └── index.js         # Entry point
├── package.json
└── README.md
```

## Technologies Used

- **React** for building the user interface
- **React Router** for navigation
- **Context API** or **Redux** for state management
- **Chart.js** or similar for data visualization
- **CSS Modules** or **Styled Components** for styling

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please open issues for suggestions or bug reports.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*Stay strong. Every day counts!*