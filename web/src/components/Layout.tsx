import { Link, NavLink, Outlet } from "react-router-dom";
import { Smartphone } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ANDROID_APK_DOWNLOAD_URL } from "../utils/links";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/upload", label: "Upload" },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper-raised)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo size={24} />
            {/* Full name only from small screens up — on a phone-width
                header, the icon alone carries the brand; the room is
                needed for the nav items instead. */}
            <span className="hidden sm:inline font-extrabold tracking-tight text-base sm:text-lg whitespace-nowrap">
              Smart Receipt Scanner
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[var(--color-ink)] text-white"
                      : "text-[var(--color-ink-soft)] hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={ANDROID_APK_DOWNLOAD_URL}
              title="Get the Android app (free APK)"
              className="ml-1 sm:ml-2 p-1.5 rounded-md text-[var(--color-ink-soft)] hover:bg-slate-100 hover:text-[var(--color-teal)]"
            >
              <Smartphone size={18} />
            </a>
            <button
              onClick={logout}
              className="px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap text-[var(--color-ink-soft)] hover:bg-slate-100"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
