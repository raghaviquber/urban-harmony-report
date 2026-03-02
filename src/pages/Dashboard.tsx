import { useState } from "react";
import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag, Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useIssues, Issue } from "@/store/issueStore";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusConfig: Record<Issue["status"], { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

type SortKey = "newest" | "oldest" | "most-voted";
const categories = ["All", "Roads", "Sanitation", "Water", "Electricity", "Others"];
const statuses: ("All" | Issue["status"])[] = ["All", "Pending", "In Progress", "Resolved"];

const DashboardPage = () => {
  const { issues, upvote, setStatus } = useIssues();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);

  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === "Pending").length,
    inProgress: issues.filter((i) => i.status === "In Progress").length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
  };

  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // Filter & sort
  const filtered = issues
    .filter((i) => {
      if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== "All" && i.status !== filterStatus) return false;
      if (filterCategory !== "All" && i.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "most-voted") return b.votes - a.votes;
      if (sortKey === "oldest") return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });

  const handleUpvote = (id: string) => {
    upvote(id);
    toast.success("Upvoted successfully!");
  };

  const handleMarkInProgress = (id: string) => {
    setStatus(id, "In Progress");
    toast.success("Issue marked as In Progress.");
  };

  const confirmResolve = () => {
    if (resolveTarget) {
      setStatus(resolveTarget, "Resolved");
      toast.success("Issue marked as Resolved!");
      setResolveTarget(null);
    }
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
              { label: "Total Issues", value: stats.total, color: "bg-primary/10 text-primary" },
              { label: "Pending", value: stats.pending, color: "bg-status-pending-bg text-status-pending" },
              { label: "In Progress", value: stats.inProgress, color: "bg-status-progress-bg text-status-progress" },
              { label: "Resolved", value: stats.resolved, color: "bg-status-resolved-bg text-status-resolved" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className={`mt-2 inline-flex items-center rounded-xl px-3 py-1 text-2xl font-bold ${s.color}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Analytics */}
          <div className="mt-8 rounded-xl bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Analytics Overview</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "Resolved", value: pct(stats.resolved), color: "bg-status-resolved" },
                { label: "In Progress", value: pct(stats.inProgress), color: "bg-status-progress" },
                { label: "Pending", value: pct(stats.pending), color: "bg-status-pending" },
              ].map((bar) => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{bar.label}</span>
                    <span className="text-muted-foreground">{bar.value}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary"
            >
              {statuses.map((s) => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary"
            >
              {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most-voted">Most Voted</option>
            </select>
          </div>

          {/* Issue List */}
          <div className="mt-6 space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-xl bg-card p-10 text-center shadow-card">
                <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">No issues match your filters.</p>
              </div>
            )}
            {filtered.map((issue) => {
              const cfg = statusConfig[issue.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={issue.id} className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
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
                      onClick={() => handleUpvote(issue.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary hover:-translate-y-0.5"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Upvote ({issue.votes})
                    </button>
                    {issue.status === "Pending" && (
                      <button
                        onClick={() => handleMarkInProgress(issue.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-status-progress-bg px-3 py-1.5 text-xs font-medium text-status-progress transition-all duration-200 hover:opacity-80 hover:-translate-y-0.5"
                      >
                        <Wrench className="h-3.5 w-3.5" /> Mark In Progress
                      </button>
                    )}
                    {issue.status !== "Resolved" && (
                      <button
                        onClick={() => setResolveTarget(issue.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-status-resolved-bg px-3 py-1.5 text-xs font-medium text-status-resolved transition-all duration-200 hover:opacity-80 hover:-translate-y-0.5"
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

      {/* Resolve Confirmation */}
      <AlertDialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this issue as resolved? This action indicates the problem has been fixed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResolve} className="rounded-xl bg-status-resolved text-primary-foreground hover:bg-status-resolved/90">
              Yes, Mark Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;
