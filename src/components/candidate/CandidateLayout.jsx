import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../api.js";

// Wraps every /candidate/* page except login: checks the session once, sends
// logged-out (or wrong-role) visitors to the login page, and draws the shared
// header (logo, email, log out). Child pages get `user` via useOutletContext().
export default function CandidateLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api("/auth/me")
      .then((data) => data.user.role === "candidate" && setUser(data.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function onLogout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    navigate("/candidate/auth");
  }

  if (checking) {
    return <p className="p-8 text-sm text-ink-light">Loading...</p>;
  }
  if (!user) return <Navigate to="/candidate/auth" replace />;

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
              Candidate
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[14rem] truncate font-mono text-xs text-ink-light sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="button-brutal border-2 border-ink bg-cream-light px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream"
            >
              Log out
            </button>
          </div>
        </div>
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
