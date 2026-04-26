-- Stage 7: free-typing prescriptions and PDF linkage
ALTER TABLE "Prescription"
ADD COLUMN "contentText" TEXT;

ALTER TABLE "Attachment"
ADD COLUMN "prescriptionId" TEXT;

CREATE INDEX "Attachment_prescriptionId_idx" ON "Attachment"("prescriptionId");

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_prescriptionId_fkey"
FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
