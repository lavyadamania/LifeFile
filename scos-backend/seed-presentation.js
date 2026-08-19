require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Hospital = require('./models/Hospital');
const Clinic = require('./models/Clinic');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const MedicalRecord = require('./models/MedicalRecord');
const PatientMemory = require('./models/PatientMemory');
const MemoryCorrection = require('./models/MemoryCorrection');
const JoinRequest = require('./models/JoinRequest');
const AuditLog = require('./models/AuditLog');
const Review = require('./models/Review');

// Helper to format time string HH:MM AM/PM
function formatTime(d) {
  let h = d.getHours();
  let m = d.getMinutes();
  const meridian = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
}

async function seedPresentation() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');

  if (!isConfirmed) {
    console.log('\n====================================================');
    console.log('⚠️  SAFETY WARNING: SEED PRESENTATION SCRIPT');
    console.log('====================================================');
    console.log('This script will reset non-admin application data and seed');
    console.log('a deterministic, time-aware presentation dataset for SIH 2026.');
    console.log('\nTo confirm and execute, run:');
    console.log('  npm run seed:presentation -- --confirm');
    console.log('OR');
    console.log('  node seed-presentation.js --confirm\n');
    process.exit(0);
  }

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('====================================================');
    console.log('🚀 STARTING LIFEFILE / SCOS DETERMINISTIC SIH SEEDING');
    console.log('====================================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Preserve Existing Admin Users
    const existingAdmins = await User.find({ role: 'admin' });
    console.log(`👑 Preserving ${existingAdmins.length} existing admin user(s)...`);

    // 2. Wipe non-admin demo data
    console.log('🧹 Clearing old demo data collections...');
    await User.deleteMany({ role: { $ne: 'admin' } });
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Hospital.deleteMany({});
    await Clinic.deleteMany({});
    await Appointment.deleteMany({});
    await Prescription.deleteMany({});
    await MedicalRecord.deleteMany({});
    await PatientMemory.deleteMany({});
    await MemoryCorrection.deleteMany({});
    await JoinRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await Review.deleteMany({});

    console.log('✅ Old data cleared cleanly.\n');

    const hashedPassword = await bcrypt.hash('Demo@123', 10);

    // Ensure default admin exists
    let adminUser = existingAdmins.find(a => a.email === 'lavya@admin');
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Lavya',
        email: 'lavya@admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('👑 Created default Admin account: lavya@admin / Demo@123');
    }

    // -----------------------------------------------------------------
    // 3. SEED HOSPITALS (2 Facilities)
    // -----------------------------------------------------------------
    console.log('🏥 Seeding Hospitals...');
    const userH01 = await User.create({
      name: 'LifeFile Central Hospital',
      email: 'demo.hospital.central@lifefile.test',
      password: hashedPassword,
      role: 'hospital'
    });

    const hospital01 = await Hospital.create({
      userId: userH01._id,
      name: 'LifeFile Central Hospital',
      address: '123 Health Ave, Medical District, NY 10001',
      phone: '(555) 019-2831',
      email: 'demo.hospital.central@lifefile.test',
      description: 'Primary Tertiary Care Facility & Emergency Center',
      departments: ['Cardiology', 'Emergency Medicine', 'General OPD', 'Pediatrics'],
      status: 'active'
    });

    const userH02 = await User.create({
      name: 'LifeFile North Hospital',
      email: 'demo.hospital.north@lifefile.test',
      password: hashedPassword,
      role: 'hospital'
    });

    const hospital02 = await Hospital.create({
      userId: userH02._id,
      name: 'LifeFile North Hospital',
      address: '456 Northside Blvd, Metro City, NY 10002',
      phone: '(555) 088-9922',
      email: 'demo.hospital.north@lifefile.test',
      description: 'Secondary Outpatient Facility & Speciality Clinic',
      departments: ['Orthopedics', 'General Medicine', 'Dermatology'],
      status: 'active'
    });

    console.log('  - H01: LifeFile Central Hospital (demo.hospital.central@lifefile.test)');
    console.log('  - H02: LifeFile North Hospital (demo.hospital.north@lifefile.test)');

    // -----------------------------------------------------------------
    // 4. SEED DOCTORS (3 Doctors)
    // -----------------------------------------------------------------
    console.log('\n👨‍⚕️ Seeding Doctors...');
    const userD01 = await User.create({
      name: 'Dr. Ananya Sharma',
      email: 'demo.doctor.ananya@lifefile.test',
      password: hashedPassword,
      role: 'doctor'
    });

    const doctor01 = await Doctor.create({
      userId: userD01._id,
      name: 'Dr. Ananya Sharma',
      specialization: 'Cardiology',
      status: 'Active',
      hours: 'Mon-Fri, 9AM-5PM',
      location: 'Cardiology Wing, Room 302',
      experience: 12,
      hospitals: [hospital01._id],
      rating: 4.9,
      reviewCount: 128,
      bio: 'Senior Consultant Cardiologist specializing in preventive cardiology and ischemic heart disease.'
    });

    const userD02 = await User.create({
      name: 'Dr. Rohan Verma',
      email: 'demo.doctor.rohan@lifefile.test',
      password: hashedPassword,
      role: 'doctor'
    });

    const doctor02 = await Doctor.create({
      userId: userD02._id,
      name: 'Dr. Rohan Verma',
      specialization: 'Emergency Medicine',
      status: 'Active',
      hours: '24/7 Shift',
      location: 'Emergency Trauma Bay 1',
      experience: 15,
      hospitals: [hospital01._id],
      rating: 4.8,
      reviewCount: 94,
      bio: 'Lead Emergency Physician specialized in acute trauma triage and rapid resuscitation.'
    });

    const userD03 = await User.create({
      name: 'Dr. Sara Khan',
      email: 'demo.doctor.sara@lifefile.test',
      password: hashedPassword,
      role: 'doctor'
    });

    const doctor03 = await Doctor.create({
      userId: userD03._id,
      name: 'Dr. Sara Khan',
      specialization: 'General Medicine',
      status: 'Active',
      hours: 'Mon-Sat, 10AM-4PM',
      location: 'North Clinic OPD Room 101',
      experience: 8,
      hospitals: [hospital02._id],
      rating: 4.7,
      reviewCount: 62,
      bio: 'General Practitioner dedicated to holistic outpatient care and chronic disease management.'
    });

    hospital01.doctors = [doctor01._id, doctor02._id];
    await hospital01.save();
    hospital02.doctors = [doctor03._id];
    await hospital02.save();

    console.log('  - D01: Dr. Ananya Sharma (demo.doctor.ananya@lifefile.test)');
    console.log('  - D02: Dr. Rohan Verma (demo.doctor.rohan@lifefile.test)');
    console.log('  - D03: Dr. Sara Khan (demo.doctor.sara@lifefile.test)');

    // -----------------------------------------------------------------
    // 5. SEED PATIENTS (6 Patients)
    // -----------------------------------------------------------------
    console.log('\n👤 Seeding Patients...');

    // P01: Aarav Sharma (Emergency Triage 5 + Active Memory + Records)
    const userP01 = await User.create({
      name: 'Aarav Sharma',
      email: 'demo.patient.01@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient01 = await Patient.create({
      userId: userP01._id,
      name: 'Aarav Sharma',
      phone: '(555) 912-3401',
      address: '742 Evergreen Terrace, NY 10001',
      emergencyContact: 'Priya Sharma (Wife) - (555) 912-3499',
      age: 34,
      gender: 'Male',
      height: '178 cm',
      weight: '76 kg',
      bloodGroup: 'B+',
      grantedDoctors: [doctor01._id, doctor02._id],
      currentHospital: hospital01._id
    });

    // P02: Diya Patel (Active Check-In Window + MRI Record)
    const userP02 = await User.create({
      name: 'Diya Patel',
      email: 'demo.patient.02@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient02 = await Patient.create({
      userId: userP02._id,
      name: 'Diya Patel',
      phone: '(555) 888-2102',
      address: '12 West 84th St, NY 10024',
      emergencyContact: 'Rahul Patel (Brother) - (555) 888-9900',
      age: 28,
      gender: 'Female',
      height: '165 cm',
      weight: '58 kg',
      bloodGroup: 'A+',
      grantedDoctors: [doctor01._id],
      currentHospital: hospital01._id
    });

    // P03: Kabir Joshi (Memory Conflict & Correction Request)
    const userP03 = await User.create({
      name: 'Kabir Joshi',
      email: 'demo.patient.03@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient03 = await Patient.create({
      userId: userP03._id,
      name: 'Kabir Joshi',
      phone: '(555) 777-3303',
      address: '500 Fifth Ave, NY 10110',
      emergencyContact: 'Sunita Joshi (Mother) - (555) 777-4400',
      age: 45,
      gender: 'Male',
      height: '172 cm',
      weight: '82 kg',
      bloodGroup: 'O+',
      grantedDoctors: [doctor01._id],
      currentHospital: hospital01._id
    });

    // P04: Isha Deshmukh (Hospital B Facility Queue Isolation)
    const userP04 = await User.create({
      name: 'Isha Deshmukh',
      email: 'demo.patient.04@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient04 = await Patient.create({
      userId: userP04._id,
      name: 'Isha Deshmukh',
      phone: '(555) 666-4404',
      address: '88 Northside Blvd, Metro City, NY 10002',
      emergencyContact: 'Vikram Deshmukh (Husband) - (555) 666-5500',
      age: 31,
      gender: 'Female',
      height: '160 cm',
      weight: '54 kg',
      bloodGroup: 'AB+',
      grantedDoctors: [doctor03._id],
      currentHospital: hospital02._id
    });

    // P05: Vihaan Kapoor (Skipped Queue & ACPA Penalty)
    const userP05 = await User.create({
      name: 'Vihaan Kapoor',
      email: 'demo.patient.05@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient05 = await Patient.create({
      userId: userP05._id,
      name: 'Vihaan Kapoor',
      phone: '(555) 555-5505',
      address: '350 Park Ave, NY 10022',
      emergencyContact: 'Anita Kapoor (Wife) - (555) 555-6600',
      age: 52,
      gender: 'Male',
      height: '180 cm',
      weight: '88 kg',
      bloodGroup: 'O-',
      grantedDoctors: [doctor01._id],
      currentHospital: hospital01._id
    });

    // P06: Myra Nair (NOW SERVING / In_Progress Consultation)
    const userP06 = await User.create({
      name: 'Myra Nair',
      email: 'demo.patient.06@lifefile.test',
      password: hashedPassword,
      role: 'patient'
    });
    const patient06 = await Patient.create({
      userId: userP06._id,
      name: 'Myra Nair',
      phone: '(555) 444-6606',
      address: '15 Central Park West, NY 10023',
      emergencyContact: 'Siddharth Nair (Father) - (555) 444-7700',
      age: 24,
      gender: 'Female',
      height: '168 cm',
      weight: '60 kg',
      bloodGroup: 'A-',
      grantedDoctors: [doctor01._id],
      currentHospital: hospital01._id
    });

    console.log('  - P01: Aarav Sharma (demo.patient.01@lifefile.test) [Emergency Triage 5]');
    console.log('  - P02: Diya Patel (demo.patient.02@lifefile.test) [Active Check-In]');
    console.log('  - P03: Kabir Joshi (demo.patient.03@lifefile.test) [Memory Conflict]');
    console.log('  - P04: Isha Deshmukh (demo.patient.04@lifefile.test) [Hospital B Queue]');
    console.log('  - P05: Vihaan Kapoor (demo.patient.05@lifefile.test) [Skipped Queue]');
    console.log('  - P06: Myra Nair (demo.patient.06@lifefile.test) [In_Progress Now Serving]');

    // -----------------------------------------------------------------
    // 6. SEED APPOINTMENTS (Time-Aware Dynamic Schedule)
    // -----------------------------------------------------------------
    console.log('\n📅 Seeding Dynamic Time-Aware Appointments...');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Ensure offsets stay within 00:01 - 23:59 boundary regardless of execution time
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Past Offsets (clamped to at least 00:01 today)
    const timeNowMinus45 = new Date(now.getTime() - Math.min(45, Math.max(1, currentMins - 5)) * 60000);
    const timeNowMinus25 = new Date(now.getTime() - Math.min(25, Math.max(1, currentMins - 4)) * 60000);
    const timeNowMinus15 = new Date(now.getTime() - Math.min(15, Math.max(1, currentMins - 3)) * 60000);
    const timeNowMinus10 = new Date(now.getTime() - Math.min(10, Math.max(1, currentMins - 2)) * 60000);

    // Future Offsets (clamped so they don't roll over to tomorrow if run near midnight)
    const minsToMidnight = (24 * 60 - 1) - currentMins;
    const plus5Offset = Math.min(5, Math.max(1, Math.floor(minsToMidnight * 0.2)));
    const plus10Offset = Math.min(10, Math.max(2, Math.floor(minsToMidnight * 0.4)));
    const plus45Offset = Math.min(45, Math.max(15, Math.floor(minsToMidnight * 0.9)));

    const timeNowPlus5 = new Date(now.getTime() + plus5Offset * 60000);
    const timeNowPlus10 = new Date(now.getTime() + plus10Offset * 60000);
    const timeNowPlus45 = new Date(now.getTime() + plus45Offset * 60000);

    // Appt 1: Aarav Sharma (P01 @ D01, H01) -> Triage 5 Emergency Override
    const appt01 = await Appointment.create({
      patientId: userP01._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowMinus10),
      status: 'Pending',
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 101,
      triageLevel: 5, // RESUSCITATION / CRITICAL EMERGENCY
      missedCalls: 0,
      chiefComplaint: 'Acute Chest Pain radiating to left arm & Dyspnea (Triage 5 Emergency)'
    });

    // Appt 2: Diya Patel (P02 @ D01, H01) -> Triage 4 Urgent Emergency & Active Check-In
    const appt02 = await Appointment.create({
      patientId: userP02._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowPlus5),
      status: 'Confirmed', // Active Check-in Window
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 102,
      triageLevel: 4, // URGENT EMERGENCY
      missedCalls: 0,
      chiefComplaint: 'Severe Migraine with visual aura and nausea'
    });

    // Appt 3: Kabir Joshi (P03 @ D01, H01) -> Triage 2 & Too Early Check-in Lock
    const appt03 = await Appointment.create({
      patientId: userP03._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowPlus45),
      status: 'Confirmed', // Too Early Check-in Window (45m in future)
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 103,
      triageLevel: 2,
      missedCalls: 0,
      chiefComplaint: 'Routine Hypertension Follow-up & Blood Pressure Check'
    });

    // Appt 4: Vihaan Kapoor (P05 @ D01, H01) -> Skipped Queue with 1 Missed Call
    const appt04 = await Appointment.create({
      patientId: userP05._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowMinus25),
      status: 'Pending',
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 104,
      triageLevel: 1,
      missedCalls: 1, // ACPA Missed Call Penalty Demo
      chiefComplaint: 'Follow-up Consultation (Skipped by Doctor)'
    });

    // Appt 5: Myra Nair (P06 @ D01, H01) -> In_Progress NOW SERVING
    const appt05 = await Appointment.create({
      patientId: userP06._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowMinus15),
      status: 'In_Progress', // NOW SERVING
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 105,
      triageLevel: 1,
      missedCalls: 0,
      chiefComplaint: 'Annual Cardiac Wellness Checkup'
    });

    // Appt 6: Isha Deshmukh (P04 @ D03, H02) -> Hospital B Facility Isolation Demo
    const appt06 = await Appointment.create({
      patientId: userP04._id,
      doctorId: doctor03._id,
      doctorName: doctor03.name,
      spec: doctor03.specialization,
      date: todayStr,
      time: formatTime(timeNowPlus10),
      status: 'Pending',
      hospitalId: hospital02._id,
      hospitalName: hospital02.name,
      baseToken: 201,
      triageLevel: 3,
      missedCalls: 0,
      chiefComplaint: 'Acute Knee Joint Swelling & Mild Fever'
    });

    // Appt 7: Diya Patel (P02 @ D01, H01) -> Expired Slot Demo
    const appt07 = await Appointment.create({
      patientId: userP02._id,
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      spec: doctor01.specialization,
      date: todayStr,
      time: formatTime(timeNowMinus45),
      status: 'Missed',
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      baseToken: 100,
      triageLevel: 1,
      missedCalls: 1,
      chiefComplaint: 'Expired Appointment Window (>20m post slot)'
    });

    console.log('  - Appt 1: Aarav Sharma (P01) -> Triage 5 Emergency Override (Token #101)')
    console.log('  - Appt 2: Diya Patel (P02) -> Active Check-In Window (Token #102)')
    console.log('  - Appt 3: Kabir Joshi (P03) -> Too Early Check-In Window (Token #103)')
    console.log('  - Appt 4: Vihaan Kapoor (P05) -> Skipped Queue Penalty (Token #104)')
    console.log('  - Appt 5: Myra Nair (P06) -> NOW SERVING In_Progress (Token #105)')
    console.log('  - Appt 6: Isha Deshmukh (P04) -> Hospital B Facility Queue (Token #201)')
    console.log('  - Appt 7: Diya Patel (P02) -> Expired Check-In Window (Token #100)')

    // -----------------------------------------------------------------
    // 7. SEED PRESCRIPTIONS (3 Records)
    // -----------------------------------------------------------------
    console.log('\n💊 Seeding Prescriptions...');

    const rx01 = await Prescription.create({
      patientId: userP01._id,
      doctorId: doctor01._id,
      patientName: patient01.name,
      doctorName: doctor01.name,
      diagnosis: 'Acute Coronary Syndrome / Essential Hypertension',
      notes: 'Patient exhibits severe allergy to Penicillin. Prescribed Amlodipine & Aspirin.',
      medications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (Morning)', duration: '30 days' },
        { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily (After food)', duration: '30 days' }
      ],
      hospitalId: hospital01._id,
      hospitalName: hospital01.name
    });

    const rx02 = await Prescription.create({
      patientId: userP02._id,
      doctorId: doctor01._id,
      patientName: patient02.name,
      doctorName: doctor01.name,
      diagnosis: 'Chronic Migraine with Aura',
      notes: 'Prescribed Sumatriptan for acute migraine onset. Advised dark room rest.',
      medications: [
        { name: 'Sumatriptan', dosage: '50mg', frequency: 'At onset of migraine', duration: '10 days' }
      ],
      hospitalId: hospital01._id,
      hospitalName: hospital01.name
    });

    const rx03 = await Prescription.create({
      patientId: userP06._id,
      doctorId: doctor01._id,
      patientName: patient06.name,
      doctorName: doctor01.name,
      diagnosis: 'Routine Cardiac Health Checkup',
      notes: 'ECG normal. Normal sinus rhythm with good exercise tolerance.',
      medications: [
        { name: 'Multivitamin', dosage: '1 tablet', frequency: 'Daily after breakfast', duration: '30 days' }
      ],
      hospitalId: hospital01._id,
      hospitalName: hospital01.name
    });

    console.log('  - Rx 1: Aarav Sharma -> Acute Coronary Syndrome (Penicillin Allergy Note)');
    console.log('  - Rx 2: Diya Patel -> Chronic Migraine with Aura');
    console.log('  - Rx 3: Myra Nair -> Routine Cardiac Health Checkup');

    // -----------------------------------------------------------------
    // 8. SEED MEDICAL RECORDS (3 Documents)
    // -----------------------------------------------------------------
    console.log('\n📂 Seeding Medical Records...');

    const svgXray = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230f172a"/><text x="80" y="150" fill="%2338bdf8" font-size="18">Chest X-Ray Digital Scan (Aarav Sharma)</text></svg>';
    const svgBlood = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><text x="60" y="150" fill="%23f43f5e" font-size="18">Cardiac Enzyme Blood Report (Troponin Normal)</text></svg>';
    const svgMri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230284c7"/><text x="90" y="150" fill="%23ffffff" font-size="18">Brain MRI Scan Report (Diya Patel)</text></svg>';

    await MedicalRecord.create({
      patientId: patient01._id,
      title: 'Chest X-Ray Digital Scan',
      type: 'xray',
      fileUrl: svgXray,
      isPasswordProtected: false
    });

    await MedicalRecord.create({
      patientId: patient01._id,
      title: 'Cardiac Enzymes & Lipid Blood Report',
      type: 'blood',
      fileUrl: svgBlood,
      isPasswordProtected: false
    });

    await MedicalRecord.create({
      patientId: patient02._id,
      title: 'Brain MRI Scan Report',
      type: 'mri',
      fileUrl: svgMri,
      isPasswordProtected: false
    });

    console.log('  - Record 1: Aarav Sharma -> Chest X-Ray (Type: xray)');
    console.log('  - Record 2: Aarav Sharma -> Blood Panel (Type: blood)');
    console.log('  - Record 3: Diya Patel -> Brain MRI (Type: mri)');

    // -----------------------------------------------------------------
    // 9. SEED PATIENT MEMORY ENGINE & CONFLICTS
    // -----------------------------------------------------------------
    console.log('\n🧠 Seeding Patient Memory Engine & Conflict Workflow...');

    // Memory 1: Aarav Sharma (Active Verified Allergy Fact)
    const mem01 = await PatientMemory.create({
      patientId: userP01._id,
      category: 'ALLERGY',
      type: 'FACT',
      content: 'Penicillin allergy (severe anaphylactic reaction)',
      normalizedContent: 'penicillin allergy',
      confidence: 'VERIFIED',
      status: 'ACTIVE',
      sourceRecordIds: [rx01._id]
    });

    // Memory 2: Aarav Sharma (Active Medication Fact)
    await PatientMemory.create({
      patientId: userP01._id,
      category: 'MEDICATION',
      type: 'FACT',
      content: 'Amlodipine (5mg once daily for hypertension)',
      normalizedContent: 'amlodipine 5mg once daily',
      confidence: 'VERIFIED',
      status: 'ACTIVE',
      sourceRecordIds: [rx01._id]
    });

    // Memory 3: Diya Patel (Active Condition Fact)
    await PatientMemory.create({
      patientId: userP02._id,
      category: 'CONDITION',
      type: 'FACT',
      content: 'Chronic Migraine with Aura',
      normalizedContent: 'chronic migraine with aura',
      confidence: 'SUPPORTED',
      status: 'ACTIVE',
      sourceRecordIds: [rx02._id]
    });

    // Memory 4: Kabir Joshi (CONFLICTED Memory Assertion 1)
    const memConflict01 = await PatientMemory.create({
      patientId: userP03._id,
      category: 'ALLERGY',
      type: 'FACT',
      content: 'No known drug allergy (Patient statement)',
      normalizedContent: 'no known drug allergy',
      confidence: 'CONFLICTED',
      status: 'CONFLICTED',
      conflictNotes: 'Contradictory clinical record detected: Prior prescription noted Penicillin allergy.'
    });

    // Memory 5: Kabir Joshi (CONFLICTED Memory Assertion 2)
    await PatientMemory.create({
      patientId: userP03._id,
      category: 'ALLERGY',
      type: 'FACT',
      content: 'Penicillin allergy noted in 2024 consultation',
      normalizedContent: 'penicillin allergy',
      confidence: 'CONFLICTED',
      status: 'CONFLICTED',
      conflictNotes: 'Contradicts patient statement: "No known drug allergy"'
    });

    console.log('  - Memory 1: Aarav Sharma -> Penicillin Allergy [VERIFIED / ACTIVE]');
    console.log('  - Memory 2: Aarav Sharma -> Amlodipine Medication [VERIFIED / ACTIVE]');
    console.log('  - Memory 3: Diya Patel -> Chronic Migraine [SUPPORTED / ACTIVE]');
    console.log('  - Memory 4 & 5: Kabir Joshi -> Allergy Contradiction [CONFLICTED]');

    // -----------------------------------------------------------------
    // 10. SEED MEMORY CORRECTION WORKFLOW
    // -----------------------------------------------------------------
    console.log('\n📝 Seeding Patient Memory Correction Request...');

    const correction01 = await MemoryCorrection.create({
      patientId: userP03._id,
      memoryId: memConflict01._id,
      patientNote: 'I took Amoxicillin in 2023 without any allergic reaction. Please review and correct the Penicillin allergy flag.',
      status: 'PENDING'
    });

    console.log('  - Correction Request 1: Kabir Joshi requesting review of Penicillin allergy flag (Status: PENDING)');

    // -----------------------------------------------------------------
    // 11. SEED JOIN REQUESTS (Facility Management)
    // -----------------------------------------------------------------
    console.log('\n🤝 Seeding Hospital Join Requests...');

    await JoinRequest.create({
      doctorId: doctor02._id,
      doctorName: doctor02.name,
      hospitalId: hospital02._id,
      hospitalName: hospital02.name,
      status: 'pending'
    });

    await JoinRequest.create({
      doctorId: doctor01._id,
      doctorName: doctor01.name,
      hospitalId: hospital01._id,
      hospitalName: hospital01.name,
      status: 'approved'
    });

    console.log('  - JoinRequest 1: Dr. Rohan Verma requesting to join LifeFile North Hospital (Status: PENDING)');
    console.log('  - JoinRequest 2: Dr. Ananya Sharma linked to LifeFile Central Hospital (Status: APPROVED)');

    // -----------------------------------------------------------------
    // 12. SEED AUDIT LOGS
    // -----------------------------------------------------------------
    console.log('\n📜 Seeding Audit Logs...');

    await AuditLog.create({
      actor: 'System Seed Engine',
      actorRole: 'system',
      action: 'PRESENTATION_SEED_CREATED',
      target: 'LifeFile SCOS SIH Presentation Dataset',
      severity: 'info',
      ip: '127.0.0.1'
    });

    await AuditLog.create({
      actor: 'Dr. Rohan Verma',
      actorRole: 'doctor',
      action: 'EMERGENCY_QUEUE_CASE_CREATED',
      target: 'Patient Aarav Sharma (Triage Level 5 Resuscitation)',
      severity: 'critical',
      ip: '127.0.0.1'
    });

    await AuditLog.create({
      actor: 'System Memory Engine',
      actorRole: 'system',
      action: 'MEMORY_CONFLICT_DETECTED',
      target: 'Patient Kabir Joshi (Allergy Contradiction Flagged)',
      severity: 'warning',
      ip: '127.0.0.1'
    });

    console.log('  - Seeded 3 structured audit logs for presentation visibility.');

    console.log('\n====================================================');
    console.log('🎉 LIFEFILE / SCOS SIH PRESENTATION SEED COMPLETE!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ SEED ERROR:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

seedPresentation();
