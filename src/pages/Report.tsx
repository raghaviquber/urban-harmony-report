import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { useIssues } from "@/store/issueStore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = ["Roads", "Sanitation", "Water", "Electricity", "Others"];
const FLASK_API_URL = "https://urbanharmony-backend.onrender.com";

const ReportPage = () => {
  const { addIssue } = useIssues();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
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
      },
      { timeout: 5000 }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) {
      toast.error("Please fill all required fields.");
      return;
    }

    // Submit to local Flask backend
    try {
      const res = await fetch(`${FLASK_API_URL}/create-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          location: form.location,
          category: form.category,
          user_id: 1,
        }),
      });
      const data = await res.json();
      console.log("Flask response:", data);
    } catch (err) {
      console.warn("Flask backend not reachable, saving locally only.", err);
    }

    // Also save to local state
    addIssue({
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      imageUrl: file ? URL.createObjectURL(file) : undefined,
    });
    toast.success("Issue reported successfully! Redirecting to dashboard...");
    setTimeout(() => navigate("/dashboard"), 1200);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-start justify-center py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-xl bg-card p-8 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
            <h1 className="text-2xl font-bold text-foreground">Report an Issue</h1>
            <p className="mt-1 text-sm text-muted-foreground">Help us identify and fix civic problems.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Issue Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/20"
                  placeholder="e.g. Pothole on Main Street"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/20"
                  placeholder="Provide details about the issue..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Upload Image</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground transition-all duration-200 hover:border-primary hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  {file ? file.name : "Choose a file..."}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
                <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {detectingLocation ? "Detecting location..." : form.location}
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
              >
                <Send className="h-4 w-4" /> Submit Report
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReportPage;
