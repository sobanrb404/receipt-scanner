import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";
import { ANDROID_APK_DOWNLOAD_URL } from "../utils/links";

export function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-teal)] mb-2">
            Receipt Scanner
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-ink)] text-white rounded-md py-2.5 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-soft)] mt-4">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-[var(--color-accent)] font-medium hover:underline"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>

        <a
          href={ANDROID_APK_DOWNLOAD_URL}
          className="mt-6 flex items-center justify-center gap-2 border border-[var(--color-line)] rounded-md py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-slate-50 hover:text-[var(--color-ink)] transition-colors"
        >
          <Smartphone size={16} />
          Get the Android app (free APK)
        </a>
      </div>
    </div>
  );
}
