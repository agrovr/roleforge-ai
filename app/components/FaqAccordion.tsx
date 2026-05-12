"use client";

import { useState } from "react";

type FaqItem = readonly [question: string, answer: string];

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="faq-grid">
      {items.map(([question, answer], index) => {
        const isOpen = openIndex === index;
        const answerId = `faq-answer-${index}`;

        return (
          <article className={isOpen ? "faq-item open" : "faq-item"} key={question}>
            <button
              aria-controls={answerId}
              aria-expanded={isOpen}
              className="faq-q"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span>{question}</span>
              <span className="faq-toggle" aria-hidden="true">+</span>
            </button>
            <div aria-hidden={!isOpen} className="faq-a" id={answerId}>
              {answer}
            </div>
          </article>
        );
      })}
    </div>
  );
}
