import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag, TrendingUp, Search, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, type FlaskIssue } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

interface AuthorityStats {
  user_id: string;
  email: string;
  name: string;
  resolved: number;
}

const AUTHORITY_EMAILS = ["ajay@gmail.com", "swapna@gmail.com"];

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [allIssues, setAllIssues] = useState<FlaskIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [resolveTarget, setResolveTarget] = useState<string | number | null>(null);
  const [resolveAction, setResolveAction] = useState<"In Progress" | "Resolved">("Resolved");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assigned" | "leaderboard">("assigned");
  const [authorityProfiles, setAuthorityProfiles] = useState<
    Record<string, { email: string; name: string }>
  >({});

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getIssues();
      setAllIssues(data);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
      toast.error("Failed to load issues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // Load authority profiles (user_id → name/email)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("email", AUTHORITY_EMAILS);
      const map: Record<string, { email: string; name: string }> = {};
      data?.forEach((p) => {
        map[p.user_id] = { email: p.email || "", name: p.display_name || p.email || "" };
      });
      setAuthorityProfiles(map);
    })();
  }, []);

  // Filter issues assigned to the current authority by user.id (UUID)
  const myUserId = user?.id ?? "";
  const myEmail = user?.email?.toLowerCase() ?? "";
  const assignedIssues = allIssues.filter(
    (i) => i.assigned_authority_id === myUserId
  );

  const stats = {
    total: assignedIssues.length,
    pending: assignedIssues.filter((i) => i.status === "Pending").length,
    inProgress: assignedIssues.filter((i) => i.status === "In Progress").length,
    resolved: assignedIssues.filter((i) => i.status === "Resolved").length,
  };
  const pct = (n: number) => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

  // Build authority leaderboard from ALL resolved issues, grouped by assigned user_id
  const leaderboard: AuthorityStats[] = (() => {
    const map = new Map<string, number>();
    allIssues.forEach((i) => {
      if (i.assigned_authority_id && i.status === "Resolved") {
        map.set(i.assigned_authority_id, (map.get(i.assigned_authority_id) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([user_id, resolved]) => ({
        user_id,
        email: authorityProfiles[user_id]?.email || "Unknown",
        name: authorityProfiles[user_id]?.name || "Unknown Authority",
        resolved,
      }))
      .sort((a, b) => b.resolved - a.resolved);
  })();

  const confirmAction = async () => {
    if (!resolveTarget) return;
    try {
      await api.updateStatus(resolveTarget, resolveAction);
      toast.success(`Issue marked as ${resolveAction}.`);
    } catch {
      toast.error("Failed to update status.");
    }
    setResolveTarget(null);
    fetchIssues();
  };

  const filtered = assignedIssues.filter(
    (i) => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading your assigned issues…</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container">
          <h1 className="text-3xl font-bold text-foreground">Authority Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome, <span className="font-medium text-foreground">{myEmail}</span> — manage your assigned civic issues.
          </p>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Assigned Issues", value: stats.total, color: "bg-primary/10 text-primary" },
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
              <h2 className="text-lg font-semibold text-foreground">Resolution Analytics</h2>
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

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            <button onClick={() => setActiveTab("assigned")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "assigned" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              📋 My Assigned Issues
            </button>
            <button onClick={() => setActiveTab("leaderboard")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "leaderboard" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              🏆 Authority Leaderboard
            </button>
          </div>

          {activeTab === "assigned" && (
            <>
              {/* Search */}
              <div className="mt-6 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search assigned issues..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20" />
              </div>

              {filtered.length === 0 && (
                <div className="mt-6 rounded-xl bg-card p-10 text-center shadow-card">
                  <p className="text-muted-foreground">No issues assigned to you yet.</p>
                </div>
              )}

              {/* Issue List */}
              <div className="mt-6 space-y-4">
                {filtered.map((issue) => {
                  const cfg = statusConfig[issue.status] ?? statusConfig.Pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={issue.id} className="rounded-xl bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover overflow-hidden">
                      {issue.image_url && (
                        <div className="h-40 w-full overflow-hidden bg-muted">
                          <img src={issue.image_url} alt={issue.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground">{issue.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                          {issue.status === "Pending" && (
                            <button onClick={() => { setResolveAction("In Progress"); setResolveTarget(issue.id); }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-status-progress-bg px-3 py-1.5 text-xs font-medium text-status-progress transition-all hover:opacity-80 hover:-translate-y-0.5">
                              <Wrench className="h-3.5 w-3.5" /> Mark In Progress
                            </button>
                          )}
                          {issue.status !== "Resolved" && (
                            <button onClick={() => { setResolveAction("Resolved"); setResolveTarget(issue.id); }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-status-resolved-bg px-3 py-1.5 text-xs font-medium text-status-resolved transition-all hover:opacity-80 hover:-translate-y-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                            </button>
                          )}
                          {issue.status === "Resolved" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-resolved">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Resolved ✅
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "leaderboard" && (
            <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Authority Leaderboard</h2>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No resolved issues yet. Start resolving to top the board!</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.email}
                      className={`flex items-center gap-4 rounded-xl p-4 transition-all hover:-translate-y-0.5 ${
                        entry.email === myEmail ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/50"
                      }`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                        idx === 0 ? "bg-accent text-accent-foreground" : idx === 1 ? "bg-primary/20 text-primary" : idx === 2 ? "bg-status-progress-bg text-status-progress" : "bg-muted text-muted-foreground"
                      }`}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {entry.name} {entry.email === myEmail && <span className="text-xs text-primary">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{entry.resolved}</p>
                        <p className="text-xs text-muted-foreground">resolved</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <AlertDialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this issue as <strong>{resolveAction}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              Yes, Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AuthorityDashboard;