export default function AssessmentResult({ assessment, onBack, onHome, user, onLogout }) {
  const rows = [
    { email: "candidate.one@example.com", score: "84", status: "Complete" },
    { email: "candidate.two@example.com", score: "—", status: "In progress" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between border-b-2 border-ink px-1 py-4 sm:px-0">
          <div className="flex items-baseline gap-3">
            <button type="button" onClick={onHome} className="transition-opacity hover:opacity-70">
              <span className="flex items-center gap-2 font-display text-base uppercase tracking-tight text-ink">
                <span className="inline-block h-2.5 w-2.5 shrink-0 border-2 border-ink bg-red" />
                idolHire
              </span>
            </button>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-ink-light sm:inline">
              Recruiter
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden max-w-[14rem] truncate font-mono text-xs text-ink-light sm:inline">
                {user.email}
              </span>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="button-brutal border-2 border-ink bg-cream-light px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 py-10">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-xs uppercase tracking-widest text-ink-light transition-colors hover:text-red"
            >
              &larr; Assessments
            </button>
            <h1 className="font-display text-3xl uppercase tracking-tight text-ink sm:text-4xl">Results</h1>
            <p className="font-mono text-sm text-ink-light">
              Token {assessment?.token ?? "—"} · {assessment?.duration ?? "—"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden border-[3px] border-ink bg-cream-light shadow-hard-lg">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b-2 border-ink bg-cream-dark px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink-light">
            <span>Candidate</span>
            <span>Score</span>
            <span>Status</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.email}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b-2 border-ink/15 px-6 py-4 last:border-b-0"
            >
              <span className="truncate text-sm">{row.email}</span>
              <span className="font-mono text-sm">{row.score}</span>
              <span className="text-sm font-bold uppercase tracking-wide text-blue">{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
