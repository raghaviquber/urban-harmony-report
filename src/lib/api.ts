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

  // ✅ CREATE ISSUE
  createIssue: (data: {
    title: string;
    description: string;
    location: string;
    user_id: number | string;
  }) =>
    apiFetch<{ message: string }>("/create-issue", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ✅ UPVOTE ISSUE
  upvote: (issueId: string | number, userId: number | string) =>
    apiFetch<{ message: string }>("/upvote", {
      method: "POST",
      body: JSON.stringify({
        issue_id: issueId,
        user_id: userId,
      }),
    }),
};
