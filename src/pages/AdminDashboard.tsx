import { useState, useEffect, useCallback } from "react";
import {
  Clock, Wrench, CheckCircle2, MapPin, Tag, TrendingUp, Search,
  Trash2, Shield, ThumbsUp, Calendar, ArrowUpDown, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api, type FlaskIssue } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IssueMap from "@/components/IssueMap";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

const categories = ["All", "Roads", "Sanitation", "Water", "Electricity", "Others"];
type SortOption = "newest" | "oldest" | "most_voted";

const AdminDashboard = () => {
  const [issues, setIssues] = useState<FlaskIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIssues();
      setIssues(data);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
      toast.error("Failed to load issues. Backend may be waking up — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Stats
  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === "Pending").length,
    inProgress: issues.filter((i) => i.status === "In Progress").length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
  };
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // Status update with optimistic UI
  const handleStatusChange = async (issueId: string | number, newStatus: string) => {
    // Optimistic update
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));
    try {
      await api.updateStatus(issueId, newStatus);
      toast.success(`Issue marked as "${newStatus}"`);
    } catch {
      toast.error("Failed to update status.");
      fetchIssues(); // revert
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIssues((prev) => prev.filter((i) => i.id !== deleteTarget));
    try {
      await api.deleteIssue(deleteTarget);
      toast.success("Issue deleted successfully.");
    } catch {
      toast.error("Failed to delete issue.");
      fetchIssues();
    }
    setDeleteTarget(null);
  };

  // Authority list (hard-coded emails → resolved to UUIDs from profiles)
  const AUTHORITIES = [
    { email: "ajay@gmail.com", name: "Ajay" },
    { email: "swapna@gmail.com", name: "Swapna" },
  ];
  const [authorityMap, setAuthorityMap] = useState<Record<string, { user_id: string; name: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("email", AUTHORITIES.map((a) => a.email));
      const map: Record<string, { user_id: string; name: string }> = {};
      data?.forEach((p) => {
        if (p.email) map[p.email.toLowerCase()] = { user_id: p.user_id, name: p.display_name || p.email };
      });
      setAuthorityMap(map);
    })();
  }, []);

  // Assign authority directly via Supabase
  const handleAssign = async (issueId: string | number, authorityEmail: string) => {
    if (!authorityEmail) return;
    const auth = authorityMap[authorityEmail.toLowerCase()];
    if (!auth) {
      toast.error("Authority not found. Make sure they have registered.");
      return;
    }
    const { error } = await supabase
      .from("issues")
      .update({ assigned_authority_id: auth.user_id })
      .eq("id", String(issueId));
    if (error) {
      console.error("Assign failed:", error);
      toast.error(`Failed to assign: ${error.message}`);
      return;
    }
    toast.success(`Assigned to ${auth.name}!`);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, assigned_authority_id: auth.user_id } : i))
    );
  };

  // Resolve UUID → friendly name for display
  const getAssignedName = (uid?: string | null) => {
    if (!uid) return null;
    const entry = Object.values(authorityMap).find((a) => a.user_id === uid);
    return entry?.name ?? uid;
  };

  // Filtering & sorting
  const filtered = issues
    .filter((i) => {
      if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== "All" && i.status !== filterStatus) return false;
      if (filterCategory !== "All" && i.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "most_voted") return (b.votes || 0) - (a.votes || 0);
      if (sortBy === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(); // newest
    });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin Portal</h1>
              <p className="text-sm text-muted-foreground">Manage issues, assign authorities, and track resolution.</p>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Issues", value: stats.total, icon: Tag, color: "bg-primary/10 text-primary" },
              { label: "Pending", value: stats.pending, icon: Clock, color: "bg-status-pending-bg text-status-pending" },
              { label: "In Progress", value: stats.inProgress, icon: Wrench, color: "bg-status-progress-bg text-status-progress" },
              { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "bg-status-resolved-bg text-status-resolved" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                  <s.icon className={`h-5 w-5 ${s.color.split(" ")[1]}`} />
                </div>
                <p className={`mt-2 text-3xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Progress Bars */}
          <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Resolution Progress</h2>
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
                    <div className={`h-full rounded-full transition-all duration-700 ${bar.color}`} style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          {issues.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
                <MapPin className="h-5 w-5 text-primary" /> Issue Map
              </h2>
              <IssueMap issues={issues.map((i) => ({ id: String(i.id), title: i.title, location: i.location, status: i.status, category: i.category }))} />
            </div>
          )}

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
              {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_voted">Most Voted</option>
            </select>
          </div>

          {/* Issues */}
          {loading ? (
            <div className="mt-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading issues from backend...</p>
              <p className="text-xs">Free-tier backend may take 30–60 seconds to wake up.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">No issues found.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {filtered.map((issue) => {
                const cfg = statusConfig[issue.status] ?? statusConfig.Pending;
                const StatusIcon = cfg.icon;
                const isResolved = issue.status === "Resolved";
                return (
                  <div key={issue.id} className="rounded-xl bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground leading-snug">{issue.title}</h3>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        <StatusIcon className="h-3.5 w-3.5" /> {issue.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{issue.description}</p>

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {issue.category}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {issue.location}</span>
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {issue.votes} votes</span>
                      {issue.created_at && (
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(issue.created_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    {issue.assigned_authority_id && (
                      <p className="mt-2 text-xs text-primary font-medium">
                        Assigned: {getAssignedName(issue.assigned_authority_id)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                      {!isResolved && issue.status !== "In Progress" && (
                        <button onClick={() => handleStatusChange(issue.id, "In Progress")}
                          className="inline-flex items-center gap-1 rounded-xl bg-status-progress-bg px-3 py-1.5 text-xs font-medium text-status-progress transition-all hover:brightness-95">
                          <Wrench className="h-3.5 w-3.5" /> Mark In Progress
                        </button>
                      )}
                      {!isResolved && (
                        <button onClick={() => handleStatusChange(issue.id, "Resolved")}
                          className="inline-flex items-center gap-1 rounded-xl bg-status-resolved-bg px-3 py-1.5 text-xs font-medium text-status-resolved transition-all hover:brightness-95">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                        </button>
                      )}
                      {isResolved && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-status-resolved-bg px-3 py-1.5 text-xs font-semibold text-status-resolved">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolved ✅
                        </span>
                      )}
                      <button onClick={() => setDeleteTarget(issue.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                      <div className="ml-auto">
                        <select
                          value={
                            getAssignedName(issue.assigned_authority_id) &&
                            AUTHORITIES.find(
                              (a) => authorityMap[a.email]?.user_id === issue.assigned_authority_id
                            )?.email || ""
                          }
                          onChange={(e) => handleAssign(issue.id, e.target.value)}
                          className="rounded-xl border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Assign to…</option>
                          {AUTHORITIES.map((a) => (
                            <option key={a.email} value={a.email}>
                              {a.name} ({a.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
