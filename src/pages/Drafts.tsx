import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, Send, MapPin, Clock, Camera, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface DraftReport {
  id: string;
  imageDataUrl: string;
  detectionDescription: string;
  confidence: number;
  location: string;
  timestamp: string;
}

const DraftsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { title: string; description: string; category: string }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("pothole_drafts") || "[]");
    setDrafts(saved);
    // Initialize form data for each draft
    const fd: typeof formData = {};
    saved.forEach((d: DraftReport) => {
      fd[d.id] = { title: "", description: d.detectionDescription, category: "Roads" };
    });
    setFormData(fd);
  }, []);

  const deleteDraft = (id: string) => {
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("pothole_drafts", JSON.stringify(updated));
    toast.success("Draft deleted.");
  };

  const submitDraft = async (draft: DraftReport) => {
    const fd = formData[draft.id];
    if (!fd?.title || !fd?.description || !fd?.category) {
      toast.error("Please fill in title, description, and category.");
      return;
    }

    setSubmittingId(draft.id);

    try {
      // Convert data URL to File
      let file: File | null = null;
      try {
        const parts = draft.imageDataUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const bstr = atob(parts[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        file = new File([u8arr], `pothole_${draft.id}.jpg`, { type: mime });
      } catch (imgErr) {
        console.warn("Could not convert image, submitting without it", imgErr);
      }

      await api.createIssue({
        title: fd.title,
        description: fd.description,
        category: fd.category,
        location: draft.location || "Location not available",
        user_id: user?.id ?? "1",
        image: file,
      });

      // Remove from drafts
      const updated = drafts.filter((d) => d.id !== draft.id);
      setDrafts(updated);
      localStorage.setItem("pothole_drafts", JSON.stringify(updated));

      toast.success("🎉 Report submitted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit report.");
    }

    setSubmittingId(null);
  };

  const updateForm = (id: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/citizen")}
              className="rounded-xl border p-2 text-muted-foreground transition-colors hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" /> Draft Reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Complete and submit reports from auto-captured pothole photos.
              </p>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="rounded-xl bg-card p-12 text-center shadow-card">
              <Camera className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No drafts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the AI Pothole Scanner to auto-capture photos, and they'll appear here as drafts.
              </p>
              <button onClick={() => navigate("/citizen")}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => {
                const isExpanded = expandedId === draft.id;
                const fd = formData[draft.id] || { title: "", description: "", category: "Roads" };

                return (
                  <div key={draft.id} className="rounded-xl bg-card shadow-card overflow-hidden transition-all">
                    {/* Preview row */}
                    <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30"
                      onClick={() => setExpandedId(isExpanded ? null : draft.id)}>
                      <img src={draft.imageDataUrl} alt="Captured pothole"
                        className="h-16 w-16 rounded-lg object-cover shrink-0 border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {fd.title || "Untitled Draft"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{draft.detectionDescription}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {draft.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(draft.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                          {draft.confidence}%
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                          className="rounded-lg p-1.5 text-destructive/60 transition-colors hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded form */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-5 pt-4 space-y-4">
                        <div className="flex gap-4">
                          <img src={draft.imageDataUrl} alt="Pothole"
                            className="h-40 w-40 rounded-xl object-cover border shrink-0" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-foreground">Title *</label>
                              <input type="text" value={fd.title}
                                onChange={(e) => updateForm(draft.id, "title", e.target.value)}
                                placeholder="e.g. Pothole on Main Street"
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-foreground">Category *</label>
                              <select value={fd.category}
                                onChange={(e) => updateForm(draft.id, "category", e.target.value)}
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                                <option value="Roads">Roads</option>
                                <option value="Sanitation">Sanitation</option>
                                <option value="Water">Water</option>
                                <option value="Electricity">Electricity</option>
                                <option value="Others">Others</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">Description *</label>
                          <textarea rows={2} value={fd.description}
                            onChange={(e) => updateForm(draft.id, "description", e.target.value)}
                            placeholder="Describe the issue..."
                            className="w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                        </div>
                        <button onClick={() => submitDraft(draft)}
                          disabled={submittingId === draft.id}
                          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground shadow transition-all hover:brightness-110 disabled:opacity-50">
                          <Send className="h-4 w-4" />
                          {submittingId === draft.id ? "Submitting..." : "Submit Report"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DraftsPage;
