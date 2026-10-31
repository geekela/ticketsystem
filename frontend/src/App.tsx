import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, analyze, checkHealth, fetchQuestions, type Source } from "./api";
import { Flaps, codeFor } from "./Flaps";
import { TicketDetail } from "./TicketDetail";
import { followUpStatus, loadSession, saveSession, type Entry, type FollowUp } from "./session";

type Health = "checking" | "online" | "offline";

const CATEGORIES = ["Account", "Billing", "Technical", "Other"] as const;

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

const HEALTH_INTERVAL_MS = 15_000;

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const SUBMIT_KEYS = IS_MAC ? "⌘ ↵" : "Ctrl ↵";
const ALT_KEY = IS_MAC ? "⌥" : "Alt";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function messageFor(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Try again.";
}

function useBackendHealth(): Health {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const online = await checkHealth();
      if (!cancelled) setHealth(online ? "online" : "offline");
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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [freshId, setFreshId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ticketRef = useRef<HTMLTextAreaElement>(null);
  const health = useBackendHealth();
  const now = useClock();

  const loading = entries.some((entry) => entry.analysis === null);
  const canSubmit = ticket.trim().length > 0 && !loading;

  useEffect(() => saveSession(entries), [entries]);

  const updateEntry = useCallback((id: string, change: (entry: Entry) => Entry) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? change(entry) : entry)));
  }, []);

  const updateFollowUp = useCallback(
    (id: string, change: (followUp: FollowUp) => FollowUp) => {
      updateEntry(id, (entry) =>
        entry.followUp ? { ...entry, followUp: change(entry.followUp) } : entry
      );
    },
    [updateEntry]
  );

  const loadQuestions = useCallback(
    async (id: string, text: string, category: string) => {
      updateEntry(id, (entry) => ({
        ...entry,
        followUp: { status: "loading", questions: [], answers: [] },
      }));
      try {
        const { questions, source } = await fetchQuestions(text, category);
        updateFollowUp(id, () => ({
          status: "ready",
          questions,
          source,
          answers: questions.map(() => ""),
        }));
      } catch (err) {
        updateFollowUp(id, (followUp) => ({
          ...followUp,
          status: "error",
          error: messageFor(err),
        }));
      }
    },
    [updateEntry, updateFollowUp]
  );

  const handleClassify = useCallback(async () => {
    const text = ticket;
    if (!text.trim() || loading) return;

    const id = crypto.randomUUID();
    setEntries((current) => [
      { id, time: timeFormat.format(new Date()), text, analysis: null },
      ...current,
    ]);
    setFilter("All");
    setError(null);

    try {
      const analysis = await analyze(text);
      updateEntry(id, (entry) => ({ ...entry, analysis }));
      setFreshId(id);
      setSelectedId(id);
      setTicket("");
      loadQuestions(id, text, analysis.category);
    } catch (err) {
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setError(messageFor(err));
    } finally {
      ticketRef.current?.focus();
    }
  }, [ticket, loading, updateEntry, loadQuestions]);

  async function reclassify(entry: Entry) {
    const followUp = entry.followUp;
    if (!entry.analysis || !followUp || followUp.reclassifying) return;
    const answers = followUp.questions
      .map((question, index) => ({ question, answer: followUp.answers[index]?.trim() ?? "" }))
      .filter((item) => item.answer);
    if (answers.length === 0) return;

    const before = entry.analysis.category;
    updateFollowUp(entry.id, (current) => ({ ...current, reclassifying: true }));
    setError(null);
    try {
      const analysis = await analyze(entry.text, answers);
      updateEntry(entry.id, (current) => ({
        ...current,
        analysis,
        followUp: current.followUp && {
          ...current.followUp,
          reclassifying: false,
          recheck: { before, after: analysis.category, source: analysis.source },
        },
      }));
      setFreshId(entry.id);
    } catch (err) {
      updateFollowUp(entry.id, (current) => ({ ...current, reclassifying: false }));
      setError(`Not re-classified. ${messageFor(err)}`);
    }
  }

  const settled = entries.filter((entry) => entry.analysis !== null);
  const visible = entries.filter(
    (entry) =>
      filter === "All" ||
      entry.analysis === null ||
      entry.analysis.category === filter
  );
  const selectable = visible.filter((entry) => entry.analysis !== null);
  const selected =
    settled.find((entry) => entry.id === selectedId) ?? settled[0] ?? null;

  // Keyboard paths: ⌘/Ctrl+Enter classifies, "/" jumps to the ticket field,
  // J/K move between tickets, Alt+1…5 switch board filters.
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
      } else if ((event.key === "j" || event.key === "k") && !typing && selectable.length) {
        event.preventDefault();
        const index = selectable.findIndex((entry) => entry.id === selected?.id);
        const step = event.key === "j" ? 1 : -1;
        const next = Math.min(Math.max(index + step, 0), selectable.length - 1);
        setSelectedId(selectable[next].id);
      } else if (event.altKey && /^Digit[1-5]$/.test(event.code)) {
        event.preventDefault();
        setFilter(["All", ...CATEGORIES][Number(event.code.slice(5)) - 1]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClassify, selectable, selected]);

  function clearSession() {
    setEntries((current) => current.filter((entry) => entry.analysis === null));
    setError(null);
    setFreshId(null);
    setSelectedId(null);
  }

  const counts: Record<string, number> = { All: settled.length };
  for (const category of CATEGORIES) {
    counts[category] = settled.filter(
      (entry) => entry.analysis?.category === category
    ).length;
  }
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

          <div className="outcome" data-tone="error" aria-live="polite" hidden={!error}>
            <p className="outcome-head caps">Not classified</p>
            <p className="outcome-note">{error}</p>
          </div>

          {selected ? (
            <TicketDetail
              key={selected.id}
              entry={selected}
              fresh={selected.id === freshId}
              submitKeys={SUBMIT_KEYS}
              onAnswer={(index, answer) =>
                updateFollowUp(selected.id, (followUp) => ({
                  ...followUp,
                  answers: followUp.answers.map((value, i) => (i === index ? answer : value)),
                }))
              }
              onReclassify={() => reclassify(selected)}
              onRetry={() =>
                loadQuestions(selected.id, selected.text, selected.analysis!.category)
              }
            />
          ) : (
            <div className="outcome" data-tone="idle">
              <p className="outcome-note">
                The result appears here and on the board, with follow-up questions to
                ask the customer.
              </p>
            </div>
          )}

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
                <kbd>J</kbd> <kbd>K</kbd>
              </dt>
              <dd>Next or previous ticket</dd>
              <dt>
                <kbd>{ALT_KEY} 1–5</kbd>
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
                title={`${ALT_KEY}+${index + 1}`}
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
                <col className="col-ask" />
                <col className="col-chars" />
              </colgroup>
              <thead>
                <tr className="caps">
                  <th scope="col">Time</th>
                  <th scope="col">Ticket</th>
                  <th scope="col">Category</th>
                  <th scope="col">Via</th>
                  <th scope="col">Ask</th>
                  <th scope="col" className="num chars">
                    Chars
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={6}>
                      {settled.length === 0 ? (
                        <>
                          <strong>No tickets classified yet.</strong>
                          Paste a ticket on the left and press {SUBMIT_KEYS}.
                        </>
                      ) : (
                        <>
                          <strong>No {filter} tickets this session.</strong>
                          Press {ALT_KEY} 1 to show all.
                        </>
                      )}
                    </td>
                  </tr>
                )}
                {visible.map((entry) => {
                  const { analysis } = entry;
                  const newest = entry.id === newestId;
                  const isSelected = entry.id === selected?.id;
                  return (
                    <tr
                      key={entry.id}
                      data-newest={newest || undefined}
                      data-selected={isSelected || undefined}
                    >
                      <td className="time">{entry.time}</td>
                      <td>
                        <span className="ticket">
                          {analysis ? (
                            <button
                              type="button"
                              className="row-button"
                              aria-pressed={isSelected}
                              onClick={() => setSelectedId(entry.id)}
                              title={entry.text}
                            >
                              {entry.text}
                            </button>
                          ) : (
                            <span className="excerpt">{entry.text}</span>
                          )}
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
                      <td className="ask-cell">
                        {analysis ? followUpStatus(entry.followUp) : ""}
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
