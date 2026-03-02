import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: "Pending" | "In Progress" | "Resolved";
  votes: number;
  imageUrl?: string;
  createdAt: string;
}

interface IssueContextType {
  issues: Issue[];
  addIssue: (issue: Omit<Issue, "id" | "status" | "votes" | "createdAt">) => void;
  upvote: (id: string) => void;
  setStatus: (id: string, status: Issue["status"]) => void;
}

const sampleIssues: Issue[] = [
  {
    id: "1",
    title: "Pothole on Main Street",
    description: "Large pothole causing traffic issues near the central market area.",
    category: "Roads",
    location: "Main Street, Sector 5",
    status: "Pending",
    votes: 12,
    createdAt: "2026-02-28",
  },
  {
    id: "2",
    title: "Broken Water Pipeline",
    description: "Water pipeline leak leading to water wastage and road flooding.",
    category: "Water",
    location: "Park Avenue, Block B",
    status: "In Progress",
    votes: 8,
    createdAt: "2026-02-25",
  },
  {
    id: "3",
    title: "Street Light Not Working",
    description: "Multiple street lights non-functional creating safety concerns at night.",
    category: "Electricity",
    location: "Ring Road, Near Hospital",
    status: "Resolved",
    votes: 15,
    createdAt: "2026-02-20",
  },
  {
    id: "4",
    title: "Garbage Overflow",
    description: "Municipal garbage bins overflowing for the past week.",
    category: "Sanitation",
    location: "Market Road, Zone 3",
    status: "Pending",
    votes: 20,
    createdAt: "2026-02-27",
  },
];

const IssueContext = createContext<IssueContextType | null>(null);

export const IssueProvider = ({ children }: { children: ReactNode }) => {
  const [issues, setIssues] = useState<Issue[]>(sampleIssues);

  const addIssue = useCallback((issue: Omit<Issue, "id" | "status" | "votes" | "createdAt">) => {
    setIssues((prev) => [
      {
        ...issue,
        id: Date.now().toString(),
        status: "Pending",
        votes: 0,
        createdAt: new Date().toISOString().split("T")[0],
      },
      ...prev,
    ]);
  }, []);

  const upvote = useCallback((id: string) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, votes: i.votes + 1 } : i)));
  }, []);

  const setStatus = useCallback((id: string, status: Issue["status"]) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }, []);

  return (
    <IssueContext.Provider value={{ issues, addIssue, upvote, setStatus }}>
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = () => {
  const ctx = useContext(IssueContext);
  if (!ctx) throw new Error("useIssues must be used within IssueProvider");
  return ctx;
};
