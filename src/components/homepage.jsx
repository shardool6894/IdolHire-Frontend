import { useNavigate } from "react-router-dom";

function RoleCard({ tone, eyebrow, title, description, cta, onClick }) {
  const hover = tone === "red" ? "hover:border-red" : "hover:border-blue";
  const ctaColor = tone === "red" ? "text-red" : "text-blue";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`button-brutal group flex flex-col items-start gap-4 border-2 border-ink bg-cream-light p-6 text-left ${hover}`}
    >
      <span className="font-mono text-xs uppercase tracking-widest text-ink-light">{eyebrow}</span>
      <h2 className="font-display text-xl uppercase tracking-tight text-ink">{title}</h2>
      <p className="text-sm leading-relaxed text-ink-light">{description}</p>
      <span className={`mt-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide ${ctaColor}`}>
        {cta}
        <span className="transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
      </span>
    </button>
  );
}

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div className="bg-grid min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        <div className="reveal flex items-center gap-2 pb-10">
          <span className="inline-block h-3.5 w-3.5 shrink-0 border-2 border-ink bg-red" />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-light">idolHire</span>
        </div>

        <div className="reveal reveal-delay-1 space-y-4 pb-12">
          <h1 className="max-w-xl font-display text-4xl uppercase leading-tight tracking-tight text-ink sm:text-5xl">
            Practice the interview an AI can&rsquo;t talk you through.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-ink-light">
            Five stages, one fixed sequence: anchor, constraint, contradiction, AI trap, synthesis.
            Each one tests a different way of thinking under pressure.
          </p>
        </div>

        <div className="reveal reveal-delay-2 grid gap-5 sm:grid-cols-2">
          <RoleCard
            tone="red"
            eyebrow="Recruiter"
            title="Run an assessment"
            description="Pick a question sequence, set a time limit, and share a link. Review scores as candidates finish."
            cta="Continue as recruiter"
            onClick={() => navigate("/recruiter")}
          />
          <RoleCard
            tone="blue"
            eyebrow="Candidate"
            title="Take an assessment"
            description="Join with the token your recruiter sent you, then work through the interview against the clock."
            cta="Continue as candidate"
            onClick={() => navigate("/candidate")}
          />
        </div>
      </div>
    </div>
  );
}
