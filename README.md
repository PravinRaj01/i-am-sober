# I AM Sober

A sobriety tracking and recovery support application built with React, TypeScript, and Supabase. The app provides tools for daily tracking, goal setting, journaling, community support, and AI-powered insights to help users on their recovery journey.

## Features

### Core Functionality
- Sobriety Counter: Real-time tracking of sober days, hours, and minutes
- Daily Check-ins: Log mood, urge intensity, and notes
- Goal Setting: Create and track recovery goals with AI suggestions
- Journal: Private journaling with AI sentiment analysis
- Progress Visualization: Charts and statistics to visualize achievements
- Achievements & XP: Gamified progress with levels and badges

### Community Features
- Community Milestones: Share achievements (anonymously or publicly)
- Reactions & Comments: Support others in their journey
- Online Member Count: See active community members

### AI-Powered Features
- Recovery Chatbot: 24/7 AI companion for support
- Mood Pattern Detection: Identify emotional trends
- Trigger Detection: AI analyzes journal entries for potential triggers
- Personalized Coping Strategies: Tailored recommendations
- Guided Meditations: AI-generated meditation scripts

### Settings & Privacy
- Privacy Controls: Control what's shared publicly
- Custom Backgrounds: Personalize your dashboard
- Reset & Delete Account: Full control over your data

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/iams-sober-path.git
cd iams-sober-path

# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev
```

Open http://localhost:8080 in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS, shadcn/ui components
- State Management: TanStack React Query
- Backend: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- AI: Integrated AI features using Gemini via Supabase Edge Functions
- Charts: Recharts, Chart.js
- Routing: React Router v6

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui primitives
│   ├── chatbot/        # AI chatbot components
│   ├── community/      # Community features
│   ├── coping/         # Coping tools
│   ├── goals/          # Goal management
│   ├── journal/        # Journal features
│   └── progress/       # Progress charts
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── pages/              # Route pages
├── utils/              # Utility functions
└── integrations/       # Supabase client

supabase/
├── functions/          # Edge functions (AI endpoints)
└── migrations/         # Database migrations
```

## Deploying to Vercel

### Step 1: Prepare Your Repository
Push your code to GitHub, GitLab, or Bitbucket.

### Step 2: Import Project in Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your repository

### Step 3: Configure Build Settings
Vercel auto-detects Vite. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### Step 4: Environment Variables
No environment variables are required for Vercel deployment.

The Supabase URL and anon key are already configured in the codebase (`src/integrations/supabase/client.ts`). All sensitive keys (AI API keys, service role keys) are stored securely in Supabase Edge Function secrets and never exposed to the frontend.

### Step 5: Deploy
Click "Deploy" and Vercel will build and deploy your app.

### Step 6: Configure Custom Domain (Optional)
In your Vercel project settings, add your custom domain under "Domains".

### Automatic Deployments
Vercel automatically deploys on every push to your main branch.

## Security

### Current Security Status
The application implements several security measures:

- Row Level Security (RLS): All user data protected by RLS policies
- Authentication Required: Supabase Auth for all user operations
- Edge Functions: Sensitive operations (AI calls) run server-side
- No Exposed Secrets: API keys stored in Supabase secrets
- Input Validation: Zod schemas for form validation

### Recommendations
- Enable Leaked Password Protection in Supabase Auth settings
- Review community table RLS policies to require authentication for reads
- Consider rate limiting on AI edge functions

### What's Protected
- SQL Injection: Supabase SDK uses parameterized queries
- XSS: React escapes output by default
- CSRF: Supabase Auth handles tokens securely
- Brute Force: Supabase Auth includes rate limiting

## Supabase Configuration

### Edge Functions
The app uses these edge functions (deployed automatically):

| Function | Purpose |
|----------|---------|
| `chat-with-ai` | AI chatbot conversations |
| `analyze-journal-sentiment` | Sentiment analysis |
| `detect-triggers` | Trigger detection |
| `detect-mood-patterns` | Mood pattern analysis |
| `suggest-coping-strategies` | Personalized coping tips |
| `suggest-recovery-goals` | AI goal suggestions |
| `generate-meditation` | Guided meditation scripts |
| `generate-motivation` | Motivational messages |
| `moderate-content` | Community content moderation |

### Database Tables
- `profiles`: User profiles and settings
- `check_ins`: Daily check-in logs
- `journal_entries`: Private journal entries
- `goals` / `goal_completions`: Goal tracking
- `achievements` / `user_achievements`: Gamification
- `community_interactions`: Community posts
- `chat_messages` / `conversations`: AI chat history
- `coping_activities`: Coping strategy usage

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Stay strong. Every day counts.
