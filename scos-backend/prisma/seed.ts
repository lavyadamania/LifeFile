import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 12);

  const specialization = await prisma.specialization.upsert({
    where: { name: 'Cardiology' },
    update: {},
    create: {
      name: 'Cardiology',
      description: 'Heart specialist'
    }
  });

  const clinic = await prisma.clinic.upsert({
    where: { code: 'CLN-MAIN' },
    update: {},
    create: {
      code: 'CLN-MAIN',
      name: 'Main City Clinic',
      address: '100 Health Street',
      city: 'Metropolis',
      state: 'CA',
      country: 'USA',
      postalCode: '90001',
      timezone: 'America/Los_Angeles'
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@clinic.local' },
    update: {},
    create: {
      email: 'admin@clinic.local',
      passwordHash,
      role: Role.ADMIN
    }
  });

  await prisma.clinicAdmin.upsert({
    where: { userId: adminUser.id },
    update: { clinicId: clinic.id },
    create: {
      userId: adminUser.id,
      clinicId: clinic.id
    }
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@clinic.local' },
    update: {},
    create: {
      email: 'doctor@clinic.local',
      passwordHash,
      role: Role.DOCTOR
    }
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      licenseNumber: 'LIC-1001',
      specializationId: specialization.id
    }
  });

  await prisma.doctorProfile.upsert({
    where: { doctorId: doctor.id },
    update: {},
    create: {
      doctorId: doctor.id,
      fullName: 'Dr. Ada Hart',
      experienceYears: 12,
      qualifications: 'MD, Cardiology',
      biography: 'Patient-first cardiologist',
      languages: ['English', 'Spanish']
    }
  });

  await prisma.clinicDoctor.upsert({
    where: {
      clinicId_doctorId: {
        clinicId: clinic.id,
        doctorId: doctor.id
      }
    },
    update: {},
    create: {
      clinicId: clinic.id,
      doctorId: doctor.id,
      consultationFee: 120
    }
  });

  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@clinic.local' },
    update: {},
    create: {
      email: 'patient@clinic.local',
      passwordHash,
      role: Role.PATIENT
    }
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      mrn: 'MRN-1001'
    }
  });

  await prisma.patientProfile.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      fullName: 'John Doe',
      dateOfBirth: new Date('1990-05-12'),
      allergies: 'Penicillin',
      chronicConditions: 'Hypertension',
      emergencyContact: '+1-555-0100'
    }
  });

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      reason: 'Routine consultation'
    }
  });

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
