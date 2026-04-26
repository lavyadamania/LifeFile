import { Prisma, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

async function getPatientIdByUserId(userId: string): Promise<string> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient account not found');
  }
  return patient.id;
}

async function getDoctorIdByUserId(userId: string): Promise<string> {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor account not found');
  }
  return doctor.id;
}

async function getClinicAdminByUserId(userId: string) {
  return prisma.clinicAdmin.findUnique({ where: { userId } });
}

type PatientProfilePayload = {
  fullName: string;
  dateOfBirth: Date;
  gender?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContact?: string;
  governmentId?: string;
  address?: string;
};

type DoctorProfilePayload = {
  fullName: string;
  specializationId?: string;
  experienceYears: number;
  qualifications: string;
  clinicId?: string;
  consultationFee?: number;
  isPrimary?: boolean;
  biography?: string;
  languages?: string[];
  availability?: Array<{
    clinicId: string;
    startsAt: Date;
    endsAt: Date;
    isRecurring?: boolean;
    recurrenceRule?: string;
  }>;
};

type ClinicAdminProfilePayload = {
  clinicId?: string | null;
};

type PatientProfilePatch = Partial<PatientProfilePayload>;
type DoctorProfilePatch = Partial<DoctorProfilePayload>;
type ClinicAdminProfilePatch = Partial<ClinicAdminProfilePayload>;

function doctorProfileCreateData(body: DoctorProfilePayload) {
  const languages =
    body.languages === undefined
      ? undefined
      : body.languages === null
        ? Prisma.JsonNull
        : (body.languages as Prisma.InputJsonValue);

  return {
    fullName: body.fullName,
    experienceYears: body.experienceYears,
    qualifications: body.qualifications,
    biography: body.biography,
    languages
  };
}

function doctorProfileUpdateData(body: DoctorProfilePatch) {
  const languages =
    body.languages === undefined
      ? undefined
      : body.languages === null
        ? Prisma.JsonNull
        : (body.languages as Prisma.InputJsonValue);

  return {
    fullName: body.fullName,
    experienceYears: body.experienceYears,
    qualifications: body.qualifications,
    biography: body.biography,
    languages
  };
}

async function applyDoctorPortfolioMetadata(doctorId: string, body: DoctorProfilePayload | DoctorProfilePatch) {
  if (body.specializationId !== undefined) {
    await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        specializationId: body.specializationId
      }
    });
  }

  if (body.clinicId && body.consultationFee !== undefined) {
    await prisma.clinicDoctor.upsert({
      where: {
        clinicId_doctorId: {
          clinicId: body.clinicId,
          doctorId
        }
      },
      update: {
        consultationFee: body.consultationFee,
        isPrimary: body.isPrimary
      },
      create: {
        clinicId: body.clinicId,
        doctorId,
        consultationFee: body.consultationFee,
        isPrimary: body.isPrimary ?? false
      }
    });
  }

  if (body.availability && body.availability.length > 0) {
    for (const slot of body.availability) {
      const clinicDoctor = await prisma.clinicDoctor.upsert({
        where: {
          clinicId_doctorId: {
            clinicId: slot.clinicId,
            doctorId
          }
        },
        update: {
          consultationFee: body.consultationFee ?? 0,
          isPrimary: body.isPrimary
        },
        create: {
          clinicId: slot.clinicId,
          doctorId,
          consultationFee: body.consultationFee ?? 0,
          isPrimary: body.isPrimary ?? false
        }
      });

      await prisma.availabilitySlot.create({
        data: {
          clinicId: slot.clinicId,
          clinicDoctorId: clinicDoctor.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          isRecurring: slot.isRecurring ?? false,
          recurrenceRule: slot.recurrenceRule
        }
      });
    }
  }
}

export async function createPatientProfile(userId: string, role: Role, body: PatientProfilePayload) {
  const patientId = await getPatientIdByUserId(userId);

  const existing = await prisma.patientProfile.findUnique({ where: { patientId } });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Patient profile already exists');
  }

  const profile = await prisma.patientProfile.create({
    data: {
      patientId,
      ...body
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PATIENT_PROFILE_CREATE' : 'PATIENT_PROFILE_CREATE',
      resourceType: 'PatientProfile',
      resourceId: profile.id
    }
  });

  return profile;
}

export async function updatePatientProfile(userId: string, role: Role, body: PatientProfilePatch) {
  const patientId = await getPatientIdByUserId(userId);

  const existing = await prisma.patientProfile.findUnique({ where: { patientId } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient profile not found');
  }

  const profile = await prisma.patientProfile.update({
    where: { patientId },
    data: body
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PATIENT_PROFILE_UPDATE' : 'PATIENT_PROFILE_UPDATE',
      resourceType: 'PatientProfile',
      resourceId: profile.id
    }
  });

  return profile;
}

