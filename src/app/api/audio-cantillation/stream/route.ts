// Streams a PocketTorah mp3 from GitHub's raw content host through our own origin.
//
// raw.githubusercontent.com serves every file with `Content-Disposition: attachment`
// (GitHub's deliberate security header, forcing a download rather than inline rendering
// of arbitrary hosted content — verified live 2026-08-02: `curl -sI` on the exact mp3 URL
// returns `content-disposition: attachment; filename=...`). Browsers won't play that as an
// <audio> source: playback silently hangs forever — `readyState`/`networkState` never
// progress and no `error` event ever fires, confirmed on both local dev and production, via
// the real Play button AND a bare `new Audio()` bypassing React entirely. Re-serving the same
// bytes same-origin without that header is the fix, and lets media-src stay 'self' in the CSP.
const ALLOWED_PREFIX = "https://raw.githubusercontent.com/rneiss/PocketTorah/master/data/audio/";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !url.startsWith(ALLOWED_PREFIX)) {
    return new Response("Invalid or disallowed url", { status: 400 });
  }

  let upstream: Response;
  try {
    const range = request.headers.get("range");
    upstream = await fetch(url, {
      headers: range ? { Range: range } : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return new Response("Upstream unreachable", { status: 502 });
  }
  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Upstream error", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "audio/mpeg");
  headers.set("Accept-Ranges", "bytes");
  // PocketTorah recordings are static — safe to cache long, same TTL as audioCantillationCache.
  headers.set("Cache-Control", "public, max-age=2592000, immutable");
  for (const h of ["content-length", "content-range", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
