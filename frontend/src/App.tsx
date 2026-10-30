import { useCallback, useEffect, useRef, useState } from "react";

type Source = "anthropic" | "mistral" | "keywords";

type Analysis = {
  original: string;
  character_count: number;
  category: string;
  source: Source;
};

type Entry = {
  id: string;
  time: string;
  text: string;
  analysis: Analysis | null; // null while the request is in flight
};

type Outcome =
  | { tone: "idle" }
  | { tone: "result"; analysis: Analysis }
  | { tone: "error"; message: string };

type Health = "checking" | "online" | "offline";

const CATEGORIES = ["Account", "Billing", "Technical", "Other"] as const;

const CATEGORY_CODES: Record<string, string> = {
  Account: "ACC",
  Billing: "BIL",
  Technical: "TEC",
  Other: "OTH",
};

const SOURCE_LABELS: Record<Source, string> = {
  anthropic: "Claude (Anthropic)",
  mistral: "Mistral AI",
  keywords: "keyword matching",
};

const SOURCE_CODES: Record<Source, string> = {
  anthropic: "CLAUDE",
  mistral: "MISTRAL",
  keywords: "KEYWORDS",
};

const STORAGE_KEY = "ticket-analyzer:session";
const HEALTH_INTERVAL_MS = 15_000;

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const SUBMIT_KEYS = IS_MAC ? "⌘ ↵" : "Ctrl ↵";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function codeFor(category: string): string {
  return CATEGORY_CODES[category] ?? category.slice(0, 3).toUpperCase();
}

function loadSession(): Entry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const entries: Entry[] = raw ? JSON.parse(raw) : [];
    return entries.filter((entry) => entry.analysis !== null);
  } catch {
    return [];
  }
}

function saveSession(entries: Entry[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.filter((entry) => entry.analysis !== null))
    );
  } catch {
    // Storage can be unavailable (private mode); the board still works in memory.
  }
}

function describeError(err: unknown, status?: number): string {
  if (status === 422) {
    return "The ticket was rejected as empty or invalid. Paste the ticket text and try again.";
  }
  if (status !== undefined) {
    return `The analyzer returned an error (HTTP ${status}). Try again; if it keeps failing, check the backend log.`;
  }
  if (err instanceof TypeError) {
    return `Couldn't reach the analyzer. Check that the backend is running, then press ${SUBMIT_KEYS} to retry.`;
  }
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

function Flaps({
  code,
  source,
  size = "md",
  fresh = false,
  pending = false,
  onShell = false,
}: {
  code: string;
  source?: Source;
  size?: "sm" | "md" | "lg";
  fresh?: boolean;
  pending?: boolean;
  onShell?: boolean;
}) {
  return (
    <span
      className={onShell ? "flaps on-shell" : "flaps"}
      data-size={size}
      data-source={source}
      data-fresh={fresh || undefined}
      data-pending={pending || undefined}
      aria-hidden="true"
    >
      {code.split("").map((letter, index) => (
        <span className="flap" key={index}>
          {letter}
        </span>
      ))}
    </span>
  );
}

function useBackendHealth(): Health {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/health");
        if (!cancelled) setHealth(response.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setHealth("offline");
      }
    }

    check();
    const timer = window.setInterval(check, HEALTH_INTERVAL_MS);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);

  return health;
}

const HEALTH_LABELS: Record<Health, string> = {
  checking: "Checking backend…",
  online: "Backend online",
  offline: "Backend unreachable",
};

