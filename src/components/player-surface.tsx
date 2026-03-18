"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type FeedEntry = {
  slotId: string;
  orderPublicToken: string;
  title: string;
  renderType: "image" | "video" | "message";
  startAt: string;
  endAt: string;
  durationSeconds: number;
  signedUrl?: string;
  messageText?: string;
};

type FeedPayload = {
  screen: {
    name: string;
    locationLabel: string;
  };
  device: {
    status: string;
    lastFeedAt?: string;
  };
  fallback: {
    headline: string;
    body: string;
  };
  now: string;
  entries: FeedEntry[];
};

function pickActiveEntry(entries: FeedEntry[]) {
  const now = Date.now();
  return entries.find((entry) => {
    const start = new Date(entry.startAt).getTime();
    const end = new Date(entry.endAt).getTime();
    return now >= start && now < end;
  });
}

export function PlayerSurface({
  screenId,
  deviceToken,
}: {
  screenId: string;
  deviceToken: string;
}) {
  const [feed, setFeed] = useState<FeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function refreshFeed() {
      try {
        const response = await fetch(
          `/api/player/feed?screenId=${encodeURIComponent(screenId)}&token=${encodeURIComponent(deviceToken)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Feed fetch failed.");
        }
        if (!disposed) {
          setFeed(payload as FeedPayload);
          setError(null);
        }
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : "Feed fetch failed.");
        }
      }
    }

    async function pingHeartbeat() {
      try {
        await fetch("/api/player/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenId, token: deviceToken }),
        });
      } catch {
        // Heartbeat failures are surfaced through feed refresh state.
      }
    }

    void refreshFeed();
    void pingHeartbeat();
    const feedInterval = window.setInterval(() => {
      void refreshFeed();
    }, 5000);
    const heartbeatInterval = window.setInterval(() => {
      void pingHeartbeat();
    }, 15000);

    return () => {
      disposed = true;
      window.clearInterval(feedInterval);
      window.clearInterval(heartbeatInterval);
    };
  }, [screenId, deviceToken]);

  const activeEntry = pickActiveEntry(feed?.entries ?? []);
  const nextEntry = (feed?.entries ?? []).find(
    (entry) => new Date(entry.startAt).getTime() > Date.now(),
  );

  useEffect(() => {
    if (!nextEntry?.signedUrl || nextEntry.renderType !== "image") {
      return;
    }

    const image = new window.Image();
    image.src = nextEntry.signedUrl;
  }, [nextEntry]);

  return (
    <div className="min-h-dvh bg-stone-950 text-stone-50">
      <div className="flex min-h-dvh flex-col justify-between p-6 sm:p-8">
        <header className="flex items-start justify-between gap-4 text-sm text-stone-300">
          <div>
            <p className="font-semibold uppercase text-amber-300">Screen Me player</p>
            <p className="mt-1 text-pretty text-stone-400">
              {feed?.screen.name ?? "Main screen"} · {feed?.screen.locationLabel ?? "Tourist street"}
            </p>
          </div>
          <div className="rounded-full border border-stone-700 px-4 py-2 tabular-nums text-stone-200">
            {feed?.device.status ?? "offline"}
          </div>
        </header>

        <main className="grid flex-1 place-items-center py-8">
          {activeEntry ? (
            <div className="flex w-full max-w-6xl flex-col gap-6">
              <div className="rounded-[2.5rem] border border-stone-800 bg-stone-900 p-4 shadow-2xl shadow-black/30 sm:p-8">
                {activeEntry.renderType === "message" ? (
                  <div className="flex min-h-[55dvh] flex-col justify-between rounded-[2rem] border border-amber-400/30 bg-stone-950 p-8 sm:p-12">
                    <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Postcard</p>
                    <p className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
                      {activeEntry.title}
                    </p>
                    <p className="max-w-4xl text-pretty text-xl leading-relaxed text-stone-200 sm:text-3xl">
                      {activeEntry.messageText}
                    </p>
                  </div>
                ) : activeEntry.renderType === "video" ? (
                  <video
                    key={activeEntry.signedUrl}
                    src={activeEntry.signedUrl}
                    className="h-[55dvh] w-full rounded-[2rem] bg-black object-contain"
                    autoPlay
                    muted
                    controls={false}
                    playsInline
                  />
                ) : (
                  <div className="relative h-[55dvh] w-full overflow-hidden rounded-[2rem] bg-black">
                    <Image
                      src={activeEntry.signedUrl ?? ""}
                      alt={activeEntry.title}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 text-sm text-stone-300 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-white">{activeEntry.title}</p>
                <p className="tabular-nums">
                  {new Date(activeEntry.startAt).toLocaleTimeString()} → {new Date(activeEntry.endAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl rounded-[2.5rem] border border-stone-800 bg-stone-900 p-8 text-center shadow-2xl shadow-black/30 sm:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Fallback</p>
              <h1 className="mt-6 text-balance text-4xl font-semibold text-white sm:text-6xl">
                {feed?.fallback.headline ?? "Share your memory"}
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg text-stone-300 sm:text-2xl">
                {feed?.fallback.body ?? "Scan the QR code to book your next public memory."}
              </p>
              {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}
            </div>
          )}
        </main>

        <footer className="flex flex-col gap-3 border-t border-stone-800 pt-5 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular-nums">Queue size: {feed?.entries.length ?? 0}</p>
          <p className="text-pretty">Next: {nextEntry?.title ?? "No scheduled content"}</p>
        </footer>
      </div>
    </div>
  );
}