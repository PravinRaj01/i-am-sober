# I AM Sober

An interactive sobriety tracking and recovery support application built with React, TypeScript, and Supabase. The app provides comprehensive tools for individuals on their recovery journey, including daily tracking, goal setting, journaling, community support, and AI-powered insights.

🔗 Live App: https://i-am-sober.vercel.app/

## Features

### Core Functionality
- **Sobriety Counter**: Real-time tracking of sober days, hours, and minutes with persistent storage
- **Daily Check-ins**: Log mood, urge intensity, and personal notes with timestamped entries
- **Goal Setting**: Create and track personalized recovery goals with AI-generated suggestions
- **Journal**: Private journaling with AI-powered sentiment analysis and mood tracking
- **Progress Visualization**: Interactive charts and statistics to visualize achievements over time
- **Achievements & XP**: Gamified progress system with levels, badges, and milestone celebrations

### Community Features
- **Community Milestones**: Share achievements anonymously or publicly with other users
- **Reactions & Comments**: Support system allowing users to interact with community posts
- **Online Member Count**: Real-time display of active community members

### AI-Powered Features
- **Recovery Chatbot**: 24/7 AI companion providing support and guidance
- **Mood Pattern Detection**: Automated analysis to identify emotional trends and patterns
- **Trigger Detection**: AI analysis of journal entries to identify potential triggers
- **Personalized Coping Strategies**: Tailored recommendations based on user data
- **Guided Meditations**: AI-generated meditation scripts for relaxation and mindfulness

### Settings & Privacy
- **Privacy Controls**: Granular control over what data is shared publicly
- **Custom Backgrounds**: Personalize the dashboard with custom backgrounds
- **Account Management**: Full control with options to reset or delete account data

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack React Query
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI Integration**: Gemini AI via Supabase Edge Functions
- **Charts**: Recharts, Chart.js
- **Routing**: React Router v6

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
│   └── progress/       # Progress charts and visualizations
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── pages/              # Route-based page components
├── utils/              # Utility functions and helpers
├── integrations/       # Supabase client and API integrations
├── types/              # TypeScript type definitions
└── lib/                # Library configurations

supabase/
├── functions/          # Edge functions for AI endpoints
└── migrations/         # Database schema migrations

public/                 # Static assets
├── vite.config.ts      # Vite build configuration
├── tailwind.config.ts  # Tailwind CSS configuration
├── package.json        # Project dependencies and scripts
└── README.md           # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun package manager

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/iams-sober-path.git
   cd iams-sober-path
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:8080 in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality checks |

## Deploying to Vercel

### Step 1: Prepare Repository
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

The Supabase URL and anon key are configured in `src/integrations/supabase/client.ts`. Sensitive keys are stored in Supabase Edge Function secrets.

### Step 5: Deploy
Click "Deploy" to build and deploy the app.

### Automatic Deployments
Vercel automatically deploys on every push to the main branch.

## Supabase Configuration

### Edge Functions
The app uses these serverless functions:

| Function | Purpose |
|----------|---------|
| `chat-with-ai` | Handles AI chatbot conversations |
| `analyze-journal-sentiment` | Performs sentiment analysis on journal entries |
| `detect-triggers` | Identifies potential triggers in user data |
| `detect-mood-patterns` | Analyzes mood patterns over time |
| `suggest-coping-strategies` | Generates personalized coping strategies |
| `suggest-recovery-goals` | Provides AI-suggested recovery goals |
| `generate-meditation` | Creates guided meditation scripts |
| `generate-motivation` | Generates motivational messages |
| `moderate-content` | Moderates community content |
| `check-ownership` | Validates user ownership of resources |

### Database Tables
- `profiles`: User profiles and settings
- `check_ins`: Daily check-in logs with mood and notes
- `journal_entries`: Private journal entries with metadata
- `goals` / `goal_completions`: Goal tracking system
- `achievements` / `user_achievements`: Gamification data
- `community_interactions`: Community posts and interactions
- `chat_messages` / `conversations`: AI chat history
- `coping_activities`: User coping strategy usage

## Security

### Implemented Security Measures
- **Row Level Security (RLS)**: All user data protected by database-level policies
- **Authentication Required**: Supabase Auth required for all operations
- **Server-side Processing**: AI operations run in Edge Functions
- **Secure Key Storage**: API keys stored in Supabase secrets
- **Input Validation**: Zod schemas for all form inputs

### Security Protections
- SQL Injection: Prevented by Supabase parameterized queries
- XSS: Mitigated by React's automatic output escaping
- CSRF: Handled securely by Supabase Auth
- Brute Force: Rate limiting via Supabase Auth

## Usage

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Dashboard**: View your sobriety counter and recent activity
3. **Daily Check-in**: Log your mood and any urges or notes
4. **Set Goals**: Create recovery goals with AI assistance
5. **Journal**: Write private entries with sentiment analysis
6. **Community**: Share milestones and support others
7. **AI Chat**: Get 24/7 support from the recovery chatbot
8. **Progress**: View charts and achievements
9. **Settings**: Customize privacy and appearance

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Stay strong. Every day counts.
