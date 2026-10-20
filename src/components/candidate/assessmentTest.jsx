import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CodeEditor from "../sandbox.jsx";
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
  const isSDE = session.attempt.typeOfInterview === "SDE";
  return isSDE ? <SdeSandboxTest session={session} /> : <Test session={session} />;
}

const MAX_ANSWER_CHARS = 4000;
const MAX_QUESTION_CHARS = 500;

function Test({ session }) {
  const { attempt, questions, answers: savedAnswers, helper, now } = session;
  const total = questions.length;

  // Stages are answered in order and answers are final, so the number of answers is the current stage.
  const [answers, setAnswers] = useState(savedAnswers);
  const current = answers.length;
  const [locked, setLocked] = useState(helper.locked); // Helper locked for the current stage?
  const [messages, setMessages] = useState(helper.messages); // Helper chat for the current stage
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [results, setResults] = useState(null); // scores and feedback, once the test is submitted

  const finalizing = !done && current >= total;
  const answering = !done && !finalizing;

  // Countdown runs off the server's expiry time, corrected for this browser's clock drift.
  const expiresAt = new Date(attempt.expiresAt).getTime();
  const [clockOffset] = useState(() => new Date(now).getTime() - Date.now());
  const remaining = useCallback(() => Math.max(0, expiresAt - (Date.now() + clockOffset)), [expiresAt, clockOffset]);
  const [timeLeft, setTimeLeft] = useState(remaining);

  // Final submit. The ref stops the timer and the buttons from submitting twice.
  const submittingRef = useRef(false);
  const finish = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api(`/attempts/${attempt.id}/submit`, { method: "POST" });
      setResults(data.results);
      setDone(true);
    } catch (err) {
      if (err.status === 409) {
        setDone(true); // already submitted (e.g. from another tab)
      } else {
        // 403 = past the grace period: retrying can't help, so don't let the timer loop on it.
        if (err.status !== 403) submittingRef.current = false;
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }, [attempt.id]);

  // Tick every second; when time runs out, submit whatever has been answered so far.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const left = remaining();
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining, finish]);

  async function askHelper(e) {
    e.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setAsking(true);
    setError("");
    try {
      const data = await api(`/attempts/${attempt.id}/helper`, { method: "POST", body: { message: text } });
      setMessages((m) => [...m, { role: "candidate", content: text }, { role: "helper", content: data.reply }]);
      setQuestion("");
    } catch (err) {
      if (err.status === 403 && /locked/i.test(err.message)) setLocked(true);
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  async function lockHelper() {
    setBusy(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/lock`, { method: "POST" });
      setLocked(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/answers`, { method: "POST", body: { questionIndex: current, answer: text } });
      setAnswers((a) => [...a, text]);
      // Fresh Helper and draft for the next stage.
      setLocked(false);
      setMessages([]);
      setQuestion("");
      setDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function endTest() {
    if (window.confirm("End the test now? Stages you haven't answered will be left blank.")) finish();
  }

  const errorLine = error && <p className="text-xs font-semibold text-red">{error}</p>;

  return (
    <div className="mt-8 space-y-8">
      {/* Stepper + controls */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 max-w-3xl flex-1 items-center gap-3 overflow-x-auto py-1">
          {questions.map((_, i) => {
            const isDone = i < current || done;
            const active = answering && i === current;
            const style = active
              ? "border-red bg-cream-light text-red"
              : isDone
                ? "border-blue bg-blue/15 text-blue"
                : "border-ink/30 text-ink-light";
            return (
              <Fragment key={i}>
                {i > 0 && <span className="h-0.5 min-w-4 flex-1 bg-ink/20" />}
                <span
                  aria-label={`Stage ${i + 1}${isDone ? " (answered)" : active ? " (current)" : ""}`}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] font-mono text-sm font-bold ${style}`}
                >
                  {isDone ? "\u2713" : i + 1}
                </span>
              </Fragment>
            );
          })}
        </div>

        {!done && (
          <div className="flex items-center gap-4">
            <span
              className={`flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-sm tabular-nums ${
                timeLeft <= 60_000 ? "border-red font-bold text-red" : "border-ink/30 bg-cream-light text-ink-light"
              }`}
              aria-label="Time remaining"
            >
              <span className="h-2 w-2 rounded-full bg-blue" />
              {formatTime(timeLeft)}
            </span>
            <button
              type="button"
              onClick={endTest}
              disabled={busy}
              className="button-brutal border-[3px] border-red bg-cream-light px-6 py-3 text-sm font-bold uppercase tracking-wide text-red hover:bg-red hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
            >
              End test
            </button>
          </div>
        )}
      </div>

      {done && (
        <div className="space-y-6 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
          <div className="space-y-2">
            <h2 className="font-display text-xl uppercase tracking-tight text-ink">Test submitted</h2>
            <p className="text-base">Your responses have been sent to the recruiter.</p>
          </div>

          {results?.overallFeedback && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink">Overall feedback</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{results.overallFeedback}</p>
            </div>
          )}

          {results?.stages.length > 0 ? (
            <ul className="space-y-3">
              {results.stages.map((r) => (
                <li key={r.stage} className="border-2 border-ink/20 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs uppercase tracking-widest text-ink-light">
                      Stage {r.stage + 1}
                    </span>
                    <span className="font-mono font-bold">{r.score}/5</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{r.rationale}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-light">Scores aren&rsquo;t available yet.</p>
          )}
        </div>
      )}

      {finalizing && (
        <div className="space-y-5 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
          <p className="text-base">All stages answered. Finalizing...</p>
          {busy && <p className="text-sm text-ink-light">Grading your answers. This can take a minute.</p>}
          {errorLine}
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Grading..." : "Get final results"}
          </button>
        </div>
      )}

      {answering && (
        <>
          {/* The stage */}
          <div className="space-y-4 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
            <span className="inline-block border-2 border-yellow-dark bg-yellow/30 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              Stage {current + 1} of {total}
            </span>
            <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink">{questions[current].prompt}</p>
            {questions[current].trapClaim && (
              <blockquote className="space-y-1 border-l-4 border-blue bg-blue/5 px-4 py-3">
                <span className="block font-mono text-xs uppercase tracking-widest text-ink-light">AI copilot says</span>
                <p className="whitespace-pre-wrap text-sm">{questions[current].trapClaim}</p>
              </blockquote>
            )}
          </div>

          {/* Helper */}
          <div className="space-y-4 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink">
              {locked ? "Helper locked" : "Ask the Helper for hints"}
            </h2>

            {messages.length > 0 && (
              <ul className="space-y-3" aria-live="polite">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={`whitespace-pre-wrap border-2 px-3 py-2 text-sm ${
                      m.role === "candidate" ? "border-ink/20 bg-cream" : "border-blue/40 bg-blue/5"
                    }`}
                  >
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-light">
                      {m.role === "candidate" ? "You" : "Helper"}
                    </span>
                    {m.content}
                  </li>
                ))}
              </ul>
            )}

            {locked ? (
              <p className="text-sm text-ink-light">The Helper is locked for the rest of this stage.</p>
            ) : (
              <>
                <form onSubmit={askHelper} className="flex gap-3">
                  <input
                    className="min-w-0 flex-1 border-2 border-ink bg-cream-light px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-light/50 focus:border-blue focus:ring-2 focus:ring-blue/30"
                    placeholder="Ask a question..."
                    maxLength={MAX_QUESTION_CHARS}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={asking}
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="button-brutal border-2 border-ink bg-cream-light px-5 py-2 text-sm font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {asking ? "..." : "Ask"}
                  </button>
                </form>
                <p className="text-sm text-ink-light">
                  Once you&rsquo;re ready to answer, the Helper locks for the rest of this stage.
                </p>
                <button
                  type="button"
                  onClick={lockHelper}
                  disabled={busy || asking}
                  className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  I&rsquo;m ready to answer
                </button>
              </>
            )}
            {!locked && errorLine}
          </div>

          {/* The answer (only once the Helper is locked) */}
          {locked && (
            <div className="space-y-4 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
              <label htmlFor="answer" className="block text-sm font-bold uppercase tracking-wide text-ink">
                Your answer
              </label>
              <textarea
                id="answer"
                rows={8}
                maxLength={MAX_ANSWER_CHARS}
                autoFocus
                className="w-full border-2 border-ink bg-cream-light px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-light/50 focus:border-blue focus:ring-2 focus:ring-blue/30"
                placeholder="Write your answer here. It can't be changed once submitted."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <p className="text-right font-mono text-xs text-ink-light">
                {draft.length}/{MAX_ANSWER_CHARS}
              </p>
              {busy && <p className="text-sm text-ink-light">Saving and grading your answer...</p>}
              {errorLine}
              <button
                type="button"
                onClick={submitAnswer}
                disabled={busy || !draft.trim()}
                className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Submitting..." : current === total - 1 ? "Submit final answer" : "Submit answer"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SdeSandboxTest({ session }) {
  const { attempt, questions, answers: savedAnswers, helper, now } = session;
  const total = questions.length;

  // --- stage / answer state (mirrors the Non-SDE Test component) ---
  const [answers, setAnswers] = useState(savedAnswers);
  const current = answers.length;
  const [locked, setLocked] = useState(helper.locked);
  const [messages, setMessages] = useState(helper.messages);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [results, setResults] = useState(null);

  // --- code editor state ---
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [language, setLanguage] = useState("javascript");

  const finalizing = !done && current >= total;
  const answering = !done && !finalizing;

  // --- countdown timer (identical to Non-SDE) ---
  const expiresAt = new Date(attempt.expiresAt).getTime();
  const [clockOffset] = useState(() => new Date(now).getTime() - Date.now());
  const remaining = useCallback(() => Math.max(0, expiresAt - (Date.now() + clockOffset)), [expiresAt, clockOffset]);
  const [timeLeft, setTimeLeft] = useState(remaining);

  const submittingRef = useRef(false);
  const finish = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api(`/attempts/${attempt.id}/submit`, { method: "POST" });
      setResults(data.results);
      setDone(true);
    } catch (err) {
      if (err.status === 409) {
        setDone(true);
      } else {
        if (err.status !== 403) submittingRef.current = false;
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }, [attempt.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const left = remaining();
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining, finish]);

  // --- code execution via Piston proxy ---
  async function runCode() {
    if (!draft.trim()) return;
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await api("/sandbox/execute", {
        method: "POST",
        body: { language, code: draft },
      });
      setOutput(res.output || "Execution finished with no output.");
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  // --- Helper ---
  async function askHelper(e) {
    e.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setAsking(true);
    setError("");
    try {
      const data = await api(`/attempts/${attempt.id}/helper`, { method: "POST", body: { message: text } });
      setMessages((m) => [...m, { role: "candidate", content: text }, { role: "helper", content: data.reply }]);
      setQuestion("");
    } catch (err) {
      if (err.status === 403 && /locked/i.test(err.message)) setLocked(true);
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  async function lockHelper() {
    setBusy(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/lock`, { method: "POST" });
      setLocked(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // --- submit code as the answer for the current stage ---
  async function submitAnswer() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await api(`/attempts/${attempt.id}/answers`, { method: "POST", body: { questionIndex: current, answer: text } });
      setAnswers((a) => [...a, text]);
      setLocked(false);
      setMessages([]);
      setQuestion("");
      setDraft("");
      setOutput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function endTest() {
    if (window.confirm("End the test now? Stages you haven't answered will be left blank.")) finish();
  }

  const helperRef = useRef(null);
  useEffect(() => {
    if (helperRef.current) helperRef.current.scrollTop = helperRef.current.scrollHeight;
  }, [messages]);

  const errorLine = error && <p className="text-xs font-semibold text-red">{error}</p>;

  // ---- done / finalizing screens (full-width, no split pane) ----
  if (done) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
        <div className="space-y-6 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
          <div className="space-y-2">
            <h2 className="font-display text-xl uppercase tracking-tight text-ink">Test submitted</h2>
            <p className="text-base">Your responses have been sent to the recruiter.</p>
          </div>

          {results?.overallFeedback && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink">Overall feedback</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{results.overallFeedback}</p>
            </div>
          )}

          {results?.stages.length > 0 ? (
            <ul className="space-y-3">
              {results.stages.map((r) => (
                <li key={r.stage} className="border-2 border-ink/20 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs uppercase tracking-widest text-ink-light">
                      Stage {r.stage + 1}
                    </span>
                    <span className="font-mono font-bold">{r.score}/5</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{r.rationale}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-light">Scores aren&rsquo;t available yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (finalizing) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
        <div className="space-y-5 border-[3px] border-ink bg-cream-light p-8 shadow-hard-lg">
          <p className="text-base">All stages answered. Finalizing...</p>
          {busy && <p className="text-sm text-ink-light">Grading your answers. This can take a minute.</p>}
          {errorLine}
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            className="button-brutal border-[3px] border-ink bg-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Grading..." : "Get final results"}
          </button>
        </div>
      </div>
    );
  }

  // ---- main SDE interview layout ----
  return (
    <div className="flex h-screen w-full flex-col bg-cream">
      {/* Top bar: stepper + timer + end test */}
      <div className="flex shrink-0 items-center justify-between border-b-[3px] border-ink bg-cream-light px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {questions.map((_, i) => {
            const isDone = i < current;
            const active = i === current;
            const style = active
              ? "border-red bg-cream-light text-red"
              : isDone
                ? "border-blue bg-blue/15 text-blue"
                : "border-ink/30 text-ink-light";
            return (
              <Fragment key={i}>
                {i > 0 && <span className="h-0.5 w-3 bg-ink/20" />}
                <span
                  aria-label={`Stage ${i + 1}${isDone ? " (answered)" : active ? " (current)" : ""}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] font-mono text-xs font-bold ${style}`}
                >
                  {isDone ? "\u2713" : i + 1}
                </span>
              </Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 border-2 px-3 py-1 font-mono text-sm tabular-nums ${
              timeLeft <= 60_000 ? "border-red font-bold text-red" : "border-ink/30 bg-cream-light text-ink-light"
            }`}
            aria-label="Time remaining"
          >
            <span className="h-2 w-2 rounded-full bg-blue" />
            {formatTime(timeLeft)}
          </span>
          <button
            type="button"
            onClick={endTest}
            disabled={busy}
            className="border-2 border-red bg-cream-light px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-red hover:bg-red hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            End test
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Prompt + Helper + Submit */}
        <div className="flex w-[380px] shrink-0 flex-col border-r-[3px] border-ink bg-cream-light">
          {/* Prompt */}
          <div className="shrink-0 space-y-3 border-b-2 border-ink/20 p-4">
            <span className="inline-block border-2 border-yellow-dark bg-yellow/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              Stage {current + 1} of {total}
            </span>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{questions[current].prompt}</p>
            {questions[current].trapClaim && (
              <blockquote className="space-y-1 border-l-4 border-blue bg-blue/5 px-3 py-2">
                <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-light">AI copilot says</span>
                <p className="whitespace-pre-wrap text-xs">{questions[current].trapClaim}</p>
              </blockquote>
            )}
          </div>

          {/* Helper section */}
          <div className="flex min-h-0 flex-1 flex-col border-b-2 border-ink/20 p-4">
            <h3 className="mb-2 shrink-0 text-xs font-bold uppercase tracking-wide text-ink">
              {locked ? "Helper locked" : "Helper"}
            </h3>

            {/* Chat messages */}
            <div ref={helperRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap border-2 px-2 py-1.5 text-xs ${
                    m.role === "candidate" ? "border-ink/20 bg-cream" : "border-blue/40 bg-blue/5"
                  }`}
                >
                  <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-widest text-ink-light">
                    {m.role === "candidate" ? "You" : "Helper"}
                  </span>
                  {m.content}
                </div>
              ))}
            </div>

            {locked ? (
              <p className="mt-2 shrink-0 text-xs text-ink-light">Locked for this stage.</p>
            ) : (
              <div className="mt-2 shrink-0 space-y-2">
                <form onSubmit={askHelper} className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 border-2 border-ink bg-cream-light px-2 py-1.5 text-xs text-ink outline-none placeholder:text-ink-light/50 focus:border-blue"
                    placeholder="Ask a question..."
                    maxLength={MAX_QUESTION_CHARS}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={asking}
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="border-2 border-ink bg-cream-light px-3 py-1.5 text-xs font-bold uppercase text-ink hover:bg-ink hover:text-cream disabled:opacity-40"
                  >
                    {asking ? "..." : "Ask"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={lockHelper}
                  disabled={busy || asking}
                  className="w-full border-[3px] border-ink bg-red px-4 py-2 text-xs font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:opacity-40"
                >
                  I&rsquo;m ready to answer
                </button>
              </div>
            )}
            {!locked && errorLine}
          </div>

          {/* Submit code answer */}
          {locked && (
            <div className="shrink-0 space-y-2 p-4">
              <p className="text-xs text-ink-light">
                Your code in the editor is your answer. Submit when ready.
              </p>
              {busy && <p className="text-xs text-ink-light">Saving and grading your answer...</p>}
              {locked && errorLine}
              <button
                type="button"
                onClick={submitAnswer}
                disabled={busy || !draft.trim()}
                className="button-brutal w-full border-[3px] border-ink bg-red px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Submitting..." : current === total - 1 ? "Submit final answer" : "Submit answer"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Code Editor + Terminal */}
        <div className="flex min-w-0 flex-1 flex-col bg-ink text-cream">
          {/* Editor toolbar */}
          <div className="flex shrink-0 items-center justify-between border-b-2 border-ink-light/30 px-3 py-1.5">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-cream text-ink px-2 py-1 text-xs font-mono"
            >
              <option value="javascript">JavaScript (Node)</option>
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
            <button
              onClick={runCode}
              disabled={running || !draft.trim()}
              className="bg-blue px-4 py-1 text-xs font-bold uppercase text-cream hover:bg-blue-dark disabled:opacity-40"
            >
              {running ? "Running..." : "▶ Run"}
            </button>
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={draft} onChange={setDraft} language={language} />
          </div>

          {/* Output terminal */}
          <div className="h-1/4 shrink-0 overflow-y-auto border-t-2 border-ink-light/30 bg-black p-3 font-mono text-xs">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-ink-light">Output</span>
            <pre className={`whitespace-pre-wrap ${output.includes("Error:") ? "text-red" : "text-cream"}`}>
              {output || "Code output will appear here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}