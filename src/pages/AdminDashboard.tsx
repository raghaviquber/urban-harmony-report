import { useState, useEffect, useCallback } from "react";
import { Clock, Wrench, CheckCircle2, MapPin, Tag, TrendingUp, Search, Trash2, UserPlus, Shield, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IssueMap from "@/components/IssueMap";

type Issue = Tables<"issues">;

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

const departments = ["Roads Department", "Sanitation Department", "Water Department", "Electricity Department", "General"];

const AdminDashboard = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [authorities, setAuthorities] = useState<{ user_id: string; name: string; department: string; email: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [tab, setTab] = useState<"issues" | "authorities">("issues");

  // Authority form
  const [authEmail, setAuthEmail] = useState("");
  const [authDept, setAuthDept] = useState(departments[0]);

  const fetchIssues = useCallback(async () => {
    const { data } = await supabase.from("issues").select("*").order("created_at", { ascending: false });
    setIssues(data ?? []);
  }, []);

  const fetchAuthorities = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, department").eq("role", "authority");
    if (!roles?.length) { setAuthorities([]); return; }
    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", ids);
    setAuthorities(roles.map((r) => {
      const p = profiles?.find((pr) => pr.user_id === r.user_id);
      return { user_id: r.user_id, name: p?.display_name ?? "Unknown", department: r.department ?? "General", email: p?.email ?? "" };
    }));
  }, []);

  useEffect(() => { fetchIssues(); fetchAuthorities(); }, [fetchIssues, fetchAuthorities]);

  const stats = {
    total: issues.length,
    pending: issues.filter((i) => i.status === "Pending").length,
    inProgress: issues.filter((i) => i.status === "In Progress").length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
  };
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  const handleAssignAuthority = async (issueId: string, authorityId: string) => {
    const auth = authorities.find((a) => a.user_id === authorityId);
    const { error } = await supabase.from("issues").update({
      assigned_authority_id: authorityId,
      assigned_department: auth?.department ?? null,
    }).eq("id", issueId);
    if (error) toast.error("Failed to assign."); else { toast.success("Authority assigned!"); fetchIssues(); }
  };

  const handleStatusChange = async (issueId: string, status: string) => {
    const { error } = await supabase.from("issues").update({ status }).eq("id", issueId);
    if (error) toast.error("Failed to update."); else { toast.success("Status updated!"); fetchIssues(); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("issues").delete().eq("id", deleteTarget);
    if (error) toast.error("Failed to delete."); else { toast.success("Issue deleted!"); fetchIssues(); }
    setDeleteTarget(null);
  };

  const handleAddAuthority = async () => {
    if (!authEmail) { toast.error("Enter an email."); return; }
    // Find user by email in profiles
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", authEmail).limit(1).single();
    if (!profile) { toast.error("No user found with that email. They must register first."); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "authority" as const, department: authDept });
    if (error) {
      if (error.code === "23505") toast.error("User already has authority role.");
      else toast.error("Failed to add authority.");
    } else {
      toast.success("Authority role added!");
      setAuthEmail("");
      fetchAuthorities();
    }
  };

  const filtered = issues.filter((i) => {
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== "All" && i.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage the entire civic issue system.</p>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Complaints", value: stats.total, color: "bg-primary/10 text-primary" },
              { label: "Pending", value: stats.pending, color: "bg-status-pending-bg text-status-pending" },
              { label: "In Progress", value: stats.inProgress, color: "bg-status-progress-bg text-status-progress" },
              { label: "Resolved", value: stats.resolved, color: "bg-status-resolved-bg text-status-resolved" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className={`mt-2 inline-flex items-center rounded-xl px-3 py-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Analytics */}
          <div className="mt-8 rounded-xl bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">System Analytics</h2>
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
                    <div className={`h-full rounded-full transition-all duration-500 ${bar.color}`} style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          {issues.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">📍 Issue Map</h2>
              <IssueMap issues={issues.map((i) => ({ id: i.id, title: i.title, location: i.location, status: i.status, category: i.category }))} />
            </div>
          )}

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            <button onClick={() => setTab("issues")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${tab === "issues" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              <Shield className="mr-1.5 inline h-4 w-4" /> Issue Management
            </button>
            <button onClick={() => setTab("authorities")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${tab === "authorities" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              <UserPlus className="mr-1.5 inline h-4 w-4" /> Authority Management
            </button>
          </div>

          {tab === "issues" && (
            <>
              {/* Filters */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Search issues..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Issue List */}
              <div className="mt-6 space-y-4">
                {filtered.map((issue) => {
                  const cfg = statusConfig[issue.status] ?? statusConfig.Pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={issue.id} className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">{issue.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {issue.category}</span>
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {issue.location}</span>
                            <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {issue.votes} votes</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {issue.status}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                        {/* Assign authority */}
                        <select
                          value={issue.assigned_authority_id ?? ""}
                          onChange={(e) => handleAssignAuthority(issue.id, e.target.value)}
                          className="rounded-xl border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Assign Authority...</option>
                          {authorities.map((a) => (
                            <option key={a.user_id} value={a.user_id}>{a.name} ({a.department})</option>
                          ))}
                        </select>
                        {/* Status change */}
                        <select
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          className="rounded-xl border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <button onClick={() => setDeleteTarget(issue.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "authorities" && (
            <div className="mt-6 space-y-6">
              {/* Add authority */}
              <div className="rounded-xl bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold text-foreground mb-4">Add Authority Account</h2>
                <p className="text-sm text-muted-foreground mb-4">The user must be registered first. Enter their email to grant authority role.</p>
                <div className="flex flex-wrap gap-3">
                  <input type="email" placeholder="authority@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                  <select value={authDept} onChange={(e) => setAuthDept(e.target.value)}
                    className="rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={handleAddAuthority}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110">
                    <UserPlus className="h-4 w-4" /> Add Authority
                  </button>
                </div>
              </div>

              {/* Authority List */}
              <div className="rounded-xl bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold text-foreground mb-4">Current Authorities</h2>
                {authorities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No authorities assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {authorities.map((a) => (
                      <div key={a.user_id} className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                        <div>
                          <p className="font-medium text-foreground">{a.name}</p>
                          <p className="text-sm text-muted-foreground">{a.department} &middot; {a.email}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Authority</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this issue? This action cannot be undone.</AlertDialogDescription>
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