function useClock(): string {
  const [now, setNow] = useState(() => timeFormat.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(timeFormat.format(new Date())),
      10_000
    );
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function App() {
  const [ticket, setTicket] = useState("");
  const [entries, setEntries] = useState<Entry[]>(loadSession);
  const [outcome, setOutcome] = useState<Outcome>({ tone: "idle" });
  const [filter, setFilter] = useState<string>("All");
  const [freshId, setFreshId] = useState<string | null>(null);
  const ticketRef = useRef<HTMLTextAreaElement>(null);
  const health = useBackendHealth();
  const now = useClock();

  const loading = entries.some((entry) => entry.analysis === null);
  const canSubmit = ticket.trim().length > 0 && !loading;

  useEffect(() => saveSession(entries), [entries]);

  const handleClassify = useCallback(async () => {
    const text = ticket;
    if (!text.trim() || loading) return;

    const id = crypto.randomUUID();
    setEntries((current) => [
      { id, time: timeFormat.format(new Date()), text, analysis: null },
      ...current,
    ]);
    setFilter("All");

    let status: number | undefined;
    try {
      // Proxied to the backend by Vite (see vite.config.ts).
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        status = response.status;
        throw new Error(`HTTP ${response.status}`);
      }

      const analysis: Analysis = await response.json();
      setEntries((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, analysis } : entry))
      );
      setFreshId(id);
      setOutcome({ tone: "result", analysis });
      setTicket("");
    } catch (err) {
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setOutcome({ tone: "error", message: describeError(err, status) });
    } finally {
      ticketRef.current?.focus();
    }
  }, [ticket, loading]);

  // Keyboard paths: ⌘/Ctrl+Enter classifies, "/" jumps to the ticket field,
  // Alt+1…5 switch board filters.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "TEXTAREA" || target.tagName === "INPUT";

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleClassify();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        ticketRef.current?.focus();
      } else if (event.altKey && /^Digit[1-5]$/.test(event.code)) {
        event.preventDefault();
        setFilter(["All", ...CATEGORIES][Number(event.code.slice(5)) - 1]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClassify]);

  function clearSession() {
    setEntries((current) => current.filter((entry) => entry.analysis === null));
    setOutcome({ tone: "idle" });
    setFreshId(null);
  }

  const settled = entries.filter((entry) => entry.analysis !== null);
  const counts: Record<string, number> = { All: settled.length };
  for (const category of CATEGORIES) {
    counts[category] = settled.filter(
      (entry) => entry.analysis?.category === category
    ).length;
  }

  const visible = entries.filter(
    (entry) =>
      filter === "All" ||
      entry.analysis === null ||
      entry.analysis.category === filter
  );
  const newestId = settled[0]?.id;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Support Ticket Analyzer</h1>
        <time className="clock" aria-label={`Current time ${now}`}>
          {now}
        </time>
        <p className="status" data-state={health} role="status">
          {HEALTH_LABELS[health]}
        </p>
      </header>

      <main className="workspace">
        <section className="compose" aria-label="Classify a ticket">
          <label className="caps" htmlFor="ticket">
            Ticket
          </label>
          <textarea
            id="ticket"
            ref={ticketRef}
            value={ticket}
            onChange={(event) => setTicket(event.target.value)}
            placeholder="Paste the customer's message here"
            aria-describedby="ticket-meta"
            autoFocus
            spellCheck={false}
          />
          <p className="field-meta" id="ticket-meta">
            {ticket.length} chars
          </p>

          <button
            type="button"
            className="classify"
            onClick={handleClassify}
            disabled={!canSubmit}
          >
            <span>{loading ? "Classifying…" : "Classify"}</span>
            <kbd aria-hidden="true">{SUBMIT_KEYS}</kbd>
          </button>

          <div className="outcome" data-tone={outcome.tone} aria-live="polite">
            {outcome.tone === "idle" && (
              <p className="outcome-note">
                The result appears here and on the board. Which classifier
                answered is always shown.
              </p>
            )}
            {outcome.tone === "error" && (
              <>
                <p className="outcome-head caps">Not classified</p>
                <p className="outcome-note">{outcome.message}</p>
              </>
            )}
            {outcome.tone === "result" && (
              <>
                <div className="outcome-body">
                  <Flaps
                    code={codeFor(outcome.analysis.category)}
                    source={outcome.analysis.source}
                    size="lg"
                    onShell
                  />
                  <div>
                    <p className="outcome-category">
                      {outcome.analysis.category}
                    </p>
                    <p className="outcome-via">
                      via {SOURCE_LABELS[outcome.analysis.source]}
                    </p>
                  </div>
                </div>
                {outcome.analysis.source === "keywords" && (
                  <p className="outcome-note">
                    The AI didn't answer, so this is a keyword guess. Check it
                    before routing.
                  </p>
                )}
              </>
            )}
          </div>

          <aside className="legend" aria-label="Reading the board">
            <h2 className="caps">Classifier on every row</h2>
            <div className="legend-row">
              <Flaps code="A" size="sm" onShell />
              <span>
                <strong>CLAUDE</strong> or <strong>MISTRAL</strong>: the AI
                answered
              </span>
            </div>
            <div className="legend-row">
              <Flaps code="K" source="keywords" size="sm" onShell />
              <span>
                <strong>KEYWORDS</strong>: fallback guess, review it
              </span>
            </div>
            <dl>
              <dt>
                <kbd>/</kbd>
              </dt>
              <dd>Jump to the ticket field</dd>
              <dt>
                <kbd>{IS_MAC ? "⌥" : "Alt"} 1–5</kbd>
              </dt>
              <dd>Switch board filter</dd>
            </dl>
          </aside>
        </section>

        <section className="board" aria-labelledby="board-title">
          <div className="board-head">
            <h2 className="caps" id="board-title">
              This session
            </h2>
            <p>Newest first</p>
            {settled.length > 0 && (
              <button type="button" className="text-button" onClick={clearSession}>
                Clear board
              </button>
            )}
          </div>

          <div className="filters" role="group" aria-label="Filter by category">
            {["All", ...CATEGORIES].map((name, index) => (
              <button
                key={name}
                type="button"
                className="filter"
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
                title={`${IS_MAC ? "⌥" : "Alt"}+${index + 1}`}
              >
                <span className="filter-label">
                  {name === "All" ? (
                    "All"
                  ) : (
                    <>
                      {codeFor(name)} <span>{name}</span>
                    </>
                  )}
                </span>
                <span className="filter-count">{counts[name]}</span>
              </button>
            ))}
          </div>

          <div className="departures">
            <table>
              <colgroup>
                <col className="col-time" />
                <col />
                <col className="col-category" />
                <col className="col-via" />
                <col className="col-chars" />
              </colgroup>
              <thead>
                <tr className="caps">
                  <th scope="col">Time</th>
                  <th scope="col">Ticket</th>
                  <th scope="col">Category</th>
                  <th scope="col">Via</th>
                  <th scope="col" className="num chars">
                    Chars
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={5}>
                      {settled.length === 0 ? (
                        <>
                          <strong>No tickets classified yet.</strong>
                          Paste a ticket on the left and press {SUBMIT_KEYS}.
                        </>
                      ) : (
                        <>
                          <strong>No {filter} tickets this session.</strong>
                          Press {IS_MAC ? "⌥" : "Alt"} 1 to show all.
                        </>
                      )}
                    </td>
                  </tr>
                )}
                {visible.map((entry) => {
                  const { analysis } = entry;
                  const newest = entry.id === newestId;
                  return (
                    <tr key={entry.id} data-newest={newest || undefined}>
                      <td className="time">{entry.time}</td>
                      <td title={entry.text}>
                        <span className="ticket">
                          <span className="excerpt">{entry.text}</span>
                          {newest && <span className="new-tag">NEW</span>}
                        </span>
                      </td>
                      <td>
                        {analysis ? (
                          <span className="category">
                            <Flaps
                              code={codeFor(analysis.category)}
                              source={analysis.source}
                              fresh={entry.id === freshId}
                            />
                            <span className="category-word">
                              {analysis.category}
                            </span>
                          </span>
                        ) : (
                          <span className="category">
                            <Flaps code="···" pending />
                            <span className="sr-only">Classifying</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {analysis ? (
                          <span className="via" data-source={analysis.source}>
                            {SOURCE_CODES[analysis.source]}
                            <span className="sr-only">
                              {" "}
                              ({SOURCE_LABELS[analysis.source]})
                            </span>
                          </span>
                        ) : (
                          <span className="via" data-source="pending">
                            Classifying…
                          </span>
                        )}
                      </td>
                      <td className="num chars">
                        {analysis ? analysis.character_count : entry.text.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
