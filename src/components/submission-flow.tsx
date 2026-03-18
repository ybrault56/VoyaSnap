"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCREEN_ID,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_SECONDS,
} from "@/lib/constants";
import type { Locale, MediaType, Quote } from "@/lib/types";
import type { TravelerDictionary } from "@/lib/dictionaries";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type FileMetadata = {
  width?: number;
  height?: number;
  clipDurationSeconds?: number;
};

type FormState = {
  mediaType: MediaType;
  title: string;
  messageText: string;
  renderDurationSeconds: number;
  repeatEveryMinutes: string;
  requestedWindowStartAt: string;
  requestedWindowEndAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  voucherCode: string;
  rightsAccepted: boolean;
  policyAccepted: boolean;
};

const defaultStart = new Date(Date.now() + 2 * 60 * 60_000);
const defaultEnd = new Date(Date.now() + 5 * 60 * 60_000);

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function useFieldLabels(locale: Locale) {
  const labels: Record<Locale, Record<string, string>> = {
    fr: {
      mediaType: "Type de contenu",
      title: "Titre public",
      message: "Message",
      upload: "Fichier image ou video",
      duration: "Duree de diffusion (secondes)",
      repeat: "Rediffusion tous les",
      start: "Debut de la fenetre",
      end: "Fin de la fenetre",
      customerName: "Nom",
      email: "Email",
      phone: "Telephone",
      voucher: "Code promo",
      rights: "Je certifie disposer des droits de diffusion.",
      policy: "J'accepte la charte de moderation et les CGU.",
      fileHint: "Formats attendus: JPG, PNG, WebP, MP4. Les videos sont diffusees sans audio.",
    },
    en: {
      mediaType: "Content type",
      title: "Public title",
      message: "Message",
      upload: "Image or video file",
      duration: "Playback duration (seconds)",
      repeat: "Repeat every",
      start: "Window start",
      end: "Window end",
      customerName: "Name",
      email: "Email",
      phone: "Phone",
      voucher: "Voucher code",
      rights: "I confirm I own the rights required for public playback.",
      policy: "I accept the moderation rules and platform terms.",
      fileHint: "Accepted formats: JPG, PNG, WebP, MP4. Videos are played muted.",
    },
    ru: {
      mediaType: "Тип контента",
      title: "Публичный заголовок",
      message: "Сообщение",
      upload: "Файл изображения или видео",
      duration: "Длительность показа (сек.)",
      repeat: "Повтор каждые",
      start: "Начало окна",
      end: "Конец окна",
      customerName: "Имя",
      email: "Email",
      phone: "Телефон",
      voucher: "Промокод",
      rights: "Я подтверждаю наличие прав на публичный показ.",
      policy: "Я принимаю правила модерации и условия сервиса.",
      fileHint: "Поддерживаются JPG, PNG, WebP, MP4. Видео воспроизводится без звука.",
    },
    "zh-Hans": {
      mediaType: "内容类型",
      title: "公开标题",
      message: "文字内容",
      upload: "图片或视频文件",
      duration: "播放时长（秒）",
      repeat: "每隔多久重播",
      start: "开始时间",
      end: "结束时间",
      customerName: "姓名",
      email: "邮箱",
      phone: "电话",
      voucher: "优惠码",
      rights: "我确认拥有公开展示所需的内容权利。",
      policy: "我接受审核规则和平台条款。",
      fileHint: "支持 JPG、PNG、WebP、MP4。视频将静音播放。",
    },
    es: {
      mediaType: "Tipo de contenido",
      title: "Titulo publico",
      message: "Mensaje",
      upload: "Archivo de imagen o video",
      duration: "Duracion de emision (segundos)",
      repeat: "Repetir cada",
      start: "Inicio de ventana",
      end: "Fin de ventana",
      customerName: "Nombre",
      email: "Email",
      phone: "Telefono",
      voucher: "Codigo promocional",
      rights: "Confirmo que tengo los derechos necesarios para la difusion.",
      policy: "Acepto las reglas de moderacion y las condiciones del servicio.",
      fileHint: "Formatos aceptados: JPG, PNG, WebP, MP4. Los videos se reproducen sin audio.",
    },
  };

  return labels[locale];
}

