import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, BarChart3, Home, Menu, X, LogOut, Shield, Wrench, Users, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user
    ? [
        ...(role === "citizen" ? [{ to: "/citizen", label: "My Dashboard", icon: Home }] : []),
        ...(role === "authority" ? [{ to: "/authority", label: "Authority Panel", icon: Wrench }] : []),
        ...(role === "admin" ? [{ to: "/admin", label: "Admin Panel", icon: Shield }] : []),
        ...(role === "citizen" ? [{ to: "/citizen", label: "Report Issue", icon: FileText }] : []),
      ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/login", label: "Login", icon: Users },
      ];

  // Deduplicate by 'to'
  const uniqueNav = navItems.filter((item, i, arr) => arr.findIndex((x) => x.to === item.to) === i);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? (role === "admin" ? "/admin" : role === "authority" ? "/authority" : "/citizen") : "/"} className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          CivicReport
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {uniqueNav.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to + item.label} to={item.to}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
          {user && (
            <div className="ml-3 flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{role}</span>
              <span className="text-sm text-muted-foreground">{profile?.display_name}</span>
              <button onClick={handleSignOut} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden">
          {uniqueNav.map((item) => (
            <Link key={item.to + item.label} to={item.to} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${location.pathname === item.to ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
          {user && (
            <button onClick={() => { handleSignOut(); setMobileOpen(false); }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
