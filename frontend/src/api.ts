// Calls to the FastAPI backend, proxied under /api by Vite (see vite.config.ts).

export type Source = "anthropic" | "mistral" | "keywords";

export type Analysis = {
  original: string;
  character_count: number;
  category: string;
  source: Source;
};

export type QuestionSource = "anthropic" | "preset";

export type Questions = {
  questions: string[];
  source: QuestionSource;
};

export type QA = { question: string; answer: string };

/** Thrown for any failed request, with a message the agent can act on. */
export class ApiError extends Error {}

function describeFailure(status: number): string {
  if (status === 422) {
    return "The request was rejected as empty or invalid. Check the text and try again.";
  }
  return `The analyzer returned an error (HTTP ${status}). Try again; if it keeps failing, check the backend log.`;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the analyzer. Check that the backend is running, then try again.");
  }
  if (!response.ok) throw new ApiError(describeFailure(response.status));
  return response.json();
}

export function analyze(text: string, followUps: QA[] = []): Promise<Analysis> {
  return post("/analyze", { text, follow_ups: followUps });
}

export function fetchQuestions(text: string, category: string): Promise<Questions> {
  return post("/questions", { text, category });
}

export async function checkHealth(): Promise<boolean> {
  try {
    return (await fetch("/api/health")).ok;
  } catch {
    return false;
  }
}
