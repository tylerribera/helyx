/**
 * Runs after `expo export --platform web`.
 *
 * Lives here rather than in CI config so the build behaves identically on a
 * laptop, in GitHub Actions, and on Cloudflare Pages. A build step that only
 * exists in one host's YAML is a step that silently stops happening when you
 * change hosts -- which is exactly how a site ends up serving the wrong thing.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';

// Both Cloudflare Pages and GitHub Pages serve 404.html for unresolved paths.
// Expo names that page +not-found.html, so without this copy a stale or
// mistyped URL gets the host's default 404 instead of the app's.
const notFound = join(dist, '+not-found.html');
if (existsSync(notFound)) {
  copyFileSync(notFound, join(dist, '404.html'));
  console.log('  post-export: 404.html written');
} else {
  console.error('  post-export: +not-found.html missing — no 404 fallback will be served');
  process.exit(1);
}
