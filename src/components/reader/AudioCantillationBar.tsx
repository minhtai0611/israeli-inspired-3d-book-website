"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioCantillationClip } from "@/lib/sefaria";
import { buildRef } from "@/lib/schema-resolver";

type Track = { url: string; clips: AudioCantillationClip[] };

function verseNumberFromAnchorRef(anchorRef: string): number | null {
  const m = anchorRef.match(/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function groupIntoTracks(clips: AudioCantillationClip[]): Track[] {
  const byUrl = new Map<string, AudioCantillationClip[]>();
  for (const c of clips) {
    const list = byUrl.get(c.media_url) ?? [];
    list.push(c);
    byUrl.set(c.media_url, list);
  }
  return [...byUrl.entries()].map(([url, list]) => ({
    url,
    clips: list.sort((a, b) => Number(a.start_time) - Number(b.start_time)),
  }));
}

/**
 * Opt-in Torah-cantillation audio player for one chapter, fetched from Sefaria's
 * `related_api` (PocketTorah recordings — see getAudioCantillation() in src/lib/sefaria.ts
 * for why this is the real endpoint, not a dedicated "audio API"). Renders nothing when the
 * chapter has no recording, which is the common case outside Torah. Custom Play/Pause/0.75x
 * controls (rather than the native <audio controls> UI) so every control carries an explicit
 * aria-label, per WCAG 2.2 AA.
 */
export function AudioCantillationBar({ book, chapter }: { book: string; chapter: string }) {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const highlightedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const ref = buildRef(book, chapter);
    fetch(`/api/audio-cantillation?ref=${encodeURIComponent(ref)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setTracks(data.ok ? groupIntoTracks(data.clips) : []))
      .catch(() => setTracks([]));
    return () => controller.abort();
  }, [book, chapter]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = slow ? 0.75 : 1;
  }, [slow, trackIndex]);

  useEffect(() => {
    return () => {
      if (highlightedIdRef.current) {
        document.getElementById(highlightedIdRef.current)?.classList.remove("verse-audio-active");
      }
    };
  }, []);

  const track = tracks?.[trackIndex];

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const t = audio.currentTime;
    const clip = track.clips.find((c) => t >= Number(c.start_time) && t < Number(c.end_time));
    const verseN = clip ? verseNumberFromAnchorRef(clip.anchorRef) : null;
    const nextId = verseN !== null ? `v${verseN}` : null;

    if (nextId !== highlightedIdRef.current) {
      if (highlightedIdRef.current) {
        document.getElementById(highlightedIdRef.current)?.classList.remove("verse-audio-active");
      }
      if (nextId) document.getElementById(nextId)?.classList.add("verse-audio-active");
      highlightedIdRef.current = nextId;
      setActiveVerse(verseN);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else {
      audio.pause();
      setPlaying(false);
    }
  }

  if (tracks === null) return null; // still loading — avoid a layout flash for the common no-audio case
  if (tracks.length === 0 || !track) return null;

  return (
    <div
      role="group"
      aria-label="Trình phát âm thanh ngâm đọc Torah (cantillation)"
      className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-3 text-xs"
    >
      <audio
        ref={audioRef}
        key={track.url}
        // Proxied same-origin (see /api/audio-cantillation/stream) — raw.githubusercontent.com
        // serves every file with Content-Disposition: attachment, which silently prevents
        // browsers from ever playing it as an <audio> source (verified live 2026-08-02).
        src={`/api/audio-cantillation/stream?url=${encodeURIComponent(track.url)}`}
        preload="none"
        aria-label={`Bản ghi âm ${track.clips[0]?.source ?? "Torah"} cho ${buildRef(book, chapter)}`}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Tạm dừng âm thanh" : "Phát âm thanh ngâm đọc"}
        className="btn-outline !px-3 !py-1.5"
      >
        {playing ? "⏸ Tạm dừng" : "▶ Phát ngâm đọc"}
      </button>

      <button
        type="button"
        onClick={() => setSlow((v) => !v)}
        aria-pressed={slow}
        aria-label={slow ? "Tắt tua chậm, phát tốc độ thường" : "Bật tua chậm 0.75 lần"}
        className={`rounded-full px-3 py-1.5 transition ${
          slow
            ? "bg-[#d4af37] text-[#14100a] font-semibold"
            : "border border-[#d4af37]/40 text-parchment/80 hover:border-[#d4af37]"
        }`}
      >
        0.75x
      </button>

      {tracks.length > 1 && (
        <label className="flex items-center gap-2 text-parchment/80">
          Đoạn ghi âm
          <select
            value={trackIndex}
            onChange={(e) => setTrackIndex(Number(e.target.value))}
            className="rounded-md border border-[#d4af37]/40 bg-transparent px-2 py-1"
            aria-label="Chọn đoạn ghi âm"
          >
            {tracks.map((t, i) => (
              <option key={t.url} value={i} className="text-[#14100a]">
                {t.clips[0]?.anchorRef} – {t.clips[t.clips.length - 1]?.anchorRef}
              </option>
            ))}
          </select>
        </label>
      )}

      <span className="text-parchment/60">
        Nguồn: {track.clips[0]?.source ?? "PocketTorah"} (CC-BY-SA)
      </span>

      <p role="status" aria-live="polite" className="sr-only">
        {activeVerse !== null ? `Đang đọc câu ${activeVerse}` : ""}
      </p>
    </div>
  );
}

export default AudioCantillationBar;
