import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("citizen" | "authority" | "admin")[];
}

const ADMIN_EMAIL = "raghavi_manyam@srmap.edu.in";

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Admin route: only allow the specific admin email
  if (allowedRoles?.includes("admin")) {
    const userEmail = user.email?.toLowerCase();
    if (userEmail !== ADMIN_EMAIL) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
          <div className="rounded-xl bg-card p-8 shadow-card text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">You do not have admin privileges to access this page.</p>
            <a href="/" className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Go Home</a>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const redirectPath = role === "admin" ? "/admin" : role === "authority" ? "/authority" : "/citizen";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
