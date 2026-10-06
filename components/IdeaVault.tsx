'use client';

import { useState } from 'react';
import type { PromptCategory, Prompt } from '@/lib/prompts';

export function IdeaVault({
  categories,
  onChoose
}: {
  categories: PromptCategory[];
  onChoose: (category: PromptCategory, prompt: Prompt) => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const active = categories.find((category) => category.id === categoryId) ?? categories[0];

  return (
    <>
      <button className="button-subtle" onClick={() => setOpen(true)} type="button">Browse ideas</button>
      {open && (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section aria-labelledby="vault-title" aria-modal="true" className="dialog-card vault-card" role="dialog">
            <div className="dialog-heading">
              <div><span className="eyebrow">A little inspiration</span><h2 id="vault-title">Idea vault</h2></div>
              <button aria-label="Close idea vault" className="icon-button" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <div className="vault-categories">
              {categories.map((category) => (
                <button
                  aria-pressed={category.id === active.id}
                  className={category.id === active.id ? 'selected' : ''}
                  key={category.id}
                  onClick={() => setCategoryId(category.id)}
                  type="button"
                >
                  {category.emoji} {category.label}
                </button>
              ))}
            </div>
            <div className="vault-prompts">
              {active.prompts.map((prompt) => (
                <article className="prompt-card" key={prompt.subject}>
                  <h3>{prompt.subject}</h3><p>{prompt.body}</p>
                  <button className="button-subtle" onClick={() => { onChoose(active, prompt); setOpen(false); }} type="button">
                    Use this idea
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
