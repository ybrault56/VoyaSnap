"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCREEN_ID,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_SECONDS,
} from "@/lib/constants";
import type { TravelerDictionary } from "@/lib/dictionaries";
import type { Locale, MediaType, Quote, TravelerCheckoutSettings } from "@/lib/types";
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

function localeToFormat(locale: Locale) {
  switch (locale) {
    case "en":
      return "en-US";
    case "ru":
      return "ru-RU";
    case "zh-Hans":
      return "zh-CN";
    case "es":
      return "es-ES";
    case "fr":
    default:
      return "fr-FR";
  }
}

function useFieldLabels(locale: Locale, settings: TravelerCheckoutSettings) {
  const labels: Record<
    Locale,
    {
      mediaType: string;
      title: string;
      message: string;
      upload: string;
      duration: string;
      repeat: string;
      start: string;
      end: string;
      customerName: string;
      email: string;
      phone: string;
      voucher: string;
      rights: string;
      policy: string;
      fileHint: string;
      quoteWaiting: string;
      traffic: string;
      demand: string;
      reserve: string;
      minRule: string;
      upliftCap: string;
      dynamicPrice: string;
      base: string;
      durationFee: string;
      repeatFee: string;
    }
  > = {
    fr: {
      mediaType: "Type de contenu",
      title: "Titre public",
      message: "Message",
      upload: "Fichier image ou video",
      duration: "Duree de diffusion (secondes)",
      repeat: "Rediffusion",
      start: "Debut de la fenetre",
      end: "Fin de la fenetre",
      customerName: "Nom",
      email: "Email",
      phone: "Telephone",
      voucher: "Code promo",
      rights: "Je certifie disposer des droits de diffusion.",
      policy: "J'accepte la charte de moderation et les CGU.",
      fileHint: "Formats attendus : JPG, PNG, WebP, MP4. Les videos sont diffusees sans audio.",
      quoteWaiting: "Remplissez le formulaire pour calculer un devis instantane.",
      traffic: "Trafic actuel",
      demand: "Variation en direct",
      reserve: "Reserve auto-promo",
      minRule: `Diffusion minimum ${settings.minimumRenderDurationSeconds}s. Repetition conseillée a partir de ${settings.minimumRepeatMinutes} min.`,
      upliftCap: `Hausse plafonnee a +${settings.maximumDynamicUpliftPercent}%`,
      dynamicPrice: "Tarif dynamique",
      base: "Base",
      durationFee: "Duree",
      repeatFee: "Rediffusion",
    },
    en: {
      mediaType: "Content type",
      title: "Public title",
      message: "Message",
      upload: "Image or video file",
      duration: "Playback duration (seconds)",
      repeat: "Repeat",
      start: "Window start",
      end: "Window end",
      customerName: "Name",
      email: "Email",
      phone: "Phone",
      voucher: "Voucher code",
      rights: "I confirm I own the rights required for public playback.",
      policy: "I accept the moderation rules and platform terms.",
      fileHint: "Accepted formats: JPG, PNG, WebP, MP4. Videos are played muted.",
      quoteWaiting: "Fill the form to compute an instant quote.",
      traffic: "Current traffic",
      demand: "Live variation",
      reserve: "Promo reserve",
      minRule: `Minimum playback ${settings.minimumRenderDurationSeconds}s. Recommended replay from ${settings.minimumRepeatMinutes} min.`,
      upliftCap: `Dynamic uplift capped at +${settings.maximumDynamicUpliftPercent}%`,
      dynamicPrice: "Dynamic pricing",
      base: "Base",
      durationFee: "Duration",
      repeatFee: "Repeat",
    },
    ru: {
      mediaType: "Тип контента",
      title: "Публичный заголовок",
      message: "Сообщение",
      upload: "Файл изображения или видео",
      duration: "Длительность показа (сек.)",
      repeat: "Повтор",
      start: "Начало окна",
      end: "Конец окна",
      customerName: "Имя",
      email: "Email",
      phone: "Телефон",
      voucher: "Промокод",
      rights: "Я подтверждаю наличие прав на публичный показ.",
      policy: "Я принимаю правила модерации и условия сервиса.",
      fileHint: "Поддерживаются JPG, PNG, WebP, MP4. Видео воспроизводится без звука.",
      quoteWaiting: "Заполните форму, чтобы получить мгновенный расчет.",
      traffic: "Текущий трафик",
      demand: "Живая надбавка",
      reserve: "Резерв под промо",
      minRule: `Минимальный показ ${settings.minimumRenderDurationSeconds} с. Повтор рекомендуется от ${settings.minimumRepeatMinutes} мин.`,
      upliftCap: `Рост цены ограничен +${settings.maximumDynamicUpliftPercent}%`,
      dynamicPrice: "Динамическая цена",
      base: "База",
      durationFee: "Длительность",
      repeatFee: "Повтор",
    },
    "zh-Hans": {
      mediaType: "内容类型",
      title: "公开标题",
      message: "消息内容",
      upload: "图片或视频文件",
      duration: "播放时长（秒）",
      repeat: "重复播放",
      start: "开始时间",
      end: "结束时间",
      customerName: "姓名",
      email: "邮箱",
      phone: "电话",
      voucher: "优惠码",
      rights: "我确认拥有公开播放所需的内容权利。",
      policy: "我接受审核规则和平台条款。",
      fileHint: "支持 JPG、PNG、WebP、MP4，视频将静音播放。",
      quoteWaiting: "填写表单后即可获得即时报价。",
      traffic: "当前流量",
      demand: "实时浮动",
      reserve: "自推广预留",
      minRule: `最短播放 ${settings.minimumRenderDurationSeconds} 秒，建议重复间隔不少于 ${settings.minimumRepeatMinutes} 分钟。`,
      upliftCap: `价格涨幅最高 +${settings.maximumDynamicUpliftPercent}%`,
      dynamicPrice: "动态定价",
      base: "基础价",
      durationFee: "时长",
      repeatFee: "重播",
    },
    es: {
      mediaType: "Tipo de contenido",
      title: "Titulo publico",
      message: "Mensaje",
      upload: "Archivo de imagen o video",
      duration: "Duracion de emision (segundos)",
      repeat: "Repeticion",
      start: "Inicio de ventana",
      end: "Fin de ventana",
      customerName: "Nombre",
      email: "Email",
      phone: "Telefono",
      voucher: "Codigo promocional",
      rights: "Confirmo que tengo los derechos necesarios para la difusion.",
      policy: "Acepto las reglas de moderacion y las condiciones del servicio.",
      fileHint: "Formatos aceptados: JPG, PNG, WebP, MP4. Los videos se reproducen sin audio.",
      quoteWaiting: "Completa el formulario para calcular un presupuesto instantaneo.",
      traffic: "Trafico actual",
      demand: "Variacion en vivo",
      reserve: "Reserva auto promo",
      minRule: `Emision minima ${settings.minimumRenderDurationSeconds}s. Repeticion recomendada a partir de ${settings.minimumRepeatMinutes} min.`,
      upliftCap: `Subida limitada a +${settings.maximumDynamicUpliftPercent}%`,
      dynamicPrice: "Tarifa dinamica",
      base: "Base",
      durationFee: "Duracion",
      repeatFee: "Repeticion",
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
  checkoutSettings,
}: {
  locale: Locale;
  dictionary: TravelerDictionary;
  checkoutSettings: TravelerCheckoutSettings;
}) {
  const router = useRouter();
  const labels = useFieldLabels(locale, checkoutSettings);
  const [form, setForm] = useState<FormState>({
    mediaType: "image",
    title: "",
    messageText: "",
    renderDurationSeconds: checkoutSettings.minimumRenderDurationSeconds,
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
          headers: { "Content-Type": "application/json" },
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
      setFileError(
        `File is too large. Max allowed size: ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      );
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
      headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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

  const fieldClass = "app-input w-full rounded-2xl px-4 py-3";
  const sectionLabelClass = "space-y-2 text-sm font-medium text-slate-200";
  const formatLocale = localeToFormat(locale);

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <aside className="order-first space-y-6 lg:order-last lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-[2rem] app-shell p-6 text-slate-50">
          <p className="app-kicker text-sm font-semibold uppercase">{dictionary.submit.quoteTitle}</p>
          <div className="mt-4 space-y-4">
            {quote ? (
              <>
                <div className="rounded-[1.5rem] border border-cyan-400/20 bg-[#07101d] p-4">
                  <p className="text-sm app-text-muted">{dictionary.submit.total}</p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums text-slate-50">
                    {formatCurrency(quote.breakdown.totalCents, quote.currency)}
                  </p>
                  <p className="mt-3 text-sm text-cyan-100">
                    {labels.traffic}: {quote.breakdown.trafficLabel} · {labels.demand}{" "}
                    +{quote.breakdown.dynamicUpliftPercent}%
                  </p>
                </div>

                <dl className="space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{dictionary.submit.occurrences}</dt>
                    <dd className="tabular-nums">{quote.breakdown.estimatedOccurrences}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{dictionary.submit.eta}</dt>
                    <dd className="text-right tabular-nums">
                      {formatDateTime(quote.estimatedFirstPlayAt, formatLocale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{labels.base}</dt>
                    <dd className="tabular-nums">{formatCurrency(quote.breakdown.basePriceCents)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{labels.durationFee}</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(quote.breakdown.durationSurchargeCents)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{labels.repeatFee}</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(quote.breakdown.repeatSurchargeCents)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{labels.dynamicPrice}</dt>
                    <dd className="tabular-nums">+{quote.breakdown.dynamicUpliftPercent}%</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="app-text-muted">{labels.reserve}</dt>
                    <dd className="tabular-nums">
                      {Math.round((1 - quote.breakdown.maxSellableRatio) * 100)}%
                    </dd>
                  </div>
                </dl>

                <div className="rounded-[1.5rem] app-shell-muted p-4 text-sm app-text-muted">
                  {quote.breakdown.trafficLabel} / {quote.breakdown.occupancyLabel} · charge vendable{" "}
                  {(quote.breakdown.occupancyRatio * 100).toFixed(0)}%
                </div>
              </>
            ) : (
              <div className="rounded-[1.5rem] app-shell-muted p-4 text-sm app-text-muted">
                {isQuoting ? "Pricing..." : labels.quoteWaiting}
              </div>
            )}
            {quoteError ? <p className="text-sm text-rose-300">{quoteError}</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] app-shell-muted p-6">
          <p className="app-kicker text-sm font-semibold uppercase">Traffic bands</p>
          <div className="mt-4 space-y-3">
            {checkoutSettings.timeBands.map((band) => (
              <div key={band.label} className="rounded-[1.25rem] border border-white/8 bg-[#07101d] p-4 text-sm">
                <p className="font-medium text-slate-100">
                  {band.label} ({band.startHour}h-{band.endHour}h)
                </p>
                <p className="mt-2 app-text-muted">
                  {band.trafficLabel} · +{band.baseUpliftPercent}% max de base · reserve promo{" "}
                  {Math.round((1 - band.maxSellableRatio) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="rounded-[2rem] app-shell p-6 sm:p-8">
        <div className="mb-6 space-y-3">
          <p className="app-kicker text-sm font-semibold uppercase">QR checkout</p>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold text-slate-50 sm:text-4xl">
            {dictionary.submit.title}
          </h1>
          <p className="max-w-3xl text-pretty text-base app-text-muted">
            {dictionary.submit.subtitle}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="app-chip rounded-full px-3 py-2 text-xs">{labels.minRule}</span>
            <span className="app-chip rounded-full px-3 py-2 text-xs">{labels.upliftCap}</span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className={cn(sectionLabelClass, "md:col-span-2")}>
            <span>{labels.mediaType}</span>
            <select
              value={form.mediaType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mediaType: event.target.value as MediaType,
                }))
              }
              className={fieldClass}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="message">Message</option>
            </select>
          </label>

          <label className={cn(sectionLabelClass, "md:col-span-2")}>
            <span>{labels.title}</span>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className={fieldClass}
              placeholder="Sunset memory"
            />
          </label>

          {form.mediaType === "message" ? (
            <label className={cn(sectionLabelClass, "md:col-span-2")}>
              <span>{labels.message}</span>
              <textarea
                required
                rows={5}
                value={form.messageText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, messageText: event.target.value }))
                }
                className="app-input w-full rounded-2xl px-4 py-3"
                placeholder="Wish you were here."
              />
            </label>
          ) : (
            <label className={cn(sectionLabelClass, "md:col-span-2")}>
              <span>{labels.upload}</span>
              <input
                required
                type="file"
                accept={form.mediaType === "video" ? "video/*" : "image/*"}
                onChange={handleFileChange}
                className="block w-full rounded-2xl border border-dashed border-cyan-400/30 bg-[#07101d] px-4 py-4 text-sm text-slate-200"
              />
              <p className="text-pretty text-xs app-text-muted">{labels.fileHint}</p>
              {selectedFile ? (
                <p className="text-xs font-medium text-cyan-100">
                  {selectedFile.name} - {Math.round(selectedFile.size / 1024)} KB
                </p>
              ) : null}
              {fileError ? <p className="text-sm text-rose-300">{fileError}</p> : null}
            </label>
          )}

          <label className={sectionLabelClass}>
            <span>{labels.duration}</span>
            <select
              value={form.renderDurationSeconds}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  renderDurationSeconds: Number(event.target.value),
                }))
              }
              className={fieldClass}
            >
              {checkoutSettings.durationOptions.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds}s
                </option>
              ))}
            </select>
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.repeat}</span>
            <select
              value={form.repeatEveryMinutes}
              onChange={(event) =>
                setForm((current) => ({ ...current, repeatEveryMinutes: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="">{dictionary.submit.noRepeat}</option>
              {checkoutSettings.repeatOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.start}</span>
            <input
              type="datetime-local"
              value={form.requestedWindowStartAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedWindowStartAt: event.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.end}</span>
            <input
              type="datetime-local"
              value={form.requestedWindowEndAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedWindowEndAt: event.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.customerName}</span>
            <input
              required
              value={form.customerName}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerName: event.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.email}</span>
            <input
              required
              type="email"
              value={form.customerEmail}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerEmail: event.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.phone}</span>
            <input
              required
              value={form.customerPhone}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerPhone: event.target.value }))
              }
              className={fieldClass}
            />
          </label>

          <label className={sectionLabelClass}>
            <span>{labels.voucher}</span>
            <input
              value={form.voucherCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, voucherCode: event.target.value.toUpperCase() }))
              }
              className={cn(fieldClass, "uppercase")}
              placeholder={dictionary.submit.voucherPlaceholder}
            />
          </label>
        </div>

        <div className="mt-6 space-y-3 rounded-[1.5rem] app-shell-muted p-5">
          <label className="flex gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.rightsAccepted}
              onChange={(event) =>
                setForm((current) => ({ ...current, rightsAccepted: event.target.checked }))
              }
              className="mt-1 size-4 rounded border-cyan-400/40 bg-[#07101d]"
            />
            <span className="text-pretty">{labels.rights}</span>
          </label>
          <label className="flex gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.policyAccepted}
              onChange={(event) =>
                setForm((current) => ({ ...current, policyAccepted: event.target.checked }))
              }
              className="mt-1 size-4 rounded border-cyan-400/40 bg-[#07101d]"
            />
            <span className="text-pretty">{labels.policy}</span>
          </label>
        </div>

        {submitError ? <p className="mt-4 text-sm text-rose-300">{submitError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "app-button-primary mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold",
            isSubmitting && "cursor-not-allowed opacity-60",
          )}
        >
          {isSubmitting ? "Processing..." : dictionary.submit.payButton}
        </button>
      </section>
    </form>
  );
}
