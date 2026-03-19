ALTER TABLE "PricingRule"
ADD COLUMN "minimumRenderDurationSeconds" INTEGER,
ADD COLUMN "minimumRepeatMinutes" INTEGER,
ADD COLUMN "maximumDynamicUpliftPercent" INTEGER,
ADD COLUMN "promoVideoUrl" TEXT,
ADD COLUMN "promoPosterUrl" TEXT;

UPDATE "PricingRule"
SET
  "minimumRenderDurationSeconds" = GREATEST("durationStepSeconds", 10),
  "minimumRepeatMinutes" = 10,
  "maximumDynamicUpliftPercent" = 25
WHERE
  "minimumRenderDurationSeconds" IS NULL
  OR "minimumRepeatMinutes" IS NULL
  OR "maximumDynamicUpliftPercent" IS NULL;

ALTER TABLE "PricingRule"
ALTER COLUMN "minimumRenderDurationSeconds" SET NOT NULL,
ALTER COLUMN "minimumRepeatMinutes" SET NOT NULL,
ALTER COLUMN "maximumDynamicUpliftPercent" SET NOT NULL;
