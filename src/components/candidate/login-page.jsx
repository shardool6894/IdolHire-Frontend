import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

const ROLE = "candidate";
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Quick client-side check for fast feedback; the backend validates again.
const EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

const inputClass =
  "w-full border-2 border-ink bg-cream-light px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-light/50 focus:border-blue focus:ring-2 focus:ring-blue/30";

// credentials: "include" is what lets the browser store/send the httpOnly auth cookie.
async function api(path, body, method = "POST") {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function CandidateLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api("/auth/me", null, "GET")
      .then((data) => data.user.role === ROLE && setUser(data.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function onAuthenticated(u) {
    setUser(u);
    setPassword("");
    // TODO: once the candidate dashboard exists, use navigate("/candidate/dashboard") instead.
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address, like name@example.com");
      return;
    }

    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const data = await api(path, { email, password, role: ROLE });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(response) {
    setError(null);
    try {
      const data = await api("/auth/google", { credential: response.credential, role: ROLE });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    await api("/auth/logout").catch(() => {});
    setUser(null);
    setEmail("");
    setPassword("");
  }

  function toggleMode() {
    setError(null);
    setMode((m) => (m === "login" ? "signup" : "login"));
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
              Candidate
            </span>
          </div>
        </div>

        <div className="mt-8">
          <div className="mx-auto max-w-sm space-y-5 border-2 border-ink bg-cream-light p-6 shadow-hard">
            {checking ? (
              <p className="text-sm text-ink-light">Loading...</p>
            ) : user ? (
              /* Signed-in state */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-display text-lg uppercase tracking-tight text-ink">
                    You&rsquo;re signed in
                  </h2>
                  <p className="break-all text-sm text-ink-light">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="button-brutal inline-flex w-full items-center justify-center border-2 border-ink bg-transparent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream"
                >
                  Log out
                </button>
              </div>
            ) : (
              /* Login / signup */
              <>
                <div className="space-y-1">
                  <h2 className="font-display text-lg uppercase tracking-tight text-ink">
                    {mode === "login" ? "Log in" : "Create your account"}
                  </h2>
                  <p className="text-sm text-ink-light">Candidate account</p>
                </div>

                {error && (
                  <div className="border-2 border-red bg-red/10 px-4 py-3 text-sm text-red-dark">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-light">
                      Email
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-light">
                      Password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className={inputClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="button-brutal inline-flex w-full items-center justify-center gap-2 border-2 border-ink bg-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cream hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-ink-light transition-colors hover:text-red"
                >
                  {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <span className="h-0.5 flex-1 bg-ink/15" />
                  <span className="font-mono text-xs uppercase tracking-widest text-ink-light">or</span>
                  <span className="h-0.5 flex-1 bg-ink/15" />
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogle}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    text={"continue_with"}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}