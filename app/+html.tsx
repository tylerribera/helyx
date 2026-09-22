import type { PropsWithChildren } from 'react';

/**
 * The HTML shell wrapping every statically-rendered web page.
 *
 * Runs in Node at build time only -- no browser APIs, no global CSS imports.
 *
 * This file is web-only and has no effect on the native app, which makes it
 * the right home for the smart banner: the app never renders it.
 */
export default function Root({ children }: PropsWithChildren) {
  const iosAppId = process.env.EXPO_PUBLIC_IOS_APP_ID;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0E1116" />

        {/*
          iOS smart banner. Safari renders this natively at the top of the page
          on iPhone and iPad, and it deep-links into the app if installed.
          Requires a real App Store ID -- omitted entirely when unset, because a
          banner pointing at a nonexistent app is worse than no banner.
        */}
        {iosAppId ? <meta name="apple-itunes-app" content={`app-id=${iosAppId}`} /> : null}

        {/* Android has no equivalent native banner, so it gets the script below. */}
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseStyle }} />
        <script dangerouslySetInnerHTML={{ __html: androidSmartBanner }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Expo Router ships this to stop the root ScrollView from breaking body
 * scrolling on web. Inlined rather than imported so this file stays readable.
 */
function ScrollViewStyleReset() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `#root, body, html { height: 100%; } body { overflow: hidden; } #root { display: flex; }`,
      }}
    />
  );
}

const baseStyle = `
  body { background-color: #0E1116; color: #E6EDF3; margin: 0; }
  * { -webkit-tap-highlight-color: transparent; }

  #helyx-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    display: none; align-items: center; gap: 12px;
    padding: 10px 12px;
    background: #161B22; border-bottom: 1px solid #2A3139;
    font: 13px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #E6EDF3;
  }
  #helyx-banner .grow { flex: 1; }
  #helyx-banner .muted { color: #8B949E; font-size: 11px; }
  #helyx-banner a.cta {
    background: #4FD1C5; color: #0E1116; text-decoration: none;
    padding: 7px 14px; border-radius: 6px; font-weight: 700; white-space: nowrap;
  }
  #helyx-banner button.close {
    background: none; border: 0; color: #8B949E; font-size: 20px;
    line-height: 1; padding: 0 4px; cursor: pointer;
  }
`;

/**
 * Android smart banner.
 *
 * Shown only on Android phones, only on the web build, and only once a user
 * has not dismissed it. iOS is excluded because Safari's native banner already
 * covers it and two banners is worse than one.
 *
 * The dismissal is remembered. A banner a user has already declined that keeps
 * reappearing is the single fastest way to make someone stop visiting the site.
 */
const androidSmartBanner = `
(function () {
  var PLAY_URL = 'https://play.google.com/store/apps/details?id=us.helyx.app';
  var KEY = 'helyx.banner.dismissed';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    try { if (localStorage.getItem(KEY) === '1') return; } catch (e) { /* private mode */ }

    var bar = document.createElement('div');
    bar.id = 'helyx-banner';
    bar.innerHTML =
      '<div class="grow"><div><strong>Helyx</strong></div>' +
      '<div class="muted">Free — the full compound catalog, on your phone</div></div>' +
      '<a class="cta" href="' + PLAY_URL + '">Open</a>' +
      '<button class="close" aria-label="Dismiss">&times;</button>';

    bar.querySelector('button.close').addEventListener('click', function () {
      bar.style.display = 'none';
      document.body.style.paddingTop = '';
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    });

    document.body.appendChild(bar);
    bar.style.display = 'flex';
    document.body.style.paddingTop = bar.offsetHeight + 'px';
  });
})();
`;
