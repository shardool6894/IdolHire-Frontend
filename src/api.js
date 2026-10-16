// One place for the backend URL and fetch boilerplate.
// credentials: "include" is what lets the browser send the httpOnly auth cookie.
export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}
