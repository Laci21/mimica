import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-accent via-accent-light to-accent-dark bg-clip-text text-transparent">
            Mimica
          </h1>
          <p className="text-2xl text-foreground/80">
            AI User Personas Testing Platform
          </p>
        </div>

        <div className="space-y-4 text-lg text-foreground/70 max-w-2xl mx-auto">
          <p>
            Watch AI personas interact with your UI in real-time. Build a{" "}
            <span className="text-accent font-semibold">
              Trusted Knowledge Fabric
            </span>{" "}
            from their reasoning and feedback.
          </p>
          <p>
            Export insights directly to your coding agent for automatic UI
            improvements.
          </p>
        </div>

        <div className="flex gap-4 justify-center pt-8">
          <Link
            href="/lab"
            className="px-8 py-4 bg-accent hover:bg-accent-light transition-colors rounded-lg font-semibold text-lg"
          >
            Open Control Room
          </Link>
          <Link
            href="/app"
            className="px-8 py-4 bg-surface hover:bg-surface-light transition-colors rounded-lg font-semibold text-lg border border-border"
          >
            View Demo App
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-lg bg-surface border border-border">
            <h3 className="text-xl font-semibold mb-2 text-accent-light">
              1. Define Personas
            </h3>
            <p className="text-foreground/60">
              Create AI personas with unique goals, preferences, and pain
              points
            </p>
          </div>
          <div className="p-6 rounded-lg bg-surface border border-border">
            <h3 className="text-xl font-semibold mb-2 text-accent-light">
              2. Run Simulations
            </h3>
            <p className="text-foreground/60">
              Watch personas interact with your UI and narrate their reasoning
            </p>
          </div>
          <div className="p-6 rounded-lg bg-surface border border-border">
            <h3 className="text-xl font-semibold mb-2 text-accent-light">
              3. Build TKF
            </h3>
            <p className="text-foreground/60">
              Accumulate insights and export to coding agents for improvements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
