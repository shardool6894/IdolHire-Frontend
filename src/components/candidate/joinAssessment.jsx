import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api.js";

const inputClass =
  "w-full border-2 border-ink bg-cream-light px-3 py-2 font-mono text-sm uppercase text-ink outline-none transition-colors placeholder:normal-case placeholder:text-ink-light/50 focus:border-blue focus:ring-2 focus:ring-blue/30";

export default function JoinAssessment() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const clean = token.trim().toUpperCase();
      // Starts the attempt (and the timer) on the server, or resumes one already in progress.
      const session = await api("/attempts/join", { method: "POST", body: { token: clean } });
      navigate(`/candidate/test/${encodeURIComponent(clean)}`, { state: session });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mx-auto max-w-md space-y-5 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
        <div className="space-y-2">
          <h1 className="font-display text-2xl uppercase tracking-tight text-ink">Join an assessment</h1>
          <p className="text-base text-ink-light">Enter the share token your recruiter sent you.</p>
        </div>

        <form className="space-y-5" onSubmit={handleJoin}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-light">Share token</span>
            <input
              className={inputClass}
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. K7QM-X2RT"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>

          {error && <p className="text-xs font-semibold text-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="button-brutal inline-flex w-full items-center justify-center border-[3px] border-ink bg-red px-5 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Joining..." : "Join and begin"}
          </button>
        </form>
      </div>
    </div>
  );
}
