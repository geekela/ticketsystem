import type { Analysis, QuestionSource, Source } from "./api";

export type FollowUp = {
  status: "loading" | "ready" | "error";
  questions: string[];
  source?: QuestionSource;
  answers: string[]; // one per question, "" until the customer replies
  error?: string;
  reclassifying?: boolean;
  /** Category before and after the last re-classification with answers. */
  recheck?: { before: string; after: string; source: Source };
};

export type Entry = {
  id: string;
  time: string;
  text: string;
  analysis: Analysis | null; // null while the request is in flight
  followUp?: FollowUp;
};

const STORAGE_KEY = "ticket-analyzer:session";

export function loadSession(): Entry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const entries: Entry[] = raw ? JSON.parse(raw) : [];
    return entries
      .filter((entry) => entry.analysis !== null)
      .map((entry) =>
        // A request cut off by a reload never finishes; offer a retry instead.
        entry.followUp?.status === "loading"
          ? {
              ...entry,
              followUp: {
                ...entry.followUp,
                status: "error",
                error: "The questions didn't finish loading.",
              },
            }
          : entry
      );
  } catch {
    return [];
  }
}

export function saveSession(entries: Entry[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.filter((entry) => entry.analysis !== null))
    );
  } catch {
    // Storage can be unavailable (private mode); the board still works in memory.
  }
}

/** Short status for the board's ASK column. */
export function followUpStatus(followUp: FollowUp | undefined): string {
  if (!followUp || followUp.status === "loading") return "…";
  if (followUp.status === "error") return "Retry";
  if (followUp.recheck) return "Re-checked";
  if (followUp.questions.length === 0) return "None";
  const answered = followUp.answers.filter((answer) => answer.trim()).length;
  return `${answered}/${followUp.questions.length}`;
}
