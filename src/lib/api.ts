import { supabase } from "@/integrations/supabase/client";

const API_BASE = "https://urbanharmony-backend.onrender.com";
export interface FlaskIssue {
  id: string | number;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  upvotes: number;
  votes: number;
  image_url?: string;
  assigned_authority_id?: string | null;
  created_at?: string;
}

// -----------------------------
// GENERIC FETCH FUNCTION
// -----------------------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

// -----------------------------
// API METHODS
// -----------------------------
export const api = {
  // ✅ GET ALL ISSUES
  getIssues: async () => {
    const data = await apiFetch<any[]>("/issues");

    // map backend → frontend
    return data.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      location: issue.location,
      status: issue.status,
      upvotes: issue.upvotes || issue.votes || 0,
      votes: issue.upvotes || issue.votes || 0,
      image_url: issue.image_url || null,
      assigned_authority_id: issue.assigned_authority_id || null,
      created_at: issue.created_at,
    }));
  },

  createIssue: async (data: {
    title: string;
    description: string;
    location: string;
    category?: string;
    user_id: number | string;
    image?: File | null;
  }) => {
    const payload: Record<string, string> = {
      title: data.title,
      description: data.description,
      location: data.location,
      user_id: String(data.user_id),
    };

    if (data.category) payload.category = data.category;
    if (data.image) payload.image = await fileToDataUrl(data.image);

    const { data: response, error } = await supabase.functions.invoke("create-issue-proxy", {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || "Failed to submit issue");
    }

    return response as { message: string };
  },

  upvote: (issueId: string | number, userId: number | string) =>
    apiFetch<{ message: string }>("/upvote", {
      method: "POST",
      body: JSON.stringify({ issue_id: issueId, user_id: userId }),
    }),

  updateStatus: (issueId: string | number, status: string) =>
    apiFetch<{ message: string }>("/update-status", {
      method: "POST",
      body: JSON.stringify({ issue_id: issueId, status }),
    }),

  deleteIssue: (issueId: string | number) =>
    apiFetch<{ message: string }>("/delete-issue", {
      method: "POST",
      body: JSON.stringify({ issue_id: issueId }),
    }),

  assignAuthority: (issueId: string | number, authorityId: string, department?: string) =>
    apiFetch<{ message: string }>("/assign-authority", {
      method: "POST",
      body: JSON.stringify({ issue_id: issueId, authority_id: authorityId, department }),
    }),
};
