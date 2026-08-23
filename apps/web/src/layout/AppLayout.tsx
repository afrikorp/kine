import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, FileText, FolderOutput, Settings, LogOut, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/lib/utils.js";

const links = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/factures", label: "Factures", icon: FileText },
  { to: "/bordereaux", label: "Bordereaux", icon: FolderOutput },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-4 text-lg font-semibold">
          <Stethoscope className="h-5 w-5 text-primary" />
          KINE.CNAM
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="truncate text-muted-foreground">{user?.username}</span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background p-8">
        <Outlet />
      </main>
    </div>
  );
}
