import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { mutateState } from "@/lib/store";
import { pricingUpdateSchema } from "@/lib/validation";
import { updatePricing } from "@/lib/workflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession("ops_admin");
  if ("error" in auth) {
    return auth.error;
  }

  const formData = await request.formData();
  const timeBandCount = Number(formData.get("timeBandCount") ?? 0);
  const getString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = pricingUpdateSchema.safeParse({
    imageBaseCents: Number(formData.get("imageBaseCents")),
    videoBaseCents: Number(formData.get("videoBaseCents")),
    messageBaseCents: Number(formData.get("messageBaseCents")),
    durationStepCents: Number(formData.get("durationStepCents")),
    repeatPlayCents: Number(formData.get("repeatPlayCents")),
    minimumRenderDurationSeconds: Number(formData.get("minimumRenderDurationSeconds")),
    minimumRepeatMinutes: Number(formData.get("minimumRepeatMinutes")),
    maximumDynamicUpliftPercent: Number(formData.get("maximumDynamicUpliftPercent")),
    promoVideoUrl: getString("promoVideoUrl"),
    promoPosterUrl: getString("promoPosterUrl"),
    timeBands: Array.from({ length: timeBandCount }, (_, index) => ({
      label: getString(`timeBands.${index}.label`),
      trafficLabel: getString(`timeBands.${index}.trafficLabel`),
      startHour: Number(formData.get(`timeBands.${index}.startHour`)),
      endHour: Number(formData.get(`timeBands.${index}.endHour`)),
      baseUpliftPercent: Number(formData.get(`timeBands.${index}.baseUpliftPercent`)),
      maxSellableRatio:
        Number(formData.get(`timeBands.${index}.maxSellablePercent`)) / 100,
    })),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid pricing payload." }, { status: 400 });
  }

  const result = await mutateState((state) =>
    updatePricing(
      state,
      {
        imageBaseCents: parsed.data.imageBaseCents,
        videoBaseCents: parsed.data.videoBaseCents,
        messageBaseCents: parsed.data.messageBaseCents,
        durationStepCents: parsed.data.durationStepCents,
        repeatPlayCents: parsed.data.repeatPlayCents,
        minimumRenderDurationSeconds: parsed.data.minimumRenderDurationSeconds,
        minimumRepeatMinutes: parsed.data.minimumRepeatMinutes,
        maximumDynamicUpliftPercent: parsed.data.maximumDynamicUpliftPercent,
        promoVideoUrl: parsed.data.promoVideoUrl,
        promoPosterUrl: parsed.data.promoPosterUrl,
        timeBands: parsed.data.timeBands.map((band) => ({
          ...band,
          factor: 1 + band.baseUpliftPercent / 100,
        })),
      },
      auth.session.name,
    ),
  );

  if (!result) {
    return NextResponse.json({ error: "Pricing rule not found." }, { status: 404 });
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
