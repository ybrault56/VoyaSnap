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
    promoVideoUrl?: string;
    promoPosterUrl?: string;
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
    <div className="min-h-dvh bg-[#040816] text-slate-100">
      <div className="flex min-h-dvh flex-col justify-between p-4 sm:p-6">
        <header className="app-divider flex items-start justify-between gap-4 border-b pb-4 text-sm">
          <div>
            <p className="app-kicker text-sm font-semibold uppercase">Screen Me player</p>
            <p className="mt-1 text-pretty app-text-muted">
              {feed?.screen.name ?? "Main screen"} - {feed?.screen.locationLabel ?? "Tourist street"}
            </p>
          </div>
          <div className="app-chip rounded-full px-4 py-2 tabular-nums">
            {feed?.device.status ?? "offline"}
          </div>
        </header>

        <main className="grid flex-1 place-items-center py-6">
          {activeEntry ? (
            <div className="flex w-full max-w-[1440px] flex-col gap-4">
              <div className="app-shell rounded-[2.5rem] p-3 sm:p-5">
                <div className="app-player-stage mx-auto overflow-hidden rounded-[2rem] bg-black/70">
                  {activeEntry.renderType === "message" ? (
                    <div className="flex size-full flex-col justify-between bg-[#07101d] p-6 sm:p-10">
                      <p className="app-kicker text-sm font-semibold uppercase">Postcard</p>
                      <p className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-slate-50 sm:text-6xl">
                        {activeEntry.title}
                      </p>
                      <p className="max-w-4xl text-pretty text-xl leading-relaxed text-slate-200 sm:text-3xl">
                        {activeEntry.messageText}
                      </p>
                    </div>
                  ) : activeEntry.renderType === "video" ? (
                    <video
                      key={activeEntry.signedUrl}
                      src={activeEntry.signedUrl}
                      className="size-full bg-black object-contain"
                      autoPlay
                      muted
                      controls={false}
                      playsInline
                    />
                  ) : (
                    <div className="relative size-full bg-black">
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
              </div>
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-slate-100">{activeEntry.title}</p>
                <p className="tabular-nums app-text-muted">
                  {new Date(activeEntry.startAt).toLocaleTimeString()} {"->"}{" "}
                  {new Date(activeEntry.endAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-[1440px] flex-col gap-4">
              <div className="app-shell rounded-[2.5rem] p-3 sm:p-5">
                <div className="app-player-stage relative mx-auto overflow-hidden rounded-[2rem] bg-black/80">
                  {feed?.fallback.promoVideoUrl ? (
                    <>
                      <video
                        key={feed.fallback.promoVideoUrl}
                        src={feed.fallback.promoVideoUrl}
                        poster={feed.fallback.promoPosterUrl}
                        className="size-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/45" />
                    </>
                  ) : null}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                    <p className="app-kicker text-sm font-semibold uppercase">Auto promo</p>
                    <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold text-slate-50 sm:text-6xl">
                      {feed?.fallback.headline ?? "Share your memory"}
                    </h1>
                    <p className="mt-4 max-w-3xl text-pretty text-lg app-text-muted sm:text-2xl">
                      {feed?.fallback.body ?? "Scan the QR code to book your next public memory."}
                    </p>
                    {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-divider flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular-nums app-text-muted">Queue size: {feed?.entries.length ?? 0}</p>
          <p className="text-pretty app-text-muted">
            Next: {nextEntry?.title ?? "No scheduled content"}
          </p>
        </footer>
      </div>
    </div>
  );
}
