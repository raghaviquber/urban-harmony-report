import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Issue {
  id: string | number;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  upvotes: number;
  created_at?: string;
}

const CitizenDashboard = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("newest");

  // 🔥 FETCH ISSUES FROM BACKEND
  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const data = await api.getIssues();
      setIssues(data);
    } catch (err) {
      console.error("Error fetching issues:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANDLE UPVOTE
  const handleUpvote = async (id: string | number) => {
    try {
      await api.upvote(id, 1); // dummy user_id
      fetchIssues(); // refresh after upvote
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  // 🔥 SORTING LOGIC
  const sortedIssues = [...issues].sort((a, b) => {
    if (sortKey === "most-voted") return (b.upvotes || 0) - (a.upvotes || 0);
    if (sortKey === "oldest")
      return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
    return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Citizen Dashboard</h1>

      {/* SORT DROPDOWN */}
      <select
        className="mb-4 p-2 border rounded"
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="most-voted">Most Voted</option>
      </select>

      {/* LOADING */}
      {loading && <p>Loading issues...</p>}

      {/* ISSUE LIST */}
      {!loading && sortedIssues.length === 0 && (
        <p>No issues found. Be the first to report 🚀</p>
      )}

      <div className="space-y-4">
        {sortedIssues.map((issue) => (
          <div
            key={issue.id}
            className="p-4 border rounded shadow-md bg-white"
          >
            <h2 className="text-lg font-semibold">{issue.title}</h2>
            <p className="text-gray-600">{issue.description}</p>
            <p className="text-sm text-gray-500">
              📍 {issue.location} | 🏷 {issue.category}
            </p>

            <div className="flex justify-between items-center mt-3">
              <span className="text-sm font-medium">
                Status: {issue.status}
              </span>

              <button
                onClick={() => handleUpvote(issue.id)}
                className="bg-orange-500 text-white px-3 py-1 rounded"
              >
                👍 ({issue.upvotes || 0})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitizenDashboard;
