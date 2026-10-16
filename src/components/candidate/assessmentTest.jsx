import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api.js";

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  return `${String(m).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Outer shell: gets the session from the join page (router state), or, after a
// refresh, joins again with the token in the URL, which resumes the same attempt.
export default function AssessmentTest() {
  const { token } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(location.state ?? null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (session) return;
    api("/attempts/join", { method: "POST", body: { token } })
      .then(setSession)
      .catch((err) => setLoadError(err.message));
  }, [session, token]);

  if (loadError) {
    return (
      <div className="mt-8 space-y-4">
        <p className="text-sm font-semibold text-red">{loadError}</p>
        <Link to="/candidate/join" className="font-mono text-xs uppercase tracking-widest text-ink-light hover:text-red">
          &larr; Back
        </Link>
      </div>
    );
  }
  if (!session) return <p className="mt-8 text-sm text-ink-light">Loading...</p>;

  return <Test session={session} />;
}

function Test({ session }) {
  const { attempt, questions, answers: savedAnswers, now } = session;
  const total = questions.length;

  const firstOpen = savedAnswers.indexOf(null);
  const [answers, setAnswers] = useState(savedAnswers);
  const [current, setCurrent] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [selected, setSelected] = useState(savedAnswers[firstOpen === -1 ? 0 : firstOpen]);
  const [phase, setPhase] = useState(firstOpen === -1 ? "finalizing" : "answering"); // answering | finalizing | done
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Countdown runs off the server's expiry time, corrected for this browser's clock drift.
  const expiresAt = new Date(attempt.expiresAt).getTime();
  const [clockOffset] = useState(() => new Date(now).getTime() - Date.now());
  const remaining = useCallback(() => Math.max(0, expiresAt - (Date.now() + clockOffset)), [expiresAt, clockOffset]);
  const [timeLeft, setTimeLeft] = useState(remaining);
  // Final submit. The ref stops the timer and the buttons from submitting twice.
  const submittingRef = useRef(false);
  const finish = useCallback(
    async (finalAnswers) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const data = await api(`/attempts/${attempt.id}/submit`, { method: "POST", body: { answers: finalAnswers } });
        setResult(data.result);
        setPhase("done");
      } catch (err) {
        if (err.status === 409) {
          setPhase("done"); // already submitted (e.g. from another tab)
        } else {
          // 403 = past the grace period: retrying can't help, so don't let the timer loop on it.
          if (err.status !== 403) submittingRef.current = false;
          setError(err.message);
        }
      } finally {
        setSaving(false);
      }
    },
    [attempt.id]
  );

  // Tick every second; when time runs out, send whatever has been answered so far.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const left = remaining();
      setTimeLeft(left);
      if (left <= 0) finish(answersRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining, finish]);

  function goTo(i) {
    setCurrent(i);
    setSelected(answers[i]);
    setPhase("answering");
    setError("");
  }

  // Saves this stage, then jumps to the next unanswered one (or to the finish screen).
  async function submitStage() {
    if (selected === null) return;
    setSaving(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/answers`, {
        method: "POST",
        body: { questionIndex: current, answer: selected },
      });
      const next = answers.map((a, i) => (i === current ? selected : a));
      setAnswers(next);
      const target = next.map((_, k) => (current + 1 + k) % total).find((i) => next[i] === null);
      if (target === undefined) {
        setPhase("finalizing");
      } else {
        setCurrent(target);
        setSelected(next[target]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function endTest() {
    if (window.confirm("End the test now? Stages you haven't answered will be left blank.")) finish(answers);
  }

  const question = questions[current];
  const done = phase === "done";

  return (
    <div className="mt-8 space-y-8">
      {/* Stepper + controls */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 max-w-3xl flex-1 items-center gap-3 overflow-x-auto py-1">
          {questions.map((_, i) => {
            const answered = answers[i] !== null;
            const active = !done && phase === "answering" && i === current;
            const style = active
              ? "border-blue bg-blue text-cream"
              : answered
                ? "border-blue bg-blue/15 text-blue"
                : "border-ink/30 text-ink-light";
            return (
              <Fragment key={i}>
                {i > 0 && <span className="h-0.5 min-w-4 flex-1 bg-blue/40" />}
                <button
                  type="button"
                  disabled={done}
                  onClick={() => goTo(i)}
                  aria-label={`Stage ${i + 1}${answered ? " (answered)" : ""}`}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] font-mono text-sm font-bold transition-colors disabled:cursor-default ${style}`}
                >
                  {answered && !active ? "\u2713" : i + 1}
                </button>
              </Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {!done && (
            <span
              className={`font-mono text-sm tabular-nums ${timeLeft <= 60_000 ? "font-bold text-red" : "text-ink-light"}`}
              aria-label="Time remaining"
            >
              {formatTime(timeLeft)}
            </span>
          )}
          {!done && (
            <button
              type="button"
              onClick={endTest}
              disabled={saving}
              className="button-brutal border-[3px] border-red bg-cream-light px-6 py-3 text-sm font-bold uppercase tracking-wide text-red hover:bg-red hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
            >
              End test
            </button>
          )}
        </div>
      </div>

      {/* Stage panel */}
      <div className="border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
        {done ? (
          <div className="space-y-3">
            <h2 className="font-display text-xl uppercase tracking-tight text-ink">Test submitted</h2>
            {result ? (
              <p className="text-base">
                Your score: <span className="font-mono font-bold">{result.score}/{result.maxScore}</span>
              </p>
            ) : (
              <p className="text-base">This assessment was already submitted.</p>
            )}
            <p className="text-sm text-ink-light">Your responses have been sent to the recruiter.</p>
          </div>
        ) : phase === "finalizing" ? (
          <div className="space-y-5">
            <p className="text-base">All stages answered. Finalizing...</p>
            {error && <p className="text-xs font-semibold text-red">{error}</p>}
            <button
              type="button"
              onClick={() => finish(answers)}
              disabled={saving}
              className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Submitting..." : "Get final results"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-light">
                Stage {current + 1} of {total} &middot; {question.points} {question.points === 1 ? "pt" : "pts"}
              </p>
              <h2 className="text-xl font-semibold text-ink">{question.prompt}</h2>
            </div>

            <div role="radiogroup" aria-label="Answer options" className="space-y-3">
              {question.options.map((option, idx) => {
                const checked = selected === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setSelected(idx)}
                    className={`flex w-full items-center gap-4 border-2 px-4 py-3 text-left text-sm transition-colors ${
                      checked ? "border-blue bg-blue/10 font-semibold" : "border-ink bg-cream-light hover:bg-cream-dark"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        checked ? "border-blue" : "border-ink"
                      }`}
                    >
                      {checked && <span className="h-2.5 w-2.5 rounded-full bg-blue" />}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-xs font-semibold text-red">{error}</p>}

            <button
              type="button"
              onClick={submitStage}
              disabled={saving || selected === null}
              className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Submit answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
