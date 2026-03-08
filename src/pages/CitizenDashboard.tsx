import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag, Search, Send, Upload, Image, User, Building2, Mail, Star, Trophy, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IssueMap from "@/components/IssueMap";
import { suggestCategory, findDuplicates } from "@/lib/categorizer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Issue = Tables<"issues">;
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
  const [issues, setIssues] = useState<Issue[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", location: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [authorities, setAuthorities] = useState<Record<string, { name: string; department: string; email: string }>>({});
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Issue[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [civicScore, setCivicScore] = useState(0);
  const [civicLevel, setCivicLevel] = useState("New Citizen");
  const [leaderboard, setLeaderboard] = useState<{ display_name: string; civic_score: number; civic_level: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard">("feed");

  const fetchIssues = useCallback(async () => {
    const { data } = await supabase.from("issues").select("*").order("created_at", { ascending: false });
    setIssues(data ?? []);
  }, []);

  const fetchVotes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("issue_votes").select("issue_id").eq("user_id", user.id);
    setVotedIds(new Set(data?.map((v) => v.issue_id) ?? []));
  }, [user]);

  const fetchAuthorities = useCallback(async () => {
    const { data: authorityRoles } = await supabase.from("user_roles").select("user_id, department").eq("role", "authority");
    if (!authorityRoles?.length) return;
    const userIds = authorityRoles.map((r) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
    const map: Record<string, { name: string; department: string; email: string }> = {};
    authorityRoles.forEach((r) => {
      const prof = profiles?.find((p) => p.user_id === r.user_id);
      map[r.user_id] = { name: prof?.display_name ?? "Authority", department: r.department ?? "General", email: prof?.email ?? "" };
    });
    setAuthorities(map);
  }, []);

  const fetchCivicScore = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("civic_score, civic_level").eq("user_id", user.id).limit(1).single();
    if (data) {
      setCivicScore((data as any).civic_score ?? 0);
      setCivicLevel((data as any).civic_level ?? "New Citizen");
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("display_name, civic_score, civic_level").order("civic_score", { ascending: false }).limit(10);
    setLeaderboard((data as any) ?? []);
  }, []);

  useEffect(() => {
    fetchIssues();
    fetchVotes();
    fetchAuthorities();
    fetchCivicScore();
    fetchLeaderboard();
  }, [fetchIssues, fetchVotes, fetchAuthorities, fetchCivicScore, fetchLeaderboard]);

  useEffect(() => {
    if (showForm && !form.location) {
      setDetectingLocation(true);
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          setForm((f) => ({ ...f, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }));
          setDetectingLocation(false);
        },
        () => {
          setForm((f) => ({ ...f, location: "Location unavailable" }));
          setDetectingLocation(false);
        },
        { timeout: 5000 }
      );
    }
  }, [showForm, form.location]);

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
    if (!form.title || !form.description || !form.category || !user) {
      toast.error("Please fill all required fields.");
      return;
    }
    const found = findDuplicates(form.title, form.description, issues);
    if (found.length > 0) {
      setDuplicates(found);
      setShowDuplicateAlert(true);
    } else {
      doSubmit();
    }
  };

  const doSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("issue-images").upload(path, file);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("issue-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }
    const { error } = await supabase.from("issues").insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      image_url: imageUrl,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit issue.");
    } else {
      toast.success("🎉 Issue reported! +10 Civic Points");
      setForm({ title: "", description: "", category: "", location: "" });
      setFile(null);
      setShowForm(false);
      fetchIssues();
      fetchCivicScore();
    }
  };

  const handleUpvote = async (issueId: string) => {
    if (!user) return;
    if (votedIds.has(issueId)) {
      await supabase.from("issue_votes").delete().eq("issue_id", issueId).eq("user_id", user.id);
      await supabase.rpc("decrement_votes", { p_issue_id: issueId });
      setVotedIds((prev) => { const n = new Set(prev); n.delete(issueId); return n; });
      toast.success("Vote removed.");
    } else {
      await supabase.from("issue_votes").insert({ issue_id: issueId, user_id: user.id });
      await supabase.rpc("increment_votes", { p_issue_id: issueId });
      setVotedIds((prev) => new Set(prev).add(issueId));
      toast.success("⬆ Upvoted! +2 Civic Points");
      fetchCivicScore();
    }
    fetchIssues();
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
      if (sortKey === "oldest") return a.created_at.localeCompare(b.created_at);
      return b.created_at.localeCompare(a.created_at);
    });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container">
          {/* Header + Civic Score */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Citizen Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Report issues and track community progress.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Civic Score Card */}
              <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-3 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                  <Star className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Civic Score</p>
                  <p className="text-lg font-bold text-foreground">{civicScore}</p>
                </div>
                <span className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${levelBadge[civicLevel] ?? levelBadge["New Citizen"]}`}>
                  {civicLevel}
                </span>
              </div>
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
                  {/* AI Suggestion */}
                  {suggestedCategory && suggestedCategory !== form.category && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, category: suggestedCategory })}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
                    >
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
                  <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" /> {detectingLocation ? "Detecting..." : form.location || "Click to detect"}
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

          {/* Tabs: Feed / Leaderboard */}
          <div className="mt-8 flex gap-2">
            <button onClick={() => setActiveTab("feed")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "feed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              🏠 Issue Feed
            </button>
            <button onClick={() => setActiveTab("leaderboard")}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${activeTab === "leaderboard" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
              <Trophy className="mr-1.5 inline h-4 w-4" /> Leaderboard
            </button>
          </div>

          {activeTab === "leaderboard" && (
            <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-6">🏆 Top Civic Contributors</h2>
              <div className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl p-4 transition-all ${i < 3 ? "bg-accent/10" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-4">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0 ? "bg-accent text-accent-foreground" :
                        i === 1 ? "bg-muted-foreground/20 text-foreground" :
                        i === 2 ? "bg-status-pending-bg text-status-pending" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{entry.display_name}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${levelBadge[entry.civic_level] ?? levelBadge["New Citizen"]}`}>
                          {entry.civic_level}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-accent" />
                      <span className="text-lg font-bold text-foreground">{entry.civic_score}</span>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-8">No contributors yet. Be the first!</p>}
              </div>
            </div>
          )}

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
                  <IssueMap issues={filtered.map((i) => ({ id: i.id, title: i.title, location: i.location, status: i.status, category: i.category }))} />
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
                  const authority = issue.assigned_authority_id ? authorities[issue.assigned_authority_id] : null;
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
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(issue.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            <StatusIcon className="h-3.5 w-3.5" /> {issue.status}
                          </span>
                        </div>

                        {authority && (
                          <div className="mt-4 rounded-lg bg-muted/50 p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Assigned to:</p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-foreground">
                              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {authority.name}</span>
                              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {authority.department}</span>
                              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {authority.email}</span>
                            </div>
                          </div>
                        )}

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
