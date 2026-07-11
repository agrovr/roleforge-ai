"use client";

import { useState } from "react";

type FaqItem = readonly [topic: string, question: string, answer: string];

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="faq-grid">
      {items.map(([topic, question, answer], index) => {
        const isOpen = openIndex === index;
        const answerId = `faq-answer-${index}`;
        const questionId = `faq-question-${index}`;

        return (
          <article className={isOpen ? "faq-item open" : "faq-item"} key={question}>
            <button
              aria-controls={answerId}
              aria-expanded={isOpen}
              className="faq-q"
              id={questionId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span className="faq-question-copy">
                <span className="faq-topic">{topic}</span>
                <span className="faq-question-text">{question}</span>
              </span>
              <span className="faq-toggle" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
            <div aria-hidden={!isOpen} aria-labelledby={questionId} className="faq-a" id={answerId} role="region">
              {answer}
            </div>
          </article>
        );
      })}
    </div>
  );
}
