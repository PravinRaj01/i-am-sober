// I Am Sober – landing page

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="container mx-auto py-10">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-lg font-semibold">I Am Sober</a>
          <div className="flex items-center gap-3">
            <a className="text-sm text-muted-foreground hover:text-foreground" href="#features">Features</a>
            <a className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">Dashboard</a>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4">
        <section className="flex flex-col items-center text-center py-14 md:py-24">
          <h1 className="mb-4 text-4xl md:text-6xl font-bold tracking-tight">
            I Am Sober – Supportive Sobriety Tracker
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Track your sobriety time, log moods and triggers, set goals, journal reflections, and stay motivated with gentle reminders.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/dashboard" className="inline-flex">
              <span className="rounded-md px-6 py-3 text-sm font-medium hero bg-gradient-primary text-primary-foreground border border-primary/20 shadow-elegant transition-smooth">
                Get Started
              </span>
            </a>
            <a href="#features" className="inline-flex">
              <span className="rounded-md px-6 py-3 text-sm font-medium border bg-background hover:bg-accent hover:text-accent-foreground transition-smooth">
                Explore Features
              </span>
            </a>
          </div>
        </section>
        <section id="features" className="grid gap-6 md:grid-cols-3 pb-20">
          <article className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">Sobriety Counter</h2>
            <p className="text-muted-foreground">See days and hours since your last relapse with milestone badges.</p>
          </article>
          <article className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">Check-ins & Journal</h2>
            <p className="text-muted-foreground">Quick mood/trigger logs and freeform reflections to build awareness.</p>
          </article>
          <article className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">Goals & Reminders</h2>
            <p className="text-muted-foreground">Set recovery goals and get gentle reminders to stay on track.</p>
          </article>
        </section>
      </main>
      <footer className="container mx-auto px-4 pb-10 text-center text-sm text-muted-foreground">
        <p>Built with care. You are not alone.</p>
      </footer>
    </div>
  );
};

export default Index;
