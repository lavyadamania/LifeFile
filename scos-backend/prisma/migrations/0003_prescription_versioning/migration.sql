-- Add currentVersion field to Prescription
ALTER TABLE "Prescription" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- Create PrescriptionVersion table
CREATE TABLE "PrescriptionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescriptionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentText" TEXT,
    "instructions" TEXT,
    "pdfAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "PrescriptionVersion_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE CASCADE,
    CONSTRAINT "PrescriptionVersion_pdfAttachmentId_fkey" FOREIGN KEY ("pdfAttachmentId") REFERENCES "Attachment" ("id")
);

-- Create unique constraint for prescriptionId + version
CREATE UNIQUE INDEX "PrescriptionVersion_prescriptionId_version_key" ON "PrescriptionVersion"("prescriptionId", "version");

-- Create indexes for common queries
CREATE INDEX "PrescriptionVersion_prescriptionId_idx" ON "PrescriptionVersion"("prescriptionId");
CREATE INDEX "PrescriptionVersion_createdAt_idx" ON "PrescriptionVersion"("createdAt");
