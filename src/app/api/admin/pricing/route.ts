import { NextResponse } from "next/server";
import { mutateState } from "@/lib/store";
import { updatePricing } from "@/lib/workflow";
import { pricingUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = pricingUpdateSchema.safeParse({
    actorRole: formData.get("actorRole"),
    reviewerName: formData.get("reviewerName"),
    imageBaseCents: Number(formData.get("imageBaseCents")),
    videoBaseCents: Number(formData.get("videoBaseCents")),
    messageBaseCents: Number(formData.get("messageBaseCents")),
    durationStepCents: Number(formData.get("durationStepCents")),
    repeatPlayCents: Number(formData.get("repeatPlayCents")),
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
      },
      parsed.data.reviewerName,
    ),
  );

  if (!result) {
    return NextResponse.json({ error: "Pricing rule not found." }, { status: 404 });
  }

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}