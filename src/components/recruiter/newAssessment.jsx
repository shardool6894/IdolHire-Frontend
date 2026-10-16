import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api.js";

const inputClass =
  "w-full border-2 border-ink bg-cream-light px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-light/50 focus:border-blue focus:ring-2 focus:ring-blue/30";

export default function NewAssessment(){
  const navigate = useNavigate()

  const [sequences, setSequences] = useState([]);
  const [sequenceId, setSequenceId] = useState("");
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load question sequences for the dropdown
  useEffect(() => {
    api("/question-sequences")
      .then((data) => {
        setSequences(data.sequences);
        if (data.sequences.length) setSequenceId(data.sequences[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function createAssessment(e){
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/assessments", {
        method: "POST",
        body: { questionSequenceId: sequenceId, durationMinutes: Number(duration) },
      });
      navigate("/recruiter/assessments");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="transition-opacity hover:opacity-70"
            >
              <span className="flex items-center gap-2 font-display text-base uppercase tracking-tight text-ink">
                <span className="inline-block h-2.5 w-2.5 shrink-0 border-2 border-ink bg-red" />
                idolHire
              </span>
            </button>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-ink-light sm:inline">
              Recruiter
            </span>
          </div>
        </div>

        <div className="mt-8">
          <div className="mx-auto max-w-sm space-y-5 border-2 border-ink bg-cream-light p-6 shadow-hard">
            <h2 className="font-display text-lg uppercase tracking-tight text-ink">New assessment</h2>
            <form className="space-y-4" onSubmit={createAssessment}>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-light">Question sequence</span>
                <select
                  className={inputClass}
                  required
                  value={sequenceId}
                  onChange={(e) => setSequenceId(e.target.value)}
                >
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-light">Duration (minutes)</span>
                <input
                  className={inputClass}
                  min="1"
                  required
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>

              {error && <p className="text-xs font-semibold text-red">{error}</p>}

              <div className="flex gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 button-brutal border-2 border-ink bg-red text-cream hover:bg-ink "
                  type="submit"
                  disabled={loading || !sequenceId}
                >
                  Create assessment
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150 border-2 border-transparent bg-transparent text-ink-light hover:text-ink "
                  type="button"
                  onClick={()=>{navigate("/recruiter/assessments")}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}