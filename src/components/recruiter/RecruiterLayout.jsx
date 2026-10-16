import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../api.js";

// Wraps every /recruiter/* page except login: checks the session once, sends
// logged-out (or wrong-role) visitors to the login page, and hands `user` and
// `onLogout` to the child pages through useOutletContext().
export default function RecruiterLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api("/auth/me")
      .then((data) => data.user.role === "recruiter" && setUser(data.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function onLogout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    navigate("/recruiter/auth");
  }

  if (checking) {
    return <p className="p-8 text-sm text-ink-light">Loading...</p>;
  }
  if (!user) return <Navigate to="/recruiter/auth" replace />;

  return <Outlet context={{ user, onLogout }} />;
}
