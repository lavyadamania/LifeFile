-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN', 'CLINIC_STAFF');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "QueueTokenStatus" AS ENUM ('WAITING', 'CALLED', 'SKIPPED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QueueState" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('FULL_HISTORY', 'SELECTED_RECORDS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT', 'QUEUE', 'RECORD_ACCESS', 'PRESCRIPTION', 'LAB', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'FINAL', 'AMENDED');

-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('DIRECT', 'SHARE_LINK', 'QR_TOKEN', 'EMERGENCY_OVERRIDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specializationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicDoctor" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "qualifications" TEXT NOT NULL,
    "biography" TEXT,
    "languages" JSONB,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "emergencyContact" TEXT,
    "governmentId" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "reason" TEXT,
    "cancellationReason" TEXT,
    "cancellationPolicy" TEXT,
    "rescheduledFromId" TEXT,
    "emergencyPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkIn" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT,
    "patientId" TEXT,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT,
    "reason" TEXT,
    "emergencyPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQueue" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "queueDate" TIMESTAMP(3) NOT NULL,
    "status" "QueueState" NOT NULL DEFAULT 'ACTIVE',
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "doctorDelayMins" INTEGER NOT NULL DEFAULT 0,
    "currentTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueToken" (
    "id" TEXT NOT NULL,
    "liveQueueId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "walkInId" TEXT,
    "patientId" TEXT,
    "tokenNumber" INTEGER NOT NULL,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "estimatedWaitMins" INTEGER NOT NULL DEFAULT 0,
    "status" "QueueTokenStatus" NOT NULL DEFAULT 'WAITING',
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "summary" TEXT,
    "followUpAt" TIMESTAMP(3),
    "durationMins" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "consultationLogId" TEXT,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "notes" TEXT,
    "prescriptionSummary" TEXT,
    "followUpInstructions" TEXT,
    "conditionTag" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "consultationLogId" TEXT,
    "medicalRecordId" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "medicalRecordId" TEXT,
    "labTestId" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "medicalRecordId" TEXT,
    "labReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRecordPermission" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "accessMethod" "AccessMethod" NOT NULL DEFAULT 'DIRECT',
    "medicalRecordId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRecordPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "clinicDoctorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedSlot" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "clinicDoctorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyFlag" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "contraindications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineConflict" (
    "id" TEXT NOT NULL,
    "medicineAId" TEXT NOT NULL,
    "medicineBId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "warning" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_licenseNumber_key" ON "Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_specializationId_idx" ON "Doctor"("specializationId");

-- CreateIndex
CREATE INDEX "Doctor_userId_idx" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicAdmin_userId_key" ON "ClinicAdmin"("userId");

-- CreateIndex
CREATE INDEX "ClinicAdmin_clinicId_idx" ON "ClinicAdmin"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_code_key" ON "Clinic"("code");

-- CreateIndex
CREATE INDEX "Clinic_name_idx" ON "Clinic"("name");

-- CreateIndex
CREATE INDEX "Clinic_city_idx" ON "Clinic"("city");

-- CreateIndex
CREATE INDEX "ClinicDoctor_doctorId_idx" ON "ClinicDoctor"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicDoctor_clinicId_idx" ON "ClinicDoctor"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicDoctor_clinicId_doctorId_key" ON "ClinicDoctor"("clinicId", "doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialization_name_key" ON "Specialization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_doctorId_key" ON "DoctorProfile"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_patientId_key" ON "PatientProfile"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_startsAt_idx" ON "Appointment"("doctorId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_startsAt_idx" ON "Appointment"("clinicId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "WalkIn_clinicId_createdAt_idx" ON "WalkIn"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "WalkIn_doctorId_idx" ON "WalkIn"("doctorId");

-- CreateIndex
CREATE INDEX "WalkIn_patientId_idx" ON "WalkIn"("patientId");

-- CreateIndex
CREATE INDEX "LiveQueue_doctorId_queueDate_idx" ON "LiveQueue"("doctorId", "queueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LiveQueue_clinicId_doctorId_queueDate_key" ON "LiveQueue"("clinicId", "doctorId", "queueDate");

-- CreateIndex
CREATE INDEX "QueueToken_liveQueueId_status_priorityScore_idx" ON "QueueToken"("liveQueueId", "status", "priorityScore");

-- CreateIndex
CREATE INDEX "QueueToken_appointmentId_idx" ON "QueueToken"("appointmentId");

-- CreateIndex
CREATE INDEX "QueueToken_walkInId_idx" ON "QueueToken"("walkInId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_liveQueueId_tokenNumber_key" ON "QueueToken"("liveQueueId", "tokenNumber");

-- CreateIndex
CREATE INDEX "ConsultationLog_patientId_startedAt_idx" ON "ConsultationLog"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "ConsultationLog_doctorId_startedAt_idx" ON "ConsultationLog"("doctorId", "startedAt");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientId_recordDate_idx" ON "MedicalRecord"("patientId", "recordDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_doctorId_recordDate_idx" ON "MedicalRecord"("doctorId", "recordDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_conditionTag_idx" ON "MedicalRecord"("conditionTag");

-- CreateIndex
CREATE INDEX "Prescription_patientId_createdAt_idx" ON "Prescription"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_createdAt_idx" ON "Prescription"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_medicineId_idx" ON "PrescriptionItem"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_code_key" ON "LabTest"("code");

-- CreateIndex
CREATE INDEX "LabTest_name_idx" ON "LabTest"("name");

-- CreateIndex
CREATE INDEX "LabOrder_patientId_orderedAt_idx" ON "LabOrder"("patientId", "orderedAt");

-- CreateIndex
CREATE INDEX "LabOrder_doctorId_orderedAt_idx" ON "LabOrder"("doctorId", "orderedAt");

-- CreateIndex
CREATE INDEX "LabOrder_status_idx" ON "LabOrder"("status");

-- CreateIndex
CREATE INDEX "LabReport_labOrderId_idx" ON "LabReport"("labOrderId");

-- CreateIndex
CREATE INDEX "LabReport_status_idx" ON "LabReport"("status");

-- CreateIndex
CREATE INDEX "Attachment_medicalRecordId_idx" ON "Attachment"("medicalRecordId");

-- CreateIndex
CREATE INDEX "Attachment_labReportId_idx" ON "Attachment"("labReportId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE INDEX "Review_doctorId_createdAt_idx" ON "Review"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientRecordPermission_patientId_doctorId_isRevoked_idx" ON "PatientRecordPermission"("patientId", "doctorId", "isRevoked");

-- CreateIndex
CREATE INDEX "PatientRecordPermission_expiresAt_idx" ON "PatientRecordPermission"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_createdAt_idx" ON "AuditLog"("resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_clinicDoctorId_startsAt_idx" ON "AvailabilitySlot"("clinicDoctorId", "startsAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_clinicId_startsAt_idx" ON "AvailabilitySlot"("clinicId", "startsAt");

-- CreateIndex
CREATE INDEX "BlockedSlot_clinicDoctorId_startsAt_idx" ON "BlockedSlot"("clinicDoctorId", "startsAt");

-- CreateIndex
CREATE INDEX "BlockedSlot_clinicId_startsAt_idx" ON "BlockedSlot"("clinicId", "startsAt");

-- CreateIndex
CREATE INDEX "EmergencyFlag_clinicId_isActive_idx" ON "EmergencyFlag"("clinicId", "isActive");

-- CreateIndex
CREATE INDEX "EmergencyFlag_patientId_isActive_idx" ON "EmergencyFlag"("patientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineCatalog_code_key" ON "MedicineCatalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineCatalog_name_key" ON "MedicineCatalog"("name");

-- CreateIndex
CREATE INDEX "MedicineCatalog_name_idx" ON "MedicineCatalog"("name");

-- CreateIndex
CREATE INDEX "MedicineConflict_medicineAId_idx" ON "MedicineConflict"("medicineAId");

-- CreateIndex
CREATE INDEX "MedicineConflict_medicineBId_idx" ON "MedicineConflict"("medicineBId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineConflict_medicineAId_medicineBId_key" ON "MedicineConflict"("medicineAId", "medicineBId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionToken_tokenHash_key" ON "SessionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SessionToken_userId_expiresAt_idx" ON "SessionToken"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAdmin" ADD CONSTRAINT "ClinicAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAdmin" ADD CONSTRAINT "ClinicAdmin_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicDoctor" ADD CONSTRAINT "ClinicDoctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicDoctor" ADD CONSTRAINT "ClinicDoctor_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkIn" ADD CONSTRAINT "WalkIn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQueue" ADD CONSTRAINT "LiveQueue_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQueue" ADD CONSTRAINT "LiveQueue_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_liveQueueId_fkey" FOREIGN KEY ("liveQueueId") REFERENCES "LiveQueue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_walkInId_fkey" FOREIGN KEY ("walkInId") REFERENCES "WalkIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_consultationLogId_fkey" FOREIGN KEY ("consultationLogId") REFERENCES "ConsultationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationLogId_fkey" FOREIGN KEY ("consultationLogId") REFERENCES "ConsultationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_labReportId_fkey" FOREIGN KEY ("labReportId") REFERENCES "LabReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRecordPermission" ADD CONSTRAINT "PatientRecordPermission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRecordPermission" ADD CONSTRAINT "PatientRecordPermission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRecordPermission" ADD CONSTRAINT "PatientRecordPermission_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_clinicDoctorId_fkey" FOREIGN KEY ("clinicDoctorId") REFERENCES "ClinicDoctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_clinicDoctorId_fkey" FOREIGN KEY ("clinicDoctorId") REFERENCES "ClinicDoctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFlag" ADD CONSTRAINT "EmergencyFlag_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyFlag" ADD CONSTRAINT "EmergencyFlag_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineConflict" ADD CONSTRAINT "MedicineConflict_medicineAId_fkey" FOREIGN KEY ("medicineAId") REFERENCES "MedicineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineConflict" ADD CONSTRAINT "MedicineConflict_medicineBId_fkey" FOREIGN KEY ("medicineBId") REFERENCES "MedicineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionToken" ADD CONSTRAINT "SessionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

