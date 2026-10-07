import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { MessageComposer } from '@/components/MessageComposer';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand-lockup" href="/">
            <BrandMark />
            <span><strong>Whisper<span>Post</span></strong><small>ANONYMOUS MESSAGE RELAY</small></span>
          </Link>
          <nav aria-label="Main navigation" className="main-nav">
            <a href="#composer">Compose</a><a href="#how-it-works">How it works</a><Link href="/privacy">Privacy</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="hero-content">
            <span className="hero-kicker"><span className="status-dot" /> A note, without a signature</span>
            <h1>Some things are easier<br />to say <span>anonymously.</span></h1>
            <p>Send a kind word, a playful riddle, or a thoughtful apology through the WhisperPost email relay.</p>
            <a className="hero-link" href="#composer">Write a whisper <span aria-hidden="true">↓</span></a>
            <p className="hero-caveat">The relay does not request your name or email. Avoid sharing identifying details.</p>
          </div>
          <div aria-hidden="true" className="hero-note">
            <span className="note-top">A little reminder</span>
            <span className="note-line" />
            <span className="note-message">You make more of a difference than you know.</span>
            <span className="note-signature">— someone rooting for you</span>
            <span className="note-seal">✦</span>
          </div>
        </section>

        <div className="content-wrap">
          <MessageComposer />

          <section className="how-section" id="how-it-works">
            <div className="section-heading">
              <span className="eyebrow">Simple by design</span>
              <h2>A message takes three steps.</h2>
            </div>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><h3>Write your note</h3><p>Choose a prompt or write something of your own. WhisperPost does not ask you to enter a sender address.</p></article>
              <article className="step-card"><span className="step-number">02</span><h3>Review & schedule</h3><p>Preview the note, choose a style, and send it now or choose a future delivery time.</p></article>
              <article className="step-card"><span className="step-number">03</span><h3>The relay delivers</h3><p>The site operator's email provider handles delivery. Recipients can opt out of future messages.</p></article>
            </div>
          </section>

          <aside className="privacy-callout">
            <span aria-hidden="true">⌁</span>
            <div><strong>Privacy deserves honest expectations.</strong><p>Message content is encrypted while queued, but the site and email providers process it to deliver your note. <Link href="/privacy">Read the privacy details</Link>.</p></div>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <Link className="brand-lockup footer-brand" href="/"><BrandMark /><span><strong>Whisper<span>Post</span></strong></span></Link>
        <span>Anonymous email relay MVP. Delivery is best-effort; anonymity is not guaranteed.</span>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </>
  );
}
