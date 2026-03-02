import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag } from "lucide-react";
import { useIssues, Issue } from "@/store/issueStore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusConfig: Record<Issue["status"], { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

const DashboardPage = () => {
  const { issues, upvote, setStatus } = useIssues();

  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === "Pending").length,
    inProgress: issues.filter((i) => i.status === "In Progress").length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Overview of all reported civic issues.</p>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Issues", value: stats.total, color: "bg-accent text-accent-foreground" },
              { label: "Pending", value: stats.pending, color: "bg-status-pending-bg text-status-pending" },
              { label: "In Progress", value: stats.inProgress, color: "bg-status-progress-bg text-status-progress" },
              { label: "Resolved", value: stats.resolved, color: "bg-status-resolved-bg text-status-resolved" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card p-6 shadow-card">
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className={`mt-2 inline-flex items-center rounded-lg px-3 py-1 text-2xl font-bold ${s.color}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Issue List */}
          <div className="mt-10 space-y-4">
            {issues.map((issue) => {
              const cfg = statusConfig[issue.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={issue.id} className="rounded-xl bg-card p-6 shadow-card transition hover:shadow-card-hover">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{issue.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {issue.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {issue.location}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                      <StatusIcon className="h-3.5 w-3.5" /> {issue.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <button
                      onClick={() => upvote(issue.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Upvote ({issue.votes})
                    </button>
                    {issue.status === "Pending" && (
                      <button
                        onClick={() => setStatus(issue.id, "In Progress")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-status-progress-bg px-3 py-1.5 text-xs font-medium text-status-progress transition hover:opacity-80"
                      >
                        <Wrench className="h-3.5 w-3.5" /> Mark In Progress
                      </button>
                    )}
                    {issue.status !== "Resolved" && (
                      <button
                        onClick={() => setStatus(issue.id, "Resolved")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-status-resolved-bg px-3 py-1.5 text-xs font-medium text-status-resolved transition hover:opacity-80"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
