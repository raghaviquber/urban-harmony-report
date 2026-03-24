import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, Clock, Wrench, CheckCircle2, MapPin, Tag, Search, Send, Upload, Image, Sparkles, AlertTriangle } from "lucide-react";
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

const CitizenDashboard = () => {
const { user } = useAuth();

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

const [activeTab, setActiveTab] = useState<"feed">("feed");

// ✅ FETCH ISSUES
const fetchIssues = useCallback(async () => {
try {
const data = await api.getIssues();
setIssues(data);
} catch (err) {
console.error(err);
toast.error("Failed to load issues");
}
}, []);

useEffect(() => {
fetchIssues();
}, [fetchIssues]);

// 📍 LOCATION AUTO
useEffect(() => {
if (showForm && !form.location) {
setDetectingLocation(true);
navigator.geolocation?.getCurrentPosition(
(pos) => {
setForm((f) => ({
...f,
location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
}));
setDetectingLocation(false);
},
() => {
setForm((f) => ({ ...f, location: "Location unavailable" }));
setDetectingLocation(false);
}
);
}
}, [showForm]);

// 🤖 CATEGORY SUGGESTION
useEffect(() => {
const text = `${form.title} ${form.description}`;
if (text.length > 5) {
setSuggestedCategory(suggestCategory(text));
} else {
setSuggestedCategory(null);
}
}, [form]);

// 🔁 SUBMIT
const doSubmit = async () => {
setSubmitting(true);
try {
await api.createIssue({
title: form.title,
description: form.description,
category: form.category,
location: form.location,
user_id: user?.id ?? 1,
});

```
  toast.success("Issue submitted!");
  setForm({ title: "", description: "", category: "", location: "" });
  setShowForm(false);
  fetchIssues();
} catch {
  toast.error("Submit failed");
}
setSubmitting(false);
```

};

const checkDuplicatesAndSubmit = (e: any) => {
e.preventDefault();
const found = findDuplicates(form.title, form.description, issues as any);
if (found.length) {
setDuplicates(found);
setShowDuplicateAlert(true);
} else {
doSubmit();
}
};

// 👍 UPVOTE
const handleUpvote = async (id: any) => {
await api.upvote(id, user?.id ?? 1);
fetchIssues();
};

// 🔍 FILTER + SORT
const filtered = issues
.filter((i) => {
if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
if (filterStatus !== "All" && i.status !== filterStatus) return false;
if (filterCategory !== "All" && i.category !== filterCategory) return false;
return true;
})
.sort((a, b) => {
if (sortKey === "most-voted") return (b.upvotes || 0) - (a.upvotes || 0);
if (sortKey === "oldest") return (a.created_at || "").localeCompare(b.created_at || "");
return (b.created_at || "").localeCompare(a.created_at || "");
});

return ( <div className="flex min-h-screen flex-col bg-background"> <Navbar />

```
  <main className="flex-1 py-10">
    <div className="container">
      <h1 className="text-3xl font-bold">Citizen Dashboard</h1>

      {/* BUTTON */}
      <button onClick={() => setShowForm(!showForm)} className="mt-4 bg-accent px-4 py-2 rounded-xl">
        Report Issue
      </button>

      {/* FORM */}
      {showForm && (
        <form onSubmit={checkDuplicatesAndSubmit} className="mt-4 space-y-3">
          <input placeholder="Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <textarea placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <button disabled={submitting}>Submit</button>
        </form>
      )}

      {/* MAP */}
      {filtered.length > 0 && (
        <IssueMap issues={filtered.map(i => ({
          id: String(i.id),
          title: i.title,
          location: i.location,
          status: i.status,
          category: i.category
        }))} />
      )}

      {/* LIST */}
      {filtered.length === 0 && <p>No issues found</p>}

      {filtered.map(issue => (
        <div key={issue.id} className="p-4 border mt-3">
          <h3>{issue.title}</h3>
          <p>{issue.description}</p>

          <button onClick={() => handleUpvote(issue.id)}>
            👍 {issue.upvotes || 0}
          </button>
        </div>
      ))}
    </div>
  </main>

  <Footer />
</div>
```

);
};

export default CitizenDashboard;
