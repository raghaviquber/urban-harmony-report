import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag, Search, Send, Upload, Image, User, Building2, Mail, Star, Trophy, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, type FlaskIssue } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IssueMap from "@/components/IssueMap";
import { suggestCategory, findDuplicates } from "@/lib/categorizer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SortKey = "newest" | "oldest" | "most-voted";
const categories = ["All", "Roads", "Sanitation", "Water", "Electricity", "Others"];
const statusOptions = ["All", "Pending", "In Progress", "Resolved"];

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  Pending: { bg: "bg-status-pending-bg", text: "text-status-pending", icon: Clock },
  "In Progress": { bg: "bg-status-progress-bg", text: "text-status-progress", icon: Wrench },
  Resolved: { bg: "bg-status-resolved-bg", text: "text-status-resolved", icon: CheckCircle2 },
};

const levelBadge: Record<string, string> = {
  "Civic Champion": "bg-accent text-accent-foreground",
  "Responsible Citizen": "bg-primary text-primary-foreground",
  "Active Contributor": "bg-status-progress-bg text-status-progress",
  "Engaged Citizen": "bg-status-pending-bg text-status-pending",
  "New Citizen": "bg-muted text-muted-foreground",
};

const CitizenDashboard = () => {
  const { user, profile } = useAuth();
  const [issues, setIssues] = useState<FlaskIssue[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", location: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<FlaskIssue[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard">("feed");

  const fetchIssues = useCallback(async () => {
    try {
      const data = await api.getIssues();
      setIssues(data);
    } catch (err) {
      console.error("Failed to fetch issues from Flask API:", err);
      toast.error("Failed to load issues from server.");
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return false;
    }

    setDetectingLocation(true);

    const detected = await new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((f) => ({
            ...f,
            location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          }));
          toast.success("Location detected!");
          resolve(true);
        },
        () => {
          toast.error("Could not detect location. Please allow location access or enter it manually.");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    setDetectingLocation(false);
    return detected;
  }, []);

  useEffect(() => {
    if (showForm && !form.location) {
      void detectLocation();
    }
  }, [showForm, form.location, detectLocation]);

  // AI category suggestion
  useEffect(() => {
    const text = `${form.title} ${form.description}`;
    if (text.trim().length > 5) {
      const suggestion = suggestCategory(text);
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  }, [form.title, form.description]);

  const checkDuplicatesAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) {
      toast.error("Please fill all required fields.");
      return;
    }
    const found = findDuplicates(form.title, form.description, issues as any);
    if (found.length > 0) {
      setDuplicates(found as FlaskIssue[]);
      setShowDuplicateAlert(true);
    } else {
      doSubmit();
    }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      let location = form.location.trim();

      if (!location) {
        const detected = await detectLocation();
        if (!detected) {
          setSubmitting(false);
          return;
        }
        location = form.location.trim();
      }

      await api.createIssue({
        title: form.title,
        description: form.description,
        category: form.category,
        location,
        user_id: user?.id ?? 1,
        image: file,
      });
      toast.success("🎉 Issue reported successfully!");
      setForm({ title: "", description: "", category: "", location: "" });
      setFile(null);
      setShowForm(false);
      fetchIssues();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit issue.");
    }
    setSubmitting(false);
  };

  const handleUpvote = async (issueId: string | number) => {
    try {
      await api.upvote(issueId, user?.id ?? 1);
      if (votedIds.has(issueId)) {
        setVotedIds((prev) => { const n = new Set(prev); n.delete(issueId); return n; });
        toast.success("Vote removed.");
      } else {
        setVotedIds((prev) => new Set(prev).add(issueId));
        toast.success("⬆ Upvoted!");
      }
      fetchIssues();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upvote.");
    }
  };

  const filtered = issues
    .filter((i) => {
      if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== "All" && i.status !== filterStatus) return false;
      if (filterCategory !== "All" && i.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "most-voted") return b.votes - a.votes;
      if (sortKey === "oldest") return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

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
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Citizen Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Report issues and track community progress.</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground shadow transition-all duration-200 hover:brightness-110"
              >
                <Send className="h-4 w-4" /> {showForm ? "Close Form" : "Report Issue"}
              </button>
            </div>
          </div>

          {/* Report Form */}
          {showForm && (
            <div className="mt-6 rounded-xl bg-card p-8 shadow-card">
              <h2 className="text-xl font-semibold text-foreground">Report a New Issue</h2>
              <form onSubmit={checkDuplicatesAndSubmit} className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="e.g. Pothole on Main Street" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary">
                    <option value="">Select category</option>
                    {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {suggestedCategory && suggestedCategory !== form.category && (
                    <button type="button" onClick={() => setForm({ ...form, category: suggestedCategory })}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20">
                      <Sparkles className="h-3 w-3" /> AI suggests: <span className="font-bold">{suggestedCategory}</span> — click to apply
                    </button>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Description *</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Describe the issue..." />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Upload Image</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground transition-all hover:border-primary">
                    <Upload className="h-4 w-4" /> {file ? file.name : "Choose a file..."}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="e.g. 17.4065, 78.4772 or Main Street"
                        className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void detectLocation()}
                      disabled={detectingLocation}
                      className="rounded-xl border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {detectingLocation ? "..." : "Detect"}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground shadow transition-all hover:brightness-110 disabled:opacity-50">
                    <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            <button onClick={() => setActiveTab("feed")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "feed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              🏠 Issue Feed
            </button>
            <button onClick={() => setActiveTab("leaderboard")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "leaderboard" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              🏆 Authority Leaderboard
            </button>
          </div>

          {activeTab === "feed" && (
            <>
              {/* Filters */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Search issues..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
                  {statusOptions.map((s) => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
                  {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
                </select>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most-voted">Most Voted</option>
                </select>
              </div>

              {/* Map */}
              {filtered.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 text-xl font-semibold text-foreground">📍 Issue Locations</h2>
                  <IssueMap issues={filtered.map((i) => ({ id: String(i.id), title: i.title, location: i.location, status: i.status, category: i.category }))} />
                </div>
              )}

              {/* Issue Feed */}
              <div className="mt-6 space-y-4">
                {filtered.length === 0 && (
                  <div className="rounded-xl bg-card p-10 text-center shadow-card">
                    <Image className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-muted-foreground">No issues found. Be the first to report!</p>
                  </div>
                )}
                {filtered.map((issue) => {
                  const cfg = statusConfig[issue.status] ?? statusConfig.Pending;
                  const StatusIcon = cfg.icon;
                  const voted = votedIds.has(issue.id);
                  return (
                    <div key={issue.id} className="rounded-xl bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover overflow-hidden">
                      {issue.image_url && (
                        <div className="h-48 w-full overflow-hidden bg-muted">
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
                              {issue.created_at && (
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(issue.created_at).toLocaleDateString()}</span>
                              )}
                            </div>
                            {/* Assigned authority */}
                            <div className="mt-2 text-xs font-medium">
                              {issue.assigned_authority_id ? (
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Mail className="h-3 w-3" /> Assigned to: {issue.assigned_authority_id}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Not assigned yet</span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            <StatusIcon className="h-3.5 w-3.5" /> {issue.status}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 border-t pt-4">
                          <button onClick={() => handleUpvote(issue.id)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                              voted ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary hover:text-primary"
                            }`}>
                            <ThumbsUp className={`h-3.5 w-3.5 transition-transform ${voted ? "scale-110" : ""}`} /> {voted ? "Voted" : "Upvote"} ({issue.votes})
                          </button>
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
                <span className="text-sm text-muted-foreground ml-auto">Ranked by resolved issues</span>
              </div>
              {(() => {
                const map = new Map<string, number>();
                issues.forEach((i) => {
                  if (i.assigned_authority_id && i.status === "Resolved") {
                    const email = i.assigned_authority_id.toLowerCase();
                    map.set(email, (map.get(email) || 0) + 1);
                  }
                });
                const board = Array.from(map.entries())
                  .map(([email, resolved]) => ({ email, resolved }))
                  .sort((a, b) => b.resolved - a.resolved);

                if (board.length === 0) {
                  return <p className="text-center text-muted-foreground py-6">No authorities have resolved issues yet.</p>;
                }
                return (
                  <div className="space-y-3">
                    {board.map((entry, idx) => (
                      <div key={entry.email}
                        className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-all hover:-translate-y-0.5">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                          idx === 0 ? "bg-accent text-accent-foreground" : idx === 1 ? "bg-primary/20 text-primary" : idx === 2 ? "bg-status-progress-bg text-status-progress" : "bg-muted text-muted-foreground"
                        }`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{entry.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{entry.resolved}</p>
                          <p className="text-xs text-muted-foreground">resolved</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </main>
      <Footer />

      {/* Duplicate Detection Dialog */}
      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent className="rounded-xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" /> Similar Issues Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              We found similar issues already reported. Would you like to upvote an existing one instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {duplicates.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.votes} votes · {d.status}</p>
                </div>
                <button onClick={() => { handleUpvote(d.id); setShowDuplicateAlert(false); }}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                  Upvote
                </button>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDuplicateAlert(false); doSubmit(); }} className="rounded-xl">
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CitizenDashboard;
