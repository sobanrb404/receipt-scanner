import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/upload", label: "Upload" },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper-raised)]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="font-extrabold tracking-tight text-lg">
            Receipt Scanner
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-ink)] text-white"
                      : "text-[var(--color-ink-soft)] hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={logout}
              className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-ink-soft)] hover:bg-slate-100"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