async function inspectFile(file: File): Promise<FileMetadata> {
  if (file.type.startsWith("image/")) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Image metadata could not be read."));
        element.src = objectUrl;
      });
      return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  if (file.type.startsWith("video/")) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const video = await new Promise<HTMLVideoElement>((resolve, reject) => {
        const element = document.createElement("video");
        element.preload = "metadata";
        element.onloadedmetadata = () => resolve(element);
        element.onerror = () => reject(new Error("Video metadata could not be read."));
        element.src = objectUrl;
      });
      return {
        width: video.videoWidth,
        height: video.videoHeight,
        clipDurationSeconds: video.duration,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return {};
}

export function SubmissionFlow({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: TravelerDictionary;
}) {
  const router = useRouter();
  const labels = useFieldLabels(locale);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>({
    mediaType: "image",
    title: "",
    messageText: "",
    renderDurationSeconds: 10,
    repeatEveryMinutes: "",
    requestedWindowStartAt: toLocalInputValue(defaultStart),
    requestedWindowEndAt: toLocalInputValue(defaultEnd),
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    voucherCode: "",
    rightsAccepted: false,
    policyAccepted: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);

  useEffect(() => {
    const requestedWindowStartAt = toIsoFromLocal(form.requestedWindowStartAt);
    const requestedWindowEndAt = toIsoFromLocal(form.requestedWindowEndAt);
    const needsUpload = form.mediaType !== "message";

    if (!requestedWindowStartAt || !requestedWindowEndAt) {
      setQuote(null);
      return;
    }

    if (needsUpload && !selectedFile) {
      setQuote(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setIsQuoting(true);
        setQuoteError(null);
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            screenId: DEFAULT_SCREEN_ID,
            mediaType: form.mediaType,
            renderDurationSeconds: form.renderDurationSeconds,
            repeatEveryMinutes: form.repeatEveryMinutes ? Number(form.repeatEveryMinutes) : null,
            requestedWindowStartAt,
            requestedWindowEndAt,
            voucherCode: form.voucherCode || undefined,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Quote request failed.");
        }
        setQuote(payload.quote as Quote);
      } catch (error) {
        setQuote(null);
        setQuoteError(error instanceof Error ? error.message : "Quote request failed.");
      } finally {
        setIsQuoting(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    form.mediaType,
    form.renderDurationSeconds,
    form.repeatEveryMinutes,
    form.requestedWindowStartAt,
    form.requestedWindowEndAt,
    form.voucherCode,
    locale,
    selectedFile,
  ]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setFileMetadata({});
    setFileError(null);

    if (!nextFile) {
      return;
    }

    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setFileError(`File is too large. Max allowed size: ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
      setSelectedFile(null);
      return;
    }

    try {
      const metadata = await inspectFile(nextFile);
      if (metadata.clipDurationSeconds && metadata.clipDurationSeconds > MAX_VIDEO_SECONDS) {
        setFileError(`Video is too long. Max supported duration: ${MAX_VIDEO_SECONDS}s.`);
        setSelectedFile(null);
        return;
      }
      setFileMetadata(metadata);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "File inspection failed.");
      setSelectedFile(null);
    }
  }

  async function uploadFile(file: File) {
    const presignResponse = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
      }),
    });
    const presignPayload = await presignResponse.json();
    if (!presignResponse.ok) {
      throw new Error(presignPayload.error ?? "Upload preparation failed.");
    }

    const uploadResponse = await fetch(presignPayload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Binary upload failed.");
    }

    return presignPayload.storageKey as string;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (form.mediaType !== "message" && !selectedFile) {
      setSubmitError("A file is required for image and video orders.");
      return;
    }

    const requestedWindowStartAt = toIsoFromLocal(form.requestedWindowStartAt);
    const requestedWindowEndAt = toIsoFromLocal(form.requestedWindowEndAt);

    if (!requestedWindowStartAt || !requestedWindowEndAt) {
      setSubmitError("Please provide a valid scheduling window.");
      return;
    }

    try {
      setIsSubmitting(true);
      let storageKey: string | undefined;
      if (selectedFile) {
        storageKey = await uploadFile(selectedFile);
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          screenId: DEFAULT_SCREEN_ID,
          mediaType: form.mediaType,
          title: form.title,
          messageText: form.mediaType === "message" ? form.messageText : undefined,
          storageKey,
          originalFileName: selectedFile?.name,
          mimeType: selectedFile?.type,
          fileSizeBytes: selectedFile?.size,
          width: fileMetadata.width,
          height: fileMetadata.height,
          clipDurationSeconds: fileMetadata.clipDurationSeconds,
          renderDurationSeconds: form.renderDurationSeconds,
          repeatEveryMinutes: form.repeatEveryMinutes ? Number(form.repeatEveryMinutes) : null,
          requestedWindowStartAt,
          requestedWindowEndAt,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          voucherCode: form.voucherCode || undefined,
          rightsAccepted: form.rightsAccepted,
          policyAccepted: form.policyAccepted,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Order creation failed.");
      }

      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      startTransition(() => {
        router.push(payload.trackingUrl);
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Order creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold uppercase text-amber-700">QR checkout</p>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold text-stone-950 sm:text-4xl">
            {dictionary.submit.title}
          </h1>
          <p className="max-w-3xl text-pretty text-base text-stone-600">
            {dictionary.submit.subtitle}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-stone-700 md:col-span-2">
            <span>{labels.mediaType}</span>
            <select
              value={form.mediaType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mediaType: event.target.value as MediaType,
                }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="message">Message</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700 md:col-span-2">
            <span>{labels.title}</span>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
              placeholder="Sunset memory"
            />
          </label>

          {form.mediaType === "message" ? (
            <label className="space-y-2 text-sm font-medium text-stone-700 md:col-span-2">
              <span>{labels.message}</span>
              <textarea
                required
                rows={5}
                value={form.messageText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, messageText: event.target.value }))
                }
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
                placeholder="Wish you were here."
              />
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium text-stone-700 md:col-span-2">
              <span>{labels.upload}</span>
              <input
                ref={uploadInputRef}
                required
                type="file"
                accept={form.mediaType === "video" ? "video/*" : "image/*"}
                onChange={handleFileChange}
                className="block w-full rounded-2xl border border-dashed border-stone-400 bg-stone-50 px-4 py-4 text-sm text-stone-700"
              />
              <p className="text-pretty text-xs text-stone-500">{labels.fileHint}</p>
              {selectedFile ? (
                <p className="text-xs font-medium text-stone-700">
                  {selectedFile.name} · {Math.round(selectedFile.size / 1024)} KB
                </p>
              ) : null}
              {fileError ? <p className="text-sm text-rose-700">{fileError}</p> : null}
            </label>
          )}

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.duration}</span>
            <select
              value={form.renderDurationSeconds}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  renderDurationSeconds: Number(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            >
              {[5, 10, 15, 20, 30, 45].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds}s
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.repeat}</span>
            <select
              value={form.repeatEveryMinutes}
              onChange={(event) =>
                setForm((current) => ({ ...current, repeatEveryMinutes: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            >
              <option value="">{dictionary.submit.noRepeat}</option>
              {[10, 15, 30, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.start}</span>
            <input
              type="datetime-local"
              value={form.requestedWindowStartAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedWindowStartAt: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.end}</span>
            <input
              type="datetime-local"
              value={form.requestedWindowEndAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedWindowEndAt: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.customerName}</span>
            <input
              required
              value={form.customerName}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerName: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.email}</span>
            <input
              required
              type="email"
              value={form.customerEmail}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerEmail: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.phone}</span>
            <input
              required
              value={form.customerPhone}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerPhone: event.target.value }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>{labels.voucher}</span>
            <input
              value={form.voucherCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, voucherCode: event.target.value.toUpperCase() }))
              }
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 uppercase outline-none transition focus:border-amber-500"
              placeholder={dictionary.submit.voucherPlaceholder}
            />
          </label>
        </div>

        <div className="mt-6 space-y-3 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
          <label className="flex gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.rightsAccepted}
              onChange={(event) =>
                setForm((current) => ({ ...current, rightsAccepted: event.target.checked }))
              }
              className="mt-1 size-4 rounded border-stone-400"
            />
            <span className="text-pretty">{labels.rights}</span>
          </label>
          <label className="flex gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.policyAccepted}
              onChange={(event) =>
                setForm((current) => ({ ...current, policyAccepted: event.target.checked }))
              }
              className="mt-1 size-4 rounded border-stone-400"
            />
            <span className="text-pretty">{labels.policy}</span>
          </label>
        </div>

        {submitError ? <p className="mt-4 text-sm text-rose-700">{submitError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "mt-6 inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400",
            isSubmitting && "cursor-not-allowed opacity-60",
          )}
        >
          {isSubmitting ? "Processing..." : dictionary.submit.payButton}
        </button>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[2rem] border border-stone-300 bg-stone-950 p-6 text-stone-50 shadow-sm">
          <p className="text-sm font-semibold uppercase text-amber-300">{dictionary.submit.quoteTitle}</p>
          <div className="mt-4 space-y-4">
            {quote ? (
              <>
                <div>
                  <p className="text-sm text-stone-300">{dictionary.submit.total}</p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
                    {formatCurrency(quote.breakdown.totalCents, quote.currency)}
                  </p>
                </div>
                <dl className="space-y-3 text-sm text-stone-200">
                  <div className="flex items-center justify-between gap-4">
                    <dt>{dictionary.submit.occurrences}</dt>
                    <dd className="tabular-nums">{quote.breakdown.estimatedOccurrences}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>{dictionary.submit.eta}</dt>
                    <dd className="text-right tabular-nums">
                      {formatDateTime(quote.estimatedFirstPlayAt, locale === "fr" ? "fr-FR" : "en-US")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Base</dt>
                    <dd className="tabular-nums">{formatCurrency(quote.breakdown.basePriceCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Duration</dt>
                    <dd className="tabular-nums">{formatCurrency(quote.breakdown.durationSurchargeCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Repeat</dt>
                    <dd className="tabular-nums">{formatCurrency(quote.breakdown.repeatSurchargeCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Window coeff.</dt>
                    <dd className="tabular-nums">x{quote.breakdown.timeWindowFactor.toFixed(2)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Occupancy coeff.</dt>
                    <dd className="tabular-nums">x{quote.breakdown.occupancyFactor.toFixed(2)}</dd>
                  </div>
                </dl>
                <p className="text-pretty text-xs text-stone-400">
                  Labels: {quote.breakdown.labels.join(" / ")} · Occupancy {(quote.breakdown.occupancyRatio * 100).toFixed(0)}%
                </p>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-stone-700 bg-stone-900 p-4 text-sm text-stone-300">
                {isQuoting ? "Pricing..." : "Fill the form to compute an instant quote."}
              </div>
            )}
            {quoteError ? <p className="text-sm text-rose-300">{quoteError}</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-amber-700">Ops notes</p>
          <ul className="mt-4 space-y-3 text-pretty text-sm text-stone-600">
            <li>Stripe Checkout is used automatically when environment keys are configured.</li>
            <li>Without Stripe keys, payment is simulated so the end-to-end flow remains testable.</li>
            <li>Videos are always played muted on the public screen.</li>
          </ul>
        </section>
      </aside>
    </form>
  );
}
