// AI-style keyword-based issue category suggestion

const categoryKeywords: Record<string, string[]> = {
  Roads: [
    "pothole", "road", "crack", "pavement", "highway", "footpath", "sidewalk",
    "bridge", "asphalt", "traffic", "signal", "broken road", "bumpy", "street",
    "divider", "speed breaker", "flyover",
  ],
  Sanitation: [
    "garbage", "trash", "waste", "dump", "litter", "rubbish", "dirty",
    "sewage", "drain", "clogged", "smell", "stink", "sanitation", "dustbin",
    "overflow", "cleaning", "sweeping", "debris",
  ],
  Water: [
    "water", "leak", "pipe", "burst", "supply", "tap", "flooding", "flood",
    "drainage", "waterlog", "contaminated", "drinking", "borewell", "tank",
    "pipeline", "plumbing",
  ],
  Electricity: [
    "electricity", "power", "light", "lamp", "streetlight", "wire", "cable",
    "outage", "blackout", "transformer", "pole", "electric", "voltage",
    "short circuit", "meter", "bulb",
  ],
};

export const suggestCategory = (text: string): string | null => {
  const lower = text.toLowerCase();
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : null;
};

export const findDuplicates = (
  newTitle: string,
  newDescription: string,
  existingIssues: { id: string; title: string; description: string; location: string; status: string; votes: number }[]
): typeof existingIssues => {
  const words = `${newTitle} ${newDescription}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return [];

  return existingIssues
    .filter((issue) => {
      if (issue.status === "Resolved") return false;
      const issueText = `${issue.title} ${issue.description}`.toLowerCase();
      const matchCount = words.filter((w) => issueText.includes(w)).length;
      return matchCount / words.length > 0.3;
    })
    .slice(0, 3);
};
