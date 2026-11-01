import { useState, type FormEvent } from 'react';
import type { Me } from '../../../shared/types.ts';
import { api } from '../api.ts';

export function SettingsPage({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const [session, setSession] = useState('');
  const [contact, setContact] = useState(me.contact ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      onSaved(await api.saveConfig({ contact, ...(session ? { session } : {}) }));
      setSession('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="settings">
      <h2 className="day-desc">--- Settings ---</h2>
      {me.valid ? (
        <p>
          Logged in as <em>{me.user}</em>.
        </p>
      ) : me.configured ? (
        <p className="error">The saved cookie is invalid or expired. Paste a new one.</p>
      ) : (
        <p>
          To show your stars, puzzles and inputs, the app needs your Advent of Code session cookie. It is stored only on
          this computer (<code>.data/config.json</code>) and is only ever sent to adventofcode.com.
        </p>
      )}

      <p className="disclaimer">
        AoC Playground is an unofficial, open source project, not affiliated with Advent of Code or Eric Wastl. Puzzle
        text and inputs belong to Advent of Code: they are downloaded with your account and stay on your computer.
      </p>

      <form onSubmit={save}>
        <label htmlFor="session">Session cookie</label>
        <input
          id="session"
          type="password"
          autoComplete="off"
          placeholder={me.configured ? '•••••••• (leave empty to keep the current one)' : '53616c7465645f5f…'}
          value={session}
          onChange={(e) => setSession(e.target.value)}
        />
        <ol className="quiet">
          <li>
            Log in at{' '}
            <a href="https://adventofcode.com" target="_blank" rel="noopener">
              adventofcode.com
            </a>
            .
          </li>
          <li>Open DevTools (F12) → Application/Storage → Cookies.</li>
          <li>
            Copy the value of the <code>session</code> cookie.
          </li>
        </ol>

        <label htmlFor="contact">Your contact</label>
        <input
          id="contact"
          placeholder="you@email.com or your GitHub username"
          value={contact}
          required
          onChange={(e) => setContact(e.target.value)}
        />
        <p className="quiet">
          Advent of Code asks tools to identify themselves. It is sent in the User-Agent so they can reach you if
          something goes wrong.
        </p>

        <p>
          <button className="link" type="submit" disabled={saving}>
            {saving ? '[Checking…]' : '[Save]'}
          </button>{' '}
          {error && <span className="error">{error}</span>}
          {me.valid && !error && !saving && (
            <a href="#/" className="success">
              All set → [Events]
            </a>
          )}
        </p>
      </form>
    </article>
  );
}
