// Server-side proxy for getAudioCantillation() (src/lib/sefaria.ts) — AudioCantillationBar.tsx
// is a client component and fetches through this route rather than calling Sefaria directly
// from the browser, keeping the Sefaria dependency server-side like the rest of the app.
import { getAudioCantillation, SefariaUpstreamError } from "@/lib/sefaria";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return Response.json({ ok: false, error: "Missing ref" }, { status: 400 });
  }

  try {
    const clips = await getAudioCantillation(ref);
    return Response.json({ ok: true, clips });
  } catch (err) {
    if (err instanceof SefariaUpstreamError) {
      return Response.json({ ok: false, error: "Sefaria unreachable" }, { status: 502 });
    }
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
