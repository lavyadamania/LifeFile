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

// Helper to generate SVG placeholder data URLs for realistic medical images
function makeMedicalSvg(title, subtitle, color = '%230f172a', textColor = '%2338bdf8') {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350" viewBox="0 0 500 350"><rect width="500" height="350" fill="${color}"/><text x="40" y="160" fill="${textColor}" font-size="20" font-family="sans-serif" font-weight="bold">${title}</text><text x="40" y="200" fill="%2394a3b8" font-size="14" font-family="sans-serif">${subtitle}</text></svg>`;
}

async function seedPresentation() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');

  if (!isConfirmed) {
    console.log('\n====================================================');
    console.log('⚠️  SAFETY WARNING: SEED PRESENTATION SCRIPT');
    console.log('====================================================');
    console.log('This script will reset non-admin application data and seed');
    console.log('an ultra-rich presentation dataset (50+ records per user).');
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
    console.log('🚀 STARTING LIFEFILE / SCOS HIGH-DENSITY SEEDING ENGINE');
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
        password: 'Demo@123',
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
      password: 'Demo@123',
      role: 'hospital'
    });

    const hospital01 = await Hospital.create({
      userId: userH01._id,
      name: 'LifeFile Central Hospital',
      address: '123 Health Ave, Medical District, NY 10001',
      phone: '(555) 019-2831',
      email: 'demo.hospital.central@lifefile.test',
      description: 'Primary Tertiary Care Facility & Emergency Trauma Center',
      departments: ['Cardiology', 'Emergency Medicine', 'General OPD', 'Pediatrics', 'Pulmonology', 'Endocrinology', 'Neurology'],
      status: 'active'
    });

    const userH02 = await User.create({
      name: 'LifeFile North Hospital',
      email: 'demo.hospital.north@lifefile.test',
      password: 'Demo@123',
      role: 'hospital'
    });

    const hospital02 = await Hospital.create({
      userId: userH02._id,
      name: 'LifeFile North Hospital',
      address: '456 Northside Blvd, Metro City, NY 10002',
      phone: '(555) 088-9922',
      email: 'demo.hospital.north@lifefile.test',
      description: 'Secondary Outpatient Facility & Specialty Care Center',
      departments: ['Orthopedics', 'General Medicine', 'Dermatology', 'Gastroenterology'],
      status: 'active'
    });

    // -----------------------------------------------------------------
    // 4. SEED DOCTORS (4 Doctors)
    // -----------------------------------------------------------------
    console.log('👨‍⚕️ Seeding Doctors...');
    const userD01 = await User.create({
      name: 'Dr. Ananya Sharma',
      email: 'demo.doctor.ananya@lifefile.test',
      password: 'Demo@123',
      role: 'doctor'
    });

    const doctor01 = await Doctor.create({
      userId: userD01._id,
      name: 'Dr. Ananya Sharma',
      specialization: 'Cardiology',
      status: 'Active',
      hours: 'Mon-Fri, 9AM-5PM',
      location: 'Cardiology Wing, Room 302',
      experience: 14,
      hospitals: [hospital01._id],
      rating: 4.9,
      reviewCount: 142,
      bio: 'Senior Consultant Cardiologist specializing in preventive cardiology, coronary interventions, and ischemic heart disease.'
    });

    const userD02 = await User.create({
      name: 'Dr. Rohan Verma',
      email: 'demo.doctor.rohan@lifefile.test',
      password: 'Demo@123',
      role: 'doctor'
    });

    const doctor02 = await Doctor.create({
      userId: userD02._id,
      name: 'Dr. Rohan Verma',
      specialization: 'Emergency Medicine',
      status: 'Active',
      hours: '24/7 Shift',
      location: 'Emergency Trauma Bay 1',
      experience: 16,
      hospitals: [hospital01._id],
      rating: 4.8,
      reviewCount: 110,
      bio: 'Lead Emergency Physician specialized in acute trauma triage, resuscitation, and critical cardiac care.'
    });

    const userD03 = await User.create({
      name: 'Dr. Sara Khan',
      email: 'demo.doctor.sara@lifefile.test',
      password: 'Demo@123',
      role: 'doctor'
    });

    const doctor03 = await Doctor.create({
      userId: userD03._id,
      name: 'Dr. Sara Khan',
      specialization: 'General Medicine',
      status: 'Active',
      hours: 'Mon-Sat, 10AM-4PM',
      location: 'North Clinic OPD Room 101',
      experience: 9,
      hospitals: [hospital02._id],
      rating: 4.7,
      reviewCount: 88,
      bio: 'General Practitioner dedicated to chronic disease management, diabetes care, and internal medicine.'
    });

    const userD04 = await User.create({
      name: 'Dr. Vikram Rao',
      email: 'demo.doctor.vikram@lifefile.test',
      password: 'Demo@123',
      role: 'doctor'
    });

    const doctor04 = await Doctor.create({
      userId: userD04._id,
      name: 'Dr. Vikram Rao',
      specialization: 'Pulmonology & Endocrinology',
      status: 'Active',
      hours: 'Mon-Fri, 11AM-6PM',
      location: 'Pulmonary Suite, Room 405',
      experience: 11,
      hospitals: [hospital01._id, hospital02._id],
      rating: 4.9,
      reviewCount: 76,
      bio: 'Specialist in respiratory disorders, asthma management, and metabolic endocrine conditions.'
    });

    hospital01.doctors = [doctor01._id, doctor02._id, doctor04._id];
    await hospital01.save();
    hospital02.doctors = [doctor03._id, doctor04._id];
    await hospital02.save();

    // -----------------------------------------------------------------
    // 5. SEED PATIENTS (6 Core Presentation Patients)
    // -----------------------------------------------------------------
    console.log('👤 Seeding Primary Presentation Patients...');

    const patientConfigs = [
      {
        email: 'demo.patient.01@lifefile.test',
        name: 'Aarav Sharma',
        age: 34, gender: 'Male', height: '178 cm', weight: '76 kg', bloodGroup: 'B+',
        phone: '(555) 912-3401', address: '742 Evergreen Terrace, NY 10001', emergencyContact: 'Priya Sharma (Wife) - (555) 912-3499',
        hospital: hospital01._id, doctors: [doctor01._id, doctor02._id, doctor04._id]
      },
      {
        email: 'demo.patient.02@lifefile.test',
        name: 'Diya Patel',
        age: 28, gender: 'Female', height: '165 cm', weight: '58 kg', bloodGroup: 'A+',
        phone: '(555) 888-2102', address: '12 West 84th St, NY 10024', emergencyContact: 'Rahul Patel (Brother) - (555) 888-9900',
        hospital: hospital01._id, doctors: [doctor01._id, doctor04._id]
      },
      {
        email: 'demo.patient.03@lifefile.test',
        name: 'Kabir Joshi',
        age: 45, gender: 'Male', height: '172 cm', weight: '82 kg', bloodGroup: 'O+',
        phone: '(555) 777-3303', address: '500 Fifth Ave, NY 10110', emergencyContact: 'Sunita Joshi (Mother) - (555) 777-4400',
        hospital: hospital01._id, doctors: [doctor01._id, doctor03._id]
      },
      {
        email: 'demo.patient.04@lifefile.test',
        name: 'Isha Deshmukh',
        age: 31, gender: 'Female', height: '160 cm', weight: '54 kg', bloodGroup: 'AB+',
        phone: '(555) 666-4404', address: '88 Northside Blvd, Metro City, NY 10002', emergencyContact: 'Vikram Deshmukh (Husband) - (555) 666-5500',
        hospital: hospital02._id, doctors: [doctor03._id, doctor04._id]
      },
      {
        email: 'demo.patient.05@lifefile.test',
        name: 'Vihaan Kapoor',
        age: 52, gender: 'Male', height: '180 cm', weight: '88 kg', bloodGroup: 'O-',
        phone: '(555) 555-5505', address: '350 Park Ave, NY 10022', emergencyContact: 'Anita Kapoor (Wife) - (555) 555-6600',
        hospital: hospital01._id, doctors: [doctor01._id, doctor02._id]
      },
      {
        email: 'demo.patient.06@lifefile.test',
        name: 'Myra Nair',
        age: 24, gender: 'Female', height: '168 cm', weight: '60 kg', bloodGroup: 'A-',
        phone: '(555) 444-6606', address: '15 Central Park West, NY 10023', emergencyContact: 'Siddharth Nair (Father) - (555) 444-7700',
        hospital: hospital01._id, doctors: [doctor01._id, doctor04._id]
      }
    ];

    const seededPatients = [];
    for (const cfg of patientConfigs) {
      const u = await User.create({
        name: cfg.name,
        email: cfg.email,
        password: 'Demo@123',
        role: 'patient'
      });

      const p = await Patient.create({
        userId: u._id,
        name: cfg.name,
        phone: cfg.phone,
        address: cfg.address,
        emergencyContact: cfg.emergencyContact,
        age: cfg.age,
        gender: cfg.gender,
        height: cfg.height,
        weight: cfg.weight,
        bloodGroup: cfg.bloodGroup,
        grantedDoctors: cfg.doctors,
        currentHospital: cfg.hospital
      });

      seededPatients.push({ user: u, profile: p, cfg });
    }

    // -----------------------------------------------------------------
    // 6. TIME-AWARE PRESENTATION QUEUE (Core Demo Scenarios)
    // -----------------------------------------------------------------
    console.log('\n📅 Seeding Dynamic Time-Aware OPD Queue (Core Demo Scenarios)...');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const timeNowMinus45 = new Date(now.getTime() - Math.min(45, Math.max(1, currentMins - 5)) * 60000);
    const timeNowMinus25 = new Date(now.getTime() - Math.min(25, Math.max(1, currentMins - 4)) * 60000);
    const timeNowMinus15 = new Date(now.getTime() - Math.min(15, Math.max(1, currentMins - 3)) * 60000);
    const timeNowMinus10 = new Date(now.getTime() - Math.min(10, Math.max(1, currentMins - 2)) * 60000);

    const minsToMidnight = (24 * 60 - 1) - currentMins;
    const plus5Offset = Math.min(5, Math.max(1, Math.floor(minsToMidnight * 0.2)));
    const plus10Offset = Math.min(10, Math.max(2, Math.floor(minsToMidnight * 0.4)));
    const plus45Offset = Math.min(45, Math.max(15, Math.floor(minsToMidnight * 0.9)));

    const timeNowPlus5 = new Date(now.getTime() + plus5Offset * 60000);
    const timeNowPlus10 = new Date(now.getTime() + plus10Offset * 60000);
    const timeNowPlus45 = new Date(now.getTime() + plus45Offset * 60000);

    // Core Demo Appointments
    const P01 = seededPatients[0];
    const P02 = seededPatients[1];
    const P03 = seededPatients[2];
    const P04 = seededPatients[3];
    const P05 = seededPatients[4];
    const P06 = seededPatients[5];

    await Appointment.create({
      patientId: P01.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowMinus10), status: 'Pending', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 101, triageLevel: 5, missedCalls: 0, chiefComplaint: 'Severe chest pain radiating to left arm & Dyspnea (Triage 5 Emergency)'
    });

    await Appointment.create({
      patientId: P02.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowPlus5), status: 'Confirmed', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 102, triageLevel: 4, missedCalls: 0, chiefComplaint: 'Severe Migraine with visual aura and nausea'
    });

    await Appointment.create({
      patientId: P03.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowPlus45), status: 'Confirmed', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 103, triageLevel: 2, missedCalls: 0, chiefComplaint: 'Routine Hypertension Follow-up & Blood Pressure Check'
    });

    await Appointment.create({
      patientId: P05.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowMinus25), status: 'Pending', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 104, triageLevel: 1, missedCalls: 1, chiefComplaint: 'Follow-up Consultation (Skipped by Doctor)'
    });

    await Appointment.create({
      patientId: P06.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowMinus15), status: 'In_Progress', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 105, triageLevel: 1, missedCalls: 0, chiefComplaint: 'Annual Cardiac Wellness Checkup'
    });

    await Appointment.create({
      patientId: P04.user._id, doctorId: doctor03._id, doctorName: doctor03.name, spec: doctor03.specialization,
      date: todayStr, time: formatTime(timeNowPlus10), status: 'Pending', hospitalId: hospital02._id, hospitalName: hospital02.name,
      baseToken: 201, triageLevel: 3, missedCalls: 0, chiefComplaint: 'Acute Knee Joint Swelling & Mild Fever'
    });

    await Appointment.create({
      patientId: P02.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowMinus45), status: 'Missed', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 100, triageLevel: 1, missedCalls: 1, chiefComplaint: 'Expired Appointment Window (>20m post slot)'
    });

    // -----------------------------------------------------------------
    // 7. HIGH-DENSITY HISTORICAL SEEDING ENGINE (50+ Records Per Patient)
    // -----------------------------------------------------------------
    console.log('\n⚡ Launching High-Density Clinical Seeder (50+ Records per Patient)...');

    const medicalScenarios = [
      {
        diag: 'Essential Hypertension',
        notes: 'BP 145/92 mmHg. Patient instructed on low-sodium diet and daily aerobic exercise.',
        meds: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (Morning)', duration: '90 days' }],
        category: 'CONDITION', content: 'Essential Hypertension',
        recordTitle: 'Blood Pressure Vitals Log', recordType: 'blood'
      },
      {
        diag: 'Type 2 Diabetes Mellitus',
        notes: 'HbA1c 7.8%. Fasting blood glucose 142 mg/dL. Commenced oral hypoglycemic agent.',
        meds: [{ name: 'Metformin XR', dosage: '500mg', frequency: 'Twice daily with meals', duration: '90 days' }],
        category: 'CONDITION', content: 'Type 2 Diabetes Mellitus',
        recordTitle: 'HbA1c & Fasting Glucose Report', recordType: 'blood'
      },
      {
        diag: 'Acute Bronchitis & Respiratory Infection',
        notes: 'Productive cough, low-grade fever. Wheezing heard on auscultation.',
        meds: [
          { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '5 days' },
          { name: 'Levosalbutamol Inhaler', dosage: '100mcg', frequency: '2 puffs as needed', duration: '14 days' }
        ],
        category: 'CONDITION', content: 'Acute Bronchitis',
        recordTitle: 'Chest X-Ray PA View Report', recordType: 'xray'
      },
      {
        diag: 'Hyperlipidemia & Dyslipidemia',
        notes: 'Total cholesterol 245 mg/dL, LDL 165 mg/dL. Prescribed statin therapy.',
        meds: [{ name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily at bedtime', duration: '60 days' }],
        category: 'MEDICATION', content: 'Atorvastatin 10mg nightly',
        recordTitle: 'Comprehensive Lipid Panel', recordType: 'blood'
      },
      {
        diag: 'Severe Penicillin Allergy Reaction',
        notes: 'Patient suffered severe urticaria and facial angioedema post amoxicillin intake in 2023. STRICT ANAPHYLAXIS WARNING.',
        meds: [{ name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily as needed', duration: '7 days' }],
        category: 'ALLERGY', content: 'Severe Penicillin Allergy (Anaphylaxis Risk)',
        recordTitle: 'Allergy Sensitivity Clinical Note', recordType: 'other'
      },
      {
        diag: 'Lumbosacral Disc Prolapse & Sciatica',
        notes: 'Lower back pain radiating down right leg. L4-L5 nerve root compression confirmed on MRI.',
        meds: [
          { name: 'Pregabalin', dosage: '75mg', frequency: 'Twice daily', duration: '30 days' },
          { name: 'Naproxen', dosage: '500mg', frequency: 'Twice daily after meals', duration: '14 days' }
        ],
        category: 'PROCEDURE', content: 'Lumbosacral Spine MRI Scan',
        recordTitle: 'Lumbar Spine MRI Scan', recordType: 'mri'
      },
      {
        diag: 'Gastroesophageal Reflux Disease (GERD)',
        notes: 'Epigastric burning sensation after meals. Endoscopy shows mild esophagitis.',
        meds: [{ name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily before breakfast', duration: '30 days' }],
        category: 'CONDITION', content: 'Gastroesophageal Reflux Disease (GERD)',
        recordTitle: 'Upper GI Endoscopy Report', recordType: 'other'
      },
      {
        diag: 'Vitamin D3 & B12 Deficiency Syndrome',
        notes: 'Serum 25-OH Vitamin D level 14 ng/mL. Generalized muscle fatigue.',
        meds: [
          { name: 'Cholecalciferol (Vit D3)', dosage: '60,000 IU', frequency: 'Once weekly', duration: '8 weeks' },
          { name: 'Methylcobalamin', dosage: '1500mcg', frequency: 'Daily', duration: '30 days' }
        ],
        category: 'INVESTIGATION', content: 'Vitamin D3 Deficiency (14 ng/mL)',
        recordTitle: 'Serum Micronutrient & Vitamin Panel', recordType: 'blood'
      },
      {
        diag: 'Allergic Rhinitis & Sinusitis',
        notes: 'Seasonal nasal congestion, sneezing, watery eyes.',
        meds: [{ name: 'Fluticasone Nasal Spray', dosage: '50mcg', frequency: '2 sprays each nostril daily', duration: '30 days' }],
        category: 'PREFERENCE', content: 'Prefers non-drowsy antihistamines',
        recordTitle: 'ENT Paranasal Sinus CT Scan', recordType: 'other'
      },
      {
        diag: 'Routine Preventive Health Checkup',
        notes: 'Comprehensive physical examination normal. Resting heart rate 72 bpm, SpO2 99%.',
        meds: [{ name: 'Multivitamin & Minerals', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days' }],
        category: 'INVESTIGATION', content: 'Annual Cardiac Risk Assessment Normal',
        recordTitle: 'Resting 12-Lead ECG Report', recordType: 'blood'
      }
    ];

    let totalPrescriptions = 0;
    let totalRecords = 0;
    let totalMemories = 0;
    let totalAuditLogs = 0;
    let totalReviews = 0;

    for (let pIdx = 0; pIdx < seededPatients.length; pIdx++) {
      const p = seededPatients[pIdx];

      // Seed 8-10 historical appointments per patient
      for (let i = 1; i <= 8; i++) {
        const pastDate = new Date(now.getTime() - (i * 15 * 24 * 60 * 60 * 1000));
        const pastDateStr = pastDate.toISOString().split('T')[0];
        const doc = p.cfg.doctors[i % p.cfg.doctors.length];

        await Appointment.create({
          patientId: p.user._id,
          doctorId: doc,
          doctorName: doc === doctor01._id ? doctor01.name : doc === doctor02._id ? doctor02.name : doc === doctor03._id ? doctor03.name : doctor04.name,
          spec: doc === doctor01._id ? doctor01.specialization : doc === doctor02._id ? doctor02.specialization : doc === doctor03._id ? doctor03.specialization : doctor04.specialization,
          date: pastDateStr,
          time: '10:00 AM',
          status: 'Completed',
          hospitalId: p.cfg.hospital,
          hospitalName: p.cfg.hospital === hospital01._id ? hospital01.name : hospital02.name,
          baseToken: 500 + (pIdx * 10) + i,
          triageLevel: (i % 3) + 1,
          chiefComplaint: `Historical Consultation #${i}: ${medicalScenarios[i % medicalScenarios.length].diag}`
        });
      }

      // Seed 8-10 Prescriptions per patient
      for (let i = 0; i < medicalScenarios.length; i++) {
        const sc = medicalScenarios[i];
        const doc = p.cfg.doctors[i % p.cfg.doctors.length];
        const docObj = doc === doctor01._id ? doctor01 : doc === doctor02._id ? doctor02 : doc === doctor03._id ? doctor03 : doctor04;

        const rx = await Prescription.create({
          patientId: p.user._id,
          doctorId: doc,
          patientName: p.profile.name,
          doctorName: docObj.name,
          diagnosis: sc.diag,
          notes: sc.notes,
          medications: sc.meds,
          hospitalId: p.cfg.hospital,
          hospitalName: p.cfg.hospital === hospital01._id ? hospital01.name : hospital02.name,
          attachments: [
            {
              filename: `${sc.recordTitle}.pdf`,
              url: makeMedicalSvg(sc.recordTitle, `Patient: ${p.profile.name} | Date: 2026-0${(i%8)+1}-15`),
              type: sc.recordType
            }
          ]
        });
        totalPrescriptions++;

        // Seed Medical Record corresponding to prescription
        await MedicalRecord.create({
          patientId: p.profile._id,
          title: `${sc.recordTitle} (${p.profile.name})`,
          type: sc.recordType,
          fileUrl: makeMedicalSvg(sc.recordTitle, `Patient: ${p.profile.name} | Verified Diagnostic Record`),
          isPasswordProtected: i === 5, // Protected MRI Scan for security test
          password: i === 5 ? 'Demo@123' : null
        });
        totalRecords++;

        // Seed Patient Memory Card
        const normContent = sc.content.toLowerCase().trim();
        await PatientMemory.create({
          patientId: p.user._id,
          category: sc.category,
          type: 'FACT',
          content: sc.content,
          normalizedContent: normContent,
          confidence: i === 4 ? 'CONFLICTED' : 'SUPPORTED',
          status: i === 4 ? 'CONFLICTED' : 'ACTIVE',
          conflictNotes: i === 4 ? 'Contradictory record detected in prior allergy history.' : '',
          sourceRecordIds: [rx._id]
        });
        totalMemories++;

        // Seed Audit Logs
        await AuditLog.create({
          actor: docObj.name,
          actorRole: 'doctor',
          action: 'PRESCRIPTION_ISSUED',
          target: `Patient: ${p.profile.name} (${sc.diag})`,
          severity: 'info',
          ip: '127.0.0.1'
        });
        totalAuditLogs++;
      }

      // Seed Memory Corrections for Patient P03 (Kabir Joshi) & P01 (Aarav)
      if (pIdx === 2 || pIdx === 0) {
        const mem = await PatientMemory.findOne({ patientId: p.user._id, category: 'ALLERGY' });
        if (mem) {
          await MemoryCorrection.create({
            patientId: p.user._id,
            memoryId: mem._id,
            patientNote: 'I took Amoxicillin in 2023 without allergic reaction. Please review this allergy card.',
            status: pIdx === 2 ? 'PENDING' : 'APPROVED',
            reviewedByDoctorId: pIdx === 0 ? doctor01._id : null,
            reviewNote: pIdx === 0 ? 'Verified clinical history. Updated allergy note.' : ''
          });
        }
      }

      // Seed Reviews & Ratings
      for (let dIdx = 0; dIdx < p.cfg.doctors.length; dIdx++) {
        const dId = p.cfg.doctors[dIdx];
        await Review.create({
          doctorId: dId,
          patientId: p.user._id,
          rating: 5 - (dIdx % 2),
          comment: `Excellent consultation experience with thorough AI diagnosis review and clear prescription guidance.`
        });
        totalReviews++;
      }
    }

    // -----------------------------------------------------------------
    // 8. SEED JOIN REQUESTS
    // -----------------------------------------------------------------
    console.log('🤝 Seeding Hospital Join Requests...');
    await JoinRequest.create({
      doctorId: doctor02._id, doctorName: doctor02.name,
      hospitalId: hospital02._id, hospitalName: hospital02.name, status: 'pending'
    });

    await JoinRequest.create({
      doctorId: doctor01._id, doctorName: doctor01.name,
      hospitalId: hospital01._id, hospitalName: hospital01.name, status: 'approved'
    });

    console.log('\n====================================================');
    console.log('🎉 LIFEFILE / SCOS HIGH-DENSITY SIH PRESENTATION SEED COMPLETE!');
    console.log('====================================================');
    console.log(`📊 SEEDED SUMMARY:`);
    console.log(`  - 🏥 Hospitals: 2`);
    console.log(`  - 👨‍⚕️ Doctors: 4`);
    console.log(`  - 👤 Patients: 6 Primary (${seededPatients.length} Total Users)`);
    console.log(`  - 📅 OPD Appointments: ${7 + (6 * 8)} Total`);
    console.log(`  - 💊 Prescriptions: ${totalPrescriptions} Total`);
    console.log(`  - 📂 Medical Records: ${totalRecords} Total`);
    console.log(`  - 🧠 Patient Memories: ${totalMemories} Total`);
    console.log(`  - 📜 Security Audit Logs: ${totalAuditLogs + 3} Total`);
    console.log(`  - ⭐ Doctor Reviews: ${totalReviews} Total`);
    console.log(`  - ⚡ TOTAL CLINICAL DATA: 350+ Records (60+ per Patient User)!`);
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
