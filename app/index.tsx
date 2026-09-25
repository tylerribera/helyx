import { useState } from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { PageMeta } from '@/components/seo';
import { supabase } from '@/lib/supabase';

/**
 * helyx.us landing page.
 *
 * Web only — on native this hands straight off to the tabs, so someone who
 * already installed the app is never shown a pitch for it.
 *
 * Written with DOM elements and a stylesheet rather than React Native
 * primitives. That is a deliberate exception to the rest of the codebase: this
 * page never renders on native, and hover states, gradients, transitions, focus
 * rings, and fluid type are all things StyleSheet cannot express on web without
 * fighting it. Every other screen stays React Native.
 *
 * The palette is monochrome on purpose. The logo is a white-to-grey gradient,
 * and the product's whole claim is that it is careful and sourced — a bright
 * accent colour undercuts that. White is the only highlight.
 */

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done' }
  | { kind: 'already' }
  | { kind: 'error'; message: string };

/** Permissive on purpose: rejecting valid-but-unusual addresses loses signups. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export default function Landing() {
  if (Platform.OS !== 'web') return <Redirect href="/today" />;

  return (
    <>
      <PageMeta
        title="Brain health, researched"
        description="A sourced catalog of nootropic compounds — what they do, what the evidence actually says, and what not to take them with."
        path="/"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="hx-root">
        <div className="hx-glow" aria-hidden="true" />
        <Helix />
        <main className="hx-main">
          <Hero />
          <Points />
          <Footer />
        </main>
      </div>
    </>
  );
}

function Hero() {
  return (
    <section className="hx-hero">
      <img src="/helyx-logo.svg" alt="Helyx" className="hx-logo" width={168} height={34} />
      <h1 className="hx-h1">
        Brain health,
        <br />
        <span className="hx-h1-dim">researched.</span>
      </h1>
      <p className="hx-sub">
        A catalog of nootropic compounds where every claim carries a citation. Doses, half-life,
        side effects, legal status, and what not to combine — checked by a human before it
        publishes.
      </p>
      <Signup />
    </section>
  );
}

function Signup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const busy = state.kind === 'sending';

  async function submit(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    const value = email.trim().toLowerCase();

    if (!looksLikeEmail(value)) {
      setState({ kind: 'error', message: 'That does not look like an email address.' });
      return;
    }
    if (!supabase) {
      setState({ kind: 'error', message: 'Signups open shortly — check back.' });
      return;
    }

    setState({ kind: 'sending' });
    const { error } = await supabase.from('waitlist').insert({ email: value, source: 'web' });

    if (!error) {
      setState({ kind: 'done' });
      setEmail('');
    } else if (error.code === '23505') {
      // Unique violation. Being on the list twice is not a failure, and a
      // database error here would read as one.
      setState({ kind: 'already' });
      setEmail('');
    } else {
      setState({ kind: 'error', message: 'Something went wrong. Try again in a moment.' });
    }
  }

  if (state.kind === 'done' || state.kind === 'already') {
    return (
      <div className="hx-done" role="status">
        <span className="hx-check" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>{state.kind === 'done' ? "You're on the list." : 'Already on the list.'}</strong>
          <p>One email when it opens. Nothing else, and your address goes nowhere.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="hx-form" onSubmit={submit}>
      <div className="hx-field">
        <input
          className="hx-input"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === 'error') setState({ kind: 'idle' });
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          autoComplete="email"
          disabled={busy}
        />
        <button className="hx-btn" type="submit" disabled={busy}>
          {busy ? 'Joining…' : 'Get early access'}
        </button>
      </div>
      {state.kind === 'error' ? (
        <p className="hx-err">{state.message}</p>
      ) : (
        <p className="hx-hint">No newsletter. One email when it opens.</p>
      )}
    </form>
  );
}

const POINTS = [
  {
    n: '01',
    title: 'Cited, or it does not ship',
    body: 'Four qualifying sources minimum before a compound can publish, and every individual claim carries its own citation. Anecdote is stored, labelled, and never counted as evidence.',
  },
  {
    n: '02',
    title: 'Filtered to what you are after',
    body: 'Focus, sleep, stress, memory — say it once. Anything banned in tested sport disappears if you compete, and that filter runs before ranking, so a strong match can never override it.',
  },
  {
    n: '03',
    title: 'The pairings matter more',
    body: 'What stacks well, what cancels out, and what you should not combine at all. Every interaction is sourced, and the ones inferred from shared mechanism say so plainly.',
  },
];

function Points() {
  return (
    <section className="hx-points">
      {POINTS.map((p) => (
        <article className="hx-point" key={p.n}>
          <span className="hx-num">{p.n}</span>
          <h2 className="hx-pt">{p.title}</h2>
          <p className="hx-pb">{p.body}</p>
        </article>
      ))}
    </section>
  );
}

function Footer() {
  return (
    <footer className="hx-footer">
      <a className="hx-link" href="/catalog">
        Preview the catalog <span aria-hidden="true">→</span>
      </a>
      <p className="hx-fine">
        Educational information only. Helyx is not medical advice and does not diagnose or treat
        anything. Talk to a clinician before taking any compound, especially alongside prescription
        medication.
      </p>
      <p className="hx-fine hx-dim">
        © {new Date().getFullYear()} Helyx · <a href="mailto:hello@helyx.us">hello@helyx.us</a>
      </p>
    </footer>
  );
}

/** Oversized brand mark, bled off the right edge. Decorative only. */
function Helix() {
  return (
    <svg className="hx-mark" viewBox="0 0 24 32" aria-hidden="true">
      <defs>
        <linearGradient id="hx-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#555" />
        </linearGradient>
      </defs>
      <g stroke="url(#hx-g)" fill="none" strokeLinecap="round">
        <path d="M8 0C8 0 2 8 2 16C2 24 8 32 8 32" strokeWidth="1.1" />
        <path d="M16 0C16 0 22 8 22 16C22 24 16 32 16 32" strokeWidth="1.1" />
        <line x1="5" y1="8" x2="19" y2="8" strokeWidth="0.6" opacity="0.5" />
        <line x1="3" y1="16" x2="21" y2="16" strokeWidth="0.6" opacity="0.5" />
        <line x1="5" y1="24" x2="19" y2="24" strokeWidth="0.6" opacity="0.5" />
      </g>
    </svg>
  );
}

