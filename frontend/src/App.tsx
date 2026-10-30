
import { useState } from "react";

type Analysis = {
  original: string;
  character_count: number;
  category: string;
};

function App() {
  const [ticket, setTicket] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Proxied to the backend by Vite (see vite.config.ts).
      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: ticket }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data: Analysis = await response.json();
      setResult(data);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "50px auto" }}>
      <h1>Support Ticket Analyzer</h1>

      <p>Enter a customer support ticket:</p>

      <textarea
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
        rows={5}
        style={{ width: "100%" }}
      />

      <button
        onClick={handleAnalyze}
        disabled={!ticket.trim() || loading}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {error && <p role="alert">{error}</p>}

      {result && (
        <section>
          <h2>Analysis Result</h2>
          <p>Category: {result.category}</p>
          <p>Characters: {result.character_count}</p>
          <p>Original: {result.original}</p>
        </section>
      )}
    </main>
  );
}

export default App;
