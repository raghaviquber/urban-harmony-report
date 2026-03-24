const API_BASE = "https://urbanharmony-backend.onrender.com";

export interface FlaskIssue {
  id: string | number;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  votes: number;
  image_url?: string | null;
  user_id?: number | string;
  assigned_authority_id?: string | null;
  assigned_department?: string | null;
  created_at?: string;
  updated_at?: string;
}

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

export const api = {
  // Issues
  getIssues: () => apiFetch<FlaskIssue[]>("/issues"),

  createIssue: (data: {
    title: string;
    description: string;
    location: string;
    category: string;
    user_id: number | string;
    image_url?: string;
  }) =>
    apiFetch<{ message: string; id?: string }>("/create-issue", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