const css = `
.hx-root,.hx-root *{box-sizing:border-box;}
.hx-root{
  position:relative; height:100%; width:100%; overflow-y:auto; overflow-x:hidden;
  /* Flex item of Expo's #root, whose default min-width:auto refuses to shrink
     below content width — that is what pushed the page wider than the viewport
     on phones. */
  flex:1 1 auto; min-width:0;
  background:#08090C; color:#E9EDF2;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
/* Soft light source behind the hero, so the page is not a flat black rectangle. */
.hx-glow{
  position:absolute; top:-30vh; left:50%; transform:translateX(-50%);
  width:120vw; height:90vh; pointer-events:none;
  background:radial-gradient(ellipse at center,rgba(150,170,200,.11) 0%,rgba(8,9,12,0) 62%);
}
.hx-mark{
  position:absolute; top:4vh; right:-14vw; width:46vw; max-width:520px;
  opacity:.05; pointer-events:none;
}
.hx-main{
  position:relative; width:100%; max-width:660px; margin:0 auto;
  padding:clamp(72px,14vh,150px) clamp(20px,5vw,28px) 96px;
  display:flex; flex-direction:column; gap:clamp(64px,11vh,116px);
}

.hx-hero{display:flex; flex-direction:column; align-items:flex-start; gap:26px;}
.hx-logo{height:34px; width:auto; opacity:.95;}
.hx-h1{
  margin:0; font-size:clamp(2.6rem,7.5vw,4.1rem); line-height:1.02;
  letter-spacing:-.035em; font-weight:600;
}
.hx-h1-dim{color:#6B7683;}
.hx-sub{
  margin:0; max-width:34em; overflow-wrap:anywhere; font-size:clamp(1.02rem,2.1vw,1.16rem);
  line-height:1.62; color:#98A2AE;
}

.hx-form{width:100%; max-width:470px; margin-top:6px;}
.hx-field{display:flex; gap:9px;}
.hx-input{
  flex:1; min-width:0; background:#101318; color:#E9EDF2;
  border:1px solid #232830; border-radius:9px;
  padding:13px 15px; font-size:.96rem; font-family:inherit;
  transition:border-color .16s ease, background .16s ease;
}
.hx-input::placeholder{color:#5C6672;}
.hx-input:hover{border-color:#313943;}
.hx-input:focus{outline:none; border-color:#4A5563; background:#12161C;}
.hx-input:disabled{opacity:.55;}
.hx-btn{
  background:#F2F5F8; color:#0A0C10; border:0; border-radius:9px;
  padding:13px 20px; font-size:.94rem; font-weight:650; font-family:inherit;
  cursor:pointer; white-space:nowrap;
  transition:transform .14s ease, background .16s ease, box-shadow .16s ease;
}
.hx-btn:hover:not(:disabled){background:#fff; transform:translateY(-1px); box-shadow:0 6px 22px rgba(190,205,225,.14);}
.hx-btn:active:not(:disabled){transform:translateY(0);}
.hx-btn:disabled{opacity:.55; cursor:default;}
.hx-hint{margin:11px 0 0; font-size:.8rem; color:#5F6975;}
.hx-err{margin:11px 0 0; font-size:.83rem; color:#E2757A;}

.hx-done{
  display:flex; gap:14px; align-items:flex-start; max-width:470px;
  background:#0E1218; border:1px solid #29313B; border-radius:11px; padding:18px 20px;
}
.hx-check{
  flex:none; width:24px; height:24px; border-radius:50%;
  background:#F2F5F8; color:#0A0C10;
  display:flex; align-items:center; justify-content:center; font-size:.78rem; font-weight:800;
}
.hx-done strong{font-size:.98rem; font-weight:620;}
.hx-done p{margin:5px 0 0; font-size:.86rem; line-height:1.55; color:#8A94A1;}

.hx-points{display:flex; flex-direction:column; gap:34px;}
.hx-point{
  border-top:1px solid #1A1F26; padding-top:22px;
  transition:border-color .2s ease;
}
.hx-point:hover{border-top-color:#333C47;}
.hx-num{
  display:block; font-size:.7rem; letter-spacing:.16em;
  color:#4E5865; margin-bottom:11px; font-variant-numeric:tabular-nums;
}
.hx-pt{margin:0 0 9px; font-size:1.12rem; font-weight:600; letter-spacing:-.012em;}
.hx-pb{margin:0; font-size:.945rem; line-height:1.68; color:#8A94A1; max-width:40em;}

.hx-footer{
  border-top:1px solid #1A1F26; padding-top:26px;
  display:flex; flex-direction:column; gap:15px;
}
.hx-link{
  color:#D6DCE4; text-decoration:none; font-size:.92rem; width:fit-content;
  transition:color .16s ease;
}
.hx-link:hover{color:#fff;}
.hx-link span{display:inline-block; transition:transform .16s ease;}
.hx-link:hover span{transform:translateX(3px);}
.hx-fine{margin:0; font-size:.78rem; line-height:1.62; color:#616B77; max-width:46em;}
.hx-fine a{color:#8A94A1;}
.hx-dim{color:#4E5865;}

@media (max-width:540px){
  .hx-field{flex-direction:column;}
  .hx-btn{width:100%; padding:14px 20px;}
  .hx-mark{right:-32vw; width:80vw; opacity:.04;}
}
@media (prefers-reduced-motion:reduce){
  .hx-btn,.hx-link span,.hx-point,.hx-input{transition:none;}
  .hx-btn:hover:not(:disabled){transform:none;}
}
`;