export async function getOwnPatientProfile(userId: string) {
  const patientId = await getPatientIdByUserId(userId);
  const profile = await prisma.patientProfile.findUnique({ where: { patientId } });
  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient profile not found');
  }

  return profile;
}

export async function deletePatientProfile(userId: string, role: Role) {
  const patientId = await getPatientIdByUserId(userId);
  const existing = await prisma.patientProfile.findUnique({ where: { patientId } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient profile not found');
  }

  await prisma.patientProfile.delete({ where: { patientId } });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PATIENT_PROFILE_DELETE' : 'PATIENT_PROFILE_DELETE',
      resourceType: 'PatientProfile',
      resourceId: existing.id
    }
  });
}

export async function createDoctorProfile(userId: string, role: Role, body: DoctorProfilePayload) {
  const doctorId = await getDoctorIdByUserId(userId);

  const existing = await prisma.doctorProfile.findUnique({ where: { doctorId } });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Doctor profile already exists');
  }

  const profile = await prisma.doctorProfile.create({
    data: {
      doctorId,
      ...doctorProfileCreateData(body)
    }
  });

  await applyDoctorPortfolioMetadata(doctorId, body);

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_DOCTOR_PROFILE_CREATE' : 'DOCTOR_PROFILE_CREATE',
      resourceType: 'DoctorProfile',
      resourceId: profile.id
    }
  });

  return profile;
}

export async function updateDoctorProfile(userId: string, role: Role, body: DoctorProfilePatch) {
  const doctorId = await getDoctorIdByUserId(userId);

  const existing = await prisma.doctorProfile.findUnique({ where: { doctorId } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor profile not found');
  }

  const profile = await prisma.doctorProfile.update({
    where: { doctorId },
    data: doctorProfileUpdateData(body)
  });

  await applyDoctorPortfolioMetadata(doctorId, body);

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_DOCTOR_PROFILE_UPDATE' : 'DOCTOR_PROFILE_UPDATE',
      resourceType: 'DoctorProfile',
      resourceId: profile.id
    }
  });

  return profile;
}

export async function getOwnDoctorProfile(userId: string) {
  const doctorId = await getDoctorIdByUserId(userId);
  const profile = await prisma.doctorProfile.findUnique({
    where: { doctorId },
    include: {
      doctor: {
        include: {
          specialization: true,
          clinicDoctors: {
            include: {
              clinic: true,
              availability: true
            }
          }
        }
      }
    }
  });

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor profile not found');
  }

  return profile;
}

export async function deleteDoctorProfile(userId: string, role: Role) {
  const doctorId = await getDoctorIdByUserId(userId);
  const existing = await prisma.doctorProfile.findUnique({ where: { doctorId } });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor profile not found');
  }

  await prisma.doctorProfile.delete({ where: { doctorId } });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_DOCTOR_PROFILE_DELETE' : 'DOCTOR_PROFILE_DELETE',
      resourceType: 'DoctorProfile',
      resourceId: existing.id
    }
  });
}

export async function createClinicAdminProfile(userId: string, role: Role, body: ClinicAdminProfilePayload) {
  const existing = await getClinicAdminByUserId(userId);
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Clinic admin profile already exists');
  }

  const created = await prisma.clinicAdmin.create({
    data: {
      userId,
      clinicId: body.clinicId
    },
    include: {
      clinic: true
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PROFILE_CREATE' : 'CLINIC_STAFF_PROFILE_CREATE',
      resourceType: 'ClinicAdmin',
      resourceId: created.id
    }
  });

  return created;
}

export async function getOwnClinicAdminProfile(userId: string) {
  const admin = await prisma.clinicAdmin.findUnique({
    where: { userId },
    include: {
      clinic: true
    }
  });

  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinic admin profile not found');
  }

  return admin;
}

export async function updateClinicAdminProfile(userId: string, role: Role, body: ClinicAdminProfilePatch) {
  const admin = await getClinicAdminByUserId(userId);
  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinic admin account not found');
  }

  const updated = await prisma.clinicAdmin.update({
    where: { userId },
    data: {
      clinicId: body.clinicId
    },
    include: {
      clinic: true
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PROFILE_UPDATE' : 'CLINIC_STAFF_PROFILE_UPDATE',
      resourceType: 'ClinicAdmin',
      resourceId: updated.id
    }
  });

  return updated;
}

export async function deleteClinicAdminProfile(userId: string, role: Role) {
  const admin = await getClinicAdminByUserId(userId);
  if (!admin) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinic admin profile not found');
  }

  await prisma.clinicAdmin.delete({ where: { userId } });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: role === Role.ADMIN ? 'ADMIN_PROFILE_DELETE' : 'CLINIC_STAFF_PROFILE_DELETE',
      resourceType: 'ClinicAdmin',
      resourceId: admin.id
    }
  });
}
