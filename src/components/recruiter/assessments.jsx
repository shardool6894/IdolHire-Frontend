import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { api } from "../../api.js";

export default function AssessmentsUI() {
  const { user, onLogout } = useOutletContext();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/assessments")
      .then((data) => setAssessments(data.assessments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function copyToken(token) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between border-b-2 border-ink px-1 py-4 sm:px-0">
          <div className="flex items-baseline gap-3">
            <button type="button" onClick={() => navigate("/")} className="transition-opacity hover:opacity-70">
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

        <div className="flex flex-wrap items-center justify-between gap-4 py-10">
          <h1 className="font-display text-3xl uppercase tracking-tight text-ink sm:text-4xl">Assessments</h1>
          <Link to = "/recruiter/assessments/new"><button
            type="button"
            className="button-brutal border-2 border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink"
          >
            New Assessment
          </button></Link>
        </div>

        {loading && <p className="text-sm text-ink-light">Loading...</p>}
        {error && <p className="text-sm font-semibold text-red">{error}</p>}
        {!loading && !error && assessments.length === 0 && (
          <p className="text-sm text-ink-light">No assessments yet. Create your first one.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {assessments.map((assessment) => (
            <article key={assessment.id} className="border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
              <div className="mb-6 flex items-start justify-between">
                <span className="font-mono text-sm font-medium">{assessment.durationMinutes} min</span>
                <span className="border-2 border-blue px-4 py-1 text-sm font-bold tracking-wide text-blue">
                  {assessment.status}
                </span>
              </div>

              <div className="mb-8 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 border-2 border-ink bg-cream-dark px-3 py-1 font-mono text-sm">
                  <span>{assessment.token}</span>
                  <button type="button" onClick={() => copyToken(assessment.token)} className="cursor-pointer hover:underline">
                    {copied === assessment.token ? "copied" : "copy"}
                  </button>
                </div>
                <span className="font-mono text-sm text-ink-light">created {new Date(assessment.createdAt).toLocaleDateString()}</span>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/recruiter/assessments/${assessment.id}`)}
                className="button-brutal border-[3px] border-ink bg-cream-light px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream"
              >
                View Results
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
