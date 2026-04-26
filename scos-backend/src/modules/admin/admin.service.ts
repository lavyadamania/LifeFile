import { prisma } from '../../config/prisma';

export async function createClinic(body: {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
  phone?: string;
  email?: string;
}) {
  return prisma.clinic.create({ data: body });
}

export async function createSpecialization(body: { name: string; description?: string }) {
  return prisma.specialization.upsert({
    where: { name: body.name },
    update: { description: body.description },
    create: body
  });
}

export async function createAvailability(body: {
  clinicId: string;
  clinicDoctorId: string;
  startsAt: Date;
  endsAt: Date;
  isRecurring: boolean;
  recurrenceRule?: string;
}) {
  return prisma.availabilitySlot.create({ data: body });
}

export async function deactivateUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });
}

export async function searchEntities(query: {
  doctors?: string;
  patients?: string;
  recordsCondition?: string;
  appointmentStatus?: string;
  labStatus?: string;
}) {
  const [doctors, patients, records, appointments, labReports] = await Promise.all([
    prisma.doctor.findMany({
      where: query.doctors
        ? {
            profile: {
              fullName: { contains: query.doctors, mode: 'insensitive' }
            }
          }
        : undefined,
      include: { profile: true, specialization: true }
    }),
    prisma.patient.findMany({
      where: query.patients
        ? {
            profile: {
              fullName: { contains: query.patients, mode: 'insensitive' }
            }
          }
        : undefined,
      include: { profile: true }
    }),
    prisma.medicalRecord.findMany({
      where: query.recordsCondition
        ? {
            conditionTag: {
              contains: query.recordsCondition,
              mode: 'insensitive'
            }
          }
        : undefined,
      include: { patient: { include: { profile: true } }, doctor: { include: { profile: true } } }
    }),
    prisma.appointment.findMany({
      where: query.appointmentStatus
        ? {
            status: query.appointmentStatus as never
          }
        : undefined,
      include: { patient: true, doctor: true, clinic: true }
    }),
    prisma.labReport.findMany({
      where: query.labStatus
        ? {
            status: query.labStatus as never
          }
        : undefined,
      include: {
        labOrder: true
      }
    })
  ]);

  return {
    doctors,
    patients,
    records,
    appointments,
    labReports
  };
}

export async function analytics() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [dailyPatientCount, doctorLoad, avgWaiting, consultationAvg, topRated, peakHours, noShowRate] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          startsAt: { gte: dayStart }
        }
      }),
      prisma.appointment.groupBy({
        by: ['doctorId'],
        _count: { _all: true }
      }),
      prisma.queueToken.aggregate({
        _avg: { estimatedWaitMins: true }
      }),
      prisma.consultationLog.aggregate({
        _avg: { durationMins: true }
      }),
      prisma.doctorProfile.findMany({
        orderBy: [{ avgRating: 'desc' }, { totalReviews: 'desc' }],
        take: 5
      }),
      prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT EXTRACT(HOUR FROM "startsAt")::int as hour, COUNT(*)::bigint as count
        FROM "Appointment"
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 5
      `,
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true }
      })
    ]);

  const totalAppointments = noShowRate.reduce((acc, curr) => acc + curr._count._all, 0);
  const noShowCount = noShowRate.find((x) => x.status === 'NO_SHOW')?._count._all ?? 0;

  return {
    dailyPatientCount,
    doctorLoad,
    averageWaitingTime: avgWaiting._avg.estimatedWaitMins ?? 0,
    consultationDurationAverage: consultationAvg._avg.durationMins ?? 0,
    topRatedDoctors: topRated,
    peakHours,
    noShowRate: totalAppointments === 0 ? 0 : noShowCount / totalAppointments
  };
}
