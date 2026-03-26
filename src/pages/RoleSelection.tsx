import { useNavigate } from "react-router-dom";
import { FileText, Users, Shield } from "lucide-react";

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRole = (role: "citizen" | "admin") => {
    localStorage.setItem("selectedRole", role);
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 inline-flex items-center gap-2 font-heading text-2xl font-bold text-primary">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          CivicReport
        </div>
        <p className="mb-8 text-muted-foreground">How would you like to continue?</p>

        <div className="grid gap-4">
          <button
            onClick={() => handleRole("citizen")}
            className="flex items-center gap-4 rounded-xl bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Continue as Citizen</h3>
              <p className="text-sm text-muted-foreground">Report issues, upvote, and track progress</p>
            </div>
          </button>

          <button
            onClick={() => handleRole("admin")}
            className="flex items-center gap-4 rounded-xl bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/20">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Continue as Admin</h3>
              <p className="text-sm text-muted-foreground">Manage issues, assign authorities, analytics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
