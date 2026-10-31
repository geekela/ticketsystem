import { useEffect, useState, type KeyboardEvent } from "react";
import type { Source } from "./api";
import { Flaps, codeFor } from "./Flaps";
import type { Entry } from "./session";

const SOURCE_LABELS: Record<Source, string> = {
  anthropic: "Claude (Anthropic)",
  mistral: "Mistral AI",
  keywords: "keyword matching",
};

type CopyState = "idle" | "copied" | "failed";

/** The selected ticket: its result plus follow-up questions for the customer. */
export function TicketDetail({
  entry,
  fresh,
  submitKeys,
  onAnswer,
  onReclassify,
  onRetry,
}: {
  entry: Entry;
  fresh: boolean;
  submitKeys: string;
  onAnswer: (index: number, answer: string) => void;
  onReclassify: () => void;
  onRetry: () => void;
}) {
  const analysis = entry.analysis!;
  const followUp = entry.followUp;
  const [copy, setCopy] = useState<CopyState>("idle");

  useEffect(() => {
    if (copy === "idle") return;
    const timer = window.setTimeout(() => setCopy("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copy]);

  const questions = followUp?.status === "ready" ? followUp.questions : [];
  const answered = followUp?.answers.some((answer) => answer.trim()) ?? false;
  const canReclassify = answered && !followUp?.reclassifying;

  async function copyQuestions() {
    const text = questions.map((question, index) => `${index + 1}. ${question}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  // ⌘/Ctrl+Enter inside the answers re-classifies instead of classifying a new ticket.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      if (canReclassify) onReclassify();
    }
  }

  return (
    <section className="detail" aria-labelledby="detail-title" onKeyDown={onKeyDown}>
      <div className="detail-head">
        <h2 className="caps" id="detail-title">
          Selected ticket
        </h2>
        <span className="detail-time">{entry.time}</span>
      </div>

      <div className="detail-result">
        <Flaps
          code={codeFor(analysis.category)}
          source={analysis.source}
          size="lg"
          fresh={fresh}
          onShell
        />
        <div>
          <p className="detail-category">{analysis.category}</p>
          <p className="detail-via">via {SOURCE_LABELS[analysis.source]}</p>
        </div>
      </div>
      {analysis.source === "keywords" && (
        <p className="detail-note">
          The AI didn't answer, so this is a keyword guess. Check it before routing.
        </p>
      )}
      <p className="detail-excerpt" title={entry.text}>
        {entry.text}
      </p>

      <div className="ask">
        <div className="ask-head">
          <h3 className="caps">Ask the customer</h3>
          {questions.length > 0 && (
            <button type="button" className="text-button" onClick={copyQuestions}>
              {copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy questions"}
            </button>
          )}
        </div>

        <div aria-live="polite">
          {(!followUp || followUp.status === "loading") && (
            <div className="ask-loading">
              <p>Drafting questions…</p>
              <span className="ask-bar" />
              <span className="ask-bar" />
            </div>
          )}

          {followUp?.status === "error" && (
            <div className="ask-error">
              <p>{followUp.error}</p>
              <button type="button" className="secondary" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}

          {followUp?.status === "ready" && questions.length === 0 && (
            <p className="ask-empty">Nothing to ask: the ticket already has what support needs.</p>
          )}

          {followUp?.status === "ready" && followUp.source === "preset" && (
            <p className="ask-note">Standard {analysis.category} questions: the AI didn't answer.</p>
          )}
        </div>

        {questions.length > 0 && (
          <>
            <ol className="questions">
              {questions.map((question, index) => (
                <li key={index}>
                  <label htmlFor={`answer-${entry.id}-${index}`}>{question}</label>
                  <textarea
                    id={`answer-${entry.id}-${index}`}
                    rows={2}
                    value={followUp!.answers[index] ?? ""}
                    onChange={(event) => onAnswer(index, event.target.value)}
                    placeholder="Customer's answer"
                  />
                </li>
              ))}
            </ol>

            <button
              type="button"
              className="secondary reclassify"
              onClick={onReclassify}
              disabled={!canReclassify}
            >
              <span>{followUp!.reclassifying ? "Re-classifying…" : "Re-classify with answers"}</span>
              <kbd aria-hidden="true">{submitKeys}</kbd>
            </button>

            <p className="recheck" aria-live="polite">
              {followUp!.recheck &&
                (followUp!.recheck.before === followUp!.recheck.after
                  ? `Still ${followUp!.recheck.after} after the answers.`
                  : `Changed from ${followUp!.recheck.before} to ${followUp!.recheck.after}.`)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
