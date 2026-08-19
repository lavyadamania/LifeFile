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
    console.log('a high-density dataset with UNIQUE past medical records per patient.');
    console.log('\nTo confirm and execute, run:');
    console.log('  npm run seed:presentation -- --confirm\n');
    process.exit(0);
  }

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('====================================================');
    console.log('🚀 STARTING LIFEFILE / SCOS UNIQUE PATIENT DATA SEEDING');
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
      departments: ['Orthopedics', 'General Medicine', 'Dermatology', 'Gastroenterology', 'Rheumatology'],
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
        hospital: hospital01._id, doctors: [doctor01._id, doctor02._id]
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
        hospital: hospital01._id, doctors: [doctor01._id, doctor04._id]
      },
      {
        email: 'demo.patient.06@lifefile.test',
        name: 'Myra Nair',
        age: 24, gender: 'Female', height: '168 cm', weight: '60 kg', bloodGroup: 'A-',
        phone: '(555) 444-6606', address: '15 Central Park West, NY 10023', emergencyContact: 'Siddharth Nair (Father) - (555) 444-7700',
        hospital: hospital01._id, doctors: [doctor01._id, doctor03._id]
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

    const P01 = seededPatients[0];
    const P02 = seededPatients[1];
    const P03 = seededPatients[2];
    const P04 = seededPatients[3];
    const P05 = seededPatients[4];
    const P06 = seededPatients[5];

    await Appointment.create({
      patientId: P01.user._id, doctorId: doctor01._id, doctorName: doctor01.name, spec: doctor01.specialization,
      date: todayStr, time: formatTime(timeNowMinus10), status: 'Pending', hospitalId: hospital01._id, hospitalName: hospital01.name,
      baseToken: 101, triageLevel: 5, missedCalls: 0, chiefComplaint: 'Acute Chest Pain radiating to left arm & Dyspnea (Triage 5 Emergency)'
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
    // 7. UNIQUE MEDICAL HISTORY DATASETS PER PATIENT ACCOUNT
    // -----------------------------------------------------------------
    console.log('\n⚡ Seeding Unique Clinical Datasets per Patient Account...');

    // --- PATIENT 01: AARAV SHARMA (Cardiology & Acute Coronary Syndrome Profile) ---
    const aaravHistory = [
      {
        diag: 'Acute Coronary Syndrome / Essential Hypertension',
        notes: 'Patient presented with oppressive substernal chest discomfort. ECG revealed ST-segment changes. Severe allergy to Penicillin noted.',
        meds: [
          { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (Morning)', duration: '90 days' },
          { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily (After food)', duration: '90 days' },
          { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '90 days' }
        ],
        category: 'ALLERGY', content: 'Penicillin allergy (severe anaphylactic reaction)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Chest X-Ray Digital Scan', recordType: 'xray', doc: doctor01
      },
      {
        diag: 'Coronary Artery Stent Follow-Up & Lipid Control',
        notes: 'Post-angioplasty 6-month evaluation. Echocardiogram shows LVEF 55%. Lipid profile shows LDL 110 mg/dL.',
        meds: [
          { name: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', duration: '90 days' },
          { name: 'Metoprolol Succinate', dosage: '25mg', frequency: 'Once daily', duration: '90 days' }
        ],
        category: 'MEDICATION', content: 'Amlodipine (5mg once daily for hypertension)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Cardiac Enzymes & Lipid Blood Report', recordType: 'blood', doc: doctor01
      },
      {
        diag: 'Post-Angioplasty Rehabilitation & ECG Check',
        notes: 'Treadmill stress test completed. Maximum HR reached 145 bpm without ischemic changes.',
        meds: [{ name: 'Nitroglycerin sublingual', dosage: '0.4mg', frequency: 'As needed for chest discomfort', duration: '30 days' }],
        category: 'PROCEDURE', content: 'Percutaneous Coronary Intervention (PCI Stent in LAD)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: '12-Lead Electrocardiogram (ECG) Tracing', recordType: 'blood', doc: doctor01
      },
      {
        diag: 'Preventive Cardiac Vitals Review',
        notes: '24-hour Holter monitoring normal sinus rhythm. No sustained ventricular ectopy.',
        meds: [{ name: 'Omega-3 Ethyl Esters', dosage: '1000mg', frequency: 'Twice daily', duration: '60 days' }],
        category: 'INVESTIGATION', content: '24-Hour Holter Monitor (Normal Sinus Rhythm)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: '24-Hour Holter Telemetry Log', recordType: 'other', doc: doctor01
      },
      {
        diag: 'Emergency Cardiac Resuscitation Admission Note',
        notes: 'Emergency Bay arrival for sudden retrosternal squeezing pain. Administered oxygen and IV heparin.',
        meds: [{ name: 'Heparin Sodium IV', dosage: '5000 units', frequency: 'Stat dose', duration: '1 day' }],
        category: 'CONDITION', content: 'Ischemic Heart Disease (Angina Pectoris)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Emergency Department Resuscitation Report', recordType: 'other', doc: doctor02
      }
    ];

    // --- PATIENT 02: DIYA PATEL (Neurology & Chronic Migraine Profile) ---
    const diyaHistory = [
      {
        diag: 'Chronic Migraine with Aura & Vertigo',
        notes: 'Patient reports 4-5 headache episodes per month with scintillating scotoma visual aura. Brain MRI ordered.',
        meds: [
          { name: 'Sumatriptan', dosage: '50mg', frequency: 'At onset of migraine', duration: '10 days' },
          { name: 'Propranolol', dosage: '40mg', frequency: 'Twice daily (Prophylaxis)', duration: '60 days' }
        ],
        category: 'CONDITION', content: 'Chronic Migraine with Aura', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Brain MRI Scan Report', recordType: 'mri', doc: doctor01
      },
      {
        diag: 'Cervical Spine Degenerative Tension Note',
        notes: 'Cervical spinal radiograph shows mild C5-C6 disc space narrowing contributing to occipital headaches.',
        meds: [{ name: 'Naproxen', dosage: '250mg', frequency: 'Twice daily post meals', duration: '14 days' }],
        category: 'INVESTIGATION', content: 'Cervical Spine MRI (Mild C5-C6 Disc Prolapse)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Cervical Spine X-Ray Neutral View', recordType: 'xray', doc: doctor04
      },
      {
        diag: 'Neurological EEG Brainwave Examination',
        notes: '21-channel digital EEG routine tracing showing normal alpha rhythm without epileptiform discharges.',
        meds: [{ name: 'Magnesium Glycinate', dosage: '400mg', frequency: 'Once daily before sleep', duration: '90 days' }],
        category: 'PREFERENCE', content: 'Prefers non-sedating migraine prophylactic medication', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Electroencephalogram (EEG) Brain Tracing', recordType: 'other', doc: doctor01
      },
      {
        diag: 'Vitamin B12 Deficiency & Neuropathy Check',
        notes: 'Serum B12 180 pg/mL. Mild tingling paresthesia in extremities.',
        meds: [{ name: 'Methylcobalamin Injection', dosage: '1000mcg', frequency: 'Weekly for 5 weeks', duration: '5 weeks' }],
        category: 'INVESTIGATION', content: 'Serum Vitamin B12 Deficiency (180 pg/mL)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Serum Neuro-Vitamins & Micronutrient Panel', recordType: 'blood', doc: doctor04
      }
    ];

    // --- PATIENT 03: KABIR JOSHI (Endocrinology & Diabetic Nephropathy Profile) ---
    const kabirHistory = [
      {
        diag: 'Type 2 Diabetes Mellitus & Essential Hypertension',
        notes: 'Fasting blood sugar 168 mg/dL, HbA1c 8.2%. Patient statement claims no drug allergies.',
        meds: [
          { name: 'Metformin XR', dosage: '1000mg', frequency: 'Once daily with dinner', duration: '90 days' },
          { name: 'Empagliflozin', dosage: '10mg', frequency: 'Once daily (Morning)', duration: '90 days' },
          { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily', duration: '90 days' }
        ],
        category: 'ALLERGY', content: 'No known drug allergy (Patient statement)', confidence: 'CONFLICTED', status: 'CONFLICTED',
        conflictNotes: 'Contradictory clinical record detected: Prior 2024 consultation noted Penicillin allergy.',
        recordTitle: 'HbA1c & Glycemic Control Report', recordType: 'blood', doc: doctor03
      },
      {
        diag: 'Historical Penicillin Allergy Consultation Note (2024)',
        notes: 'Prior medical history review confirmed mild allergic skin rash to Oral Amoxicillin in 2024.',
        meds: [{ name: 'Linagliptin', dosage: '5mg', frequency: 'Once daily', duration: '90 days' }],
        category: 'ALLERGY', content: 'Penicillin allergy noted in 2024 consultation', confidence: 'CONFLICTED', status: 'CONFLICTED',
        conflictNotes: 'Contradicts patient statement: "No known drug allergy"',
        recordTitle: 'Comprehensive Renal Function & Microalbuminuria Test', recordType: 'blood', doc: doctor01
      },
      {
        diag: 'Diabetic Retinopathy Screening',
        notes: 'Fundus examination shows mild non-proliferative diabetic retinopathy. No macular edema.',
        meds: [{ name: 'Fenofibrate', dosage: '145mg', frequency: 'Once daily', duration: '90 days' }],
        category: 'CONDITION', content: 'Type 2 Diabetes Mellitus (HbA1c 8.2%)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Digital Ophthalmic Retinal Scan', recordType: 'other', doc: doctor03
      },
      {
        diag: 'Diabetic Peripheral Neuropathy & Foot Check',
        notes: 'Monofilament tactile sensation test normal. Good peripheral pulses bilaterally.',
        meds: [{ name: 'Alpha Lipoic Acid', dosage: '600mg', frequency: 'Once daily', duration: '60 days' }],
        category: 'MEDICATION', content: 'Metformin XR 1000mg daily', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Diabetic Peripheral Vascular Doppler Report', recordType: 'other', doc: doctor03
      }
    ];

    // --- PATIENT 04: ISHA DESHMUKH (Rheumatology & Joint Inflammation Profile) ---
    const ishaHistory = [
      {
        diag: 'Seropositive Rheumatoid Arthritis & Synovitis',
        notes: 'Symmetrical morning stiffness in PIP and MCP joints lasting >1 hour. Anti-CCP antibodies positive (>200 U/mL).',
        meds: [
          { name: 'Methotrexate', dosage: '15mg', frequency: 'Once weekly (Sunday)', duration: '12 weeks' },
          { name: 'Folic Acid', dosage: '5mg', frequency: 'Once daily except Sunday', duration: '12 weeks' },
          { name: 'Deflazacort', dosage: '6mg', frequency: 'Once daily (Morning)', duration: '14 days' }
        ],
        category: 'CONDITION', content: 'Seropositive Rheumatoid Arthritis', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Bilateral Hands & Wrists X-Ray', recordType: 'xray', doc: doctor03
      },
      {
        diag: 'Acute Knee Joint Effusion & Arthrocentesis',
        notes: 'Right knee joint swelling. Synovial fluid analysis negative for crystals or sepsis.',
        meds: [{ name: 'Hydroxychloroquine', dosage: '200mg', frequency: 'Twice daily', duration: '90 days' }],
        category: 'PROCEDURE', content: 'Right Knee Diagnostic Arthrocentesis', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Synovial Fluid Cytology & Culture Analysis', recordType: 'blood', doc: doctor04
      },
      {
        diag: 'Rheumatoid Inflammatory Marker Monitoring',
        notes: 'ESR 48 mm/hr, CRP 24 mg/L. Demonstrates steady improvement post disease-modifying therapy.',
        meds: [{ name: 'Calcium + Vit D3', dosage: '500mg/250IU', frequency: 'Twice daily', duration: '90 days' }],
        category: 'INVESTIGATION', content: 'Elevated Inflammatory Markers (ESR 48 mm/hr)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Inflammatory Markers Panel (ESR & High-Sensitivity CRP)', recordType: 'blood', doc: doctor03
      }
    ];

    // --- PATIENT 05: VIHAAN KAPOOR (Pulmonology & COPD Profile) ---
    const vihaanHistory = [
      {
        diag: 'Chronic Obstructive Pulmonary Disease (COPD) & Asthma',
        notes: 'Post-bronchodilator FEV1/FVC ratio 0.62. History of heavy smoking (20 pack-years). Breathlessness on exertion.',
        meds: [
          { name: 'Tiotropium Inhaler', dosage: '18mcg', frequency: '1 capsule inhalation daily', duration: '90 days' },
          { name: 'Budesonide + Formoterol Inhaler', dosage: '400mcg/12mcg', frequency: '2 puffs twice daily', duration: '90 days' }
        ],
        category: 'CONDITION', content: 'Chronic Obstructive Pulmonary Disease (COPD)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'High-Resolution Chest CT Scan (HRCT)', recordType: 'other', doc: doctor04
      },
      {
        diag: 'Spirometry Pulmonary Function Test Evaluation',
        notes: 'Forced Expiratory Volume in 1sec (FEV1) 68% predicted showing moderate airflow obstruction.',
        meds: [{ name: 'N-Acetylcysteine', dosage: '600mg', frequency: 'Effervescent tablet twice daily', duration: '30 days' }],
        category: 'INVESTIGATION', content: 'Spirometry Pulmonary Function Test (FEV1 68%)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Spirometry Pulmonary Function Graphs', recordType: 'other', doc: doctor04
      },
      {
        diag: 'Arterial Blood Gas (ABG) & Oxygenation Log',
        notes: 'PaO2 78 mmHg, PaCO2 42 mmHg, pH 7.41. SpO2 on room air 94%.',
        meds: [{ name: 'Doxofylline', dosage: '400mg', frequency: 'Once daily at bedtime', duration: '60 days' }],
        category: 'PREFERENCE', content: 'Prefers dry powder inhaler device over MDI', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Arterial Blood Gas Analysis (ABG)', recordType: 'blood', doc: doctor01
      }
    ];

    // --- PATIENT 06: MYRA NAIR (Gynecology/Endocrinology & Metabolic Profile) ---
    const myraHistory = [
      {
        diag: 'Polycystic Ovary Syndrome (PCOS) & Insulin Resistance',
        notes: 'Irregular menstrual cycles, hirsutism, fasting insulin 18 uIU/mL. Bilateral polycystic ovarian morphology on ultrasound.',
        meds: [
          { name: 'Myo-Inositol + D-Chiro Inositol', dosage: '2000mg/50mg', frequency: 'Twice daily in water', duration: '90 days' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily post meals', duration: '90 days' }
        ],
        category: 'CONDITION', content: 'Polycystic Ovary Syndrome (PCOS)', confidence: 'VERIFIED', status: 'ACTIVE',
        recordTitle: 'Pelvic Transvaginal Ultrasound Scan Report', recordType: 'other', doc: doctor04
      },
      {
        diag: 'Reproductive Endocrine Hormone Profile',
        notes: 'LH/FSH ratio 2.8:1. Serum total testosterone 65 ng/dL.',
        meds: [{ name: 'Spironolactone', dosage: '50mg', frequency: 'Once daily', duration: '90 days' }],
        category: 'INVESTIGATION', content: 'Hormonal Imbalance (LH/FSH Ratio 2.8:1)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Comprehensive Endocrine & Reproductive Hormone Panel', recordType: 'blood', doc: doctor01
      },
      {
        diag: 'Metabolic Glucose Tolerance Test (GTT)',
        notes: '2-hour oral glucose tolerance test 152 mg/dL indicating impaired glucose tolerance.',
        meds: [{ name: 'Vitamin D3 Granules', dosage: '60,000 IU', frequency: 'Once weekly for 8 weeks', duration: '8 weeks' }],
        category: 'INVESTIGATION', content: 'Impaired Oral Glucose Tolerance (152 mg/dL)', confidence: 'SUPPORTED', status: 'ACTIVE',
        recordTitle: 'Oral Glucose Tolerance Test 3-Point Graph', recordType: 'blood', doc: doctor03
      }
    ];

    const allPatientHistories = [
      { patient: P01, history: aaravHistory },
      { patient: P02, history: diyaHistory },
      { patient: P03, history: kabirHistory },
      { patient: P04, history: ishaHistory },
      { patient: P05, history: vihaanHistory },
      { patient: P06, history: myraHistory }
    ];

    let totalPrescriptions = 0;
    let totalRecords = 0;
    let totalMemories = 0;
    let totalAuditLogs = 0;
    let totalReviews = 0;

    for (let pIdx = 0; pIdx < allPatientHistories.length; pIdx++) {
      const { patient: p, history } = allPatientHistories[pIdx];

      // 1. Seed 6-8 historical completed appointments with unique complaints
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const pastDate = new Date(now.getTime() - ((i + 1) * 20 * 24 * 60 * 60 * 1000));
        const pastDateStr = pastDate.toISOString().split('T')[0];

        await Appointment.create({
          patientId: p.user._id,
          doctorId: item.doc._id,
          doctorName: item.doc.name,
          spec: item.doc.specialization,
          date: pastDateStr,
          time: '10:30 AM',
          status: 'Completed',
          hospitalId: p.cfg.hospital,
          hospitalName: p.cfg.hospital === hospital01._id ? hospital01.name : hospital02.name,
          baseToken: 500 + (pIdx * 10) + i,
          triageLevel: 2,
          chiefComplaint: `Historical OPD Visit: ${item.diag}`
        });

        // 2. Seed Prescription
        const rx = await Prescription.create({
          patientId: p.user._id,
          doctorId: item.doc._id,
          patientName: p.profile.name,
          doctorName: item.doc.name,
          diagnosis: item.diag,
          notes: item.notes,
          medications: item.meds,
          hospitalId: p.cfg.hospital,
          hospitalName: p.cfg.hospital === hospital01._id ? hospital01.name : hospital02.name,
          attachments: [
            {
              filename: `${item.recordTitle}.pdf`,
              url: makeMedicalSvg(item.recordTitle, `Patient: ${p.profile.name} | Verified Record`),
              type: item.recordType
            }
          ]
        });
        totalPrescriptions++;

        // 3. Seed Medical Record
        await MedicalRecord.create({
          patientId: p.profile._id,
          title: `${item.recordTitle} (${p.profile.name})`,
          type: item.recordType,
          fileUrl: makeMedicalSvg(item.recordTitle, `Patient: ${p.profile.name} | Diagnostic Report`),
          isPasswordProtected: item.recordType === 'mri',
          password: item.recordType === 'mri' ? 'Demo@123' : null
        });
        totalRecords++;

        // 4. Seed Patient Memory Card
        const normContent = item.content.toLowerCase().trim();
        await PatientMemory.create({
          patientId: p.user._id,
          category: item.category,
          type: 'FACT',
          content: item.content,
          normalizedContent: normContent,
          confidence: item.confidence,
          status: item.status,
          conflictNotes: item.conflictNotes || '',
          sourceRecordIds: [rx._id]
        });
        totalMemories++;

        // 5. Seed Audit Logs
        await AuditLog.create({
          actor: item.doc.name,
          actorRole: 'doctor',
          action: 'PRESCRIPTION_ISSUED',
          target: `Patient: ${p.profile.name} (${item.diag})`,
          severity: 'info',
          ip: '127.0.0.1'
        });
        totalAuditLogs++;
      }

      // Seed Memory Corrections for Patient 3 (Kabir Joshi) & Patient 1 (Aarav Sharma)
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
          comment: `Excellent consultation experience. AI clinical history summarization was completely accurate.`
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
    console.log('🎉 LIFEFILE / SCOS UNIQUE PATIENT SEEDING COMPLETE!');
    console.log('====================================================');
    console.log(`📊 SEEDED SUMMARY:`);
    console.log(`  - 🏥 Hospitals: 2`);
    console.log(`  - 👨‍⚕️ Doctors: 4`);
    console.log(`  - 👤 Patients: 6 Primary (${seededPatients.length} Unique Medical Profiles)`);
    console.log(`  - 📅 OPD Appointments: ${7 + totalPrescriptions} Total`);
    console.log(`  - 💊 Prescriptions: ${totalPrescriptions} Total (Unique Per Patient)`);
    console.log(`  - 📂 Medical Records: ${totalRecords} Total (Unique Per Patient)`);
    console.log(`  - 🧠 Patient Memories: ${totalMemories} Total (Unique Per Patient)`);
    console.log(`  - 📜 Security Audit Logs: ${totalAuditLogs + 3} Total`);
    console.log(`  - ⭐ Doctor Reviews: ${totalReviews} Total`);
    console.log(`  - ⚡ 100% DISTINCT CLINICAL HISTORIES GENERATED FOR ALL 6 PATIENTS!`);
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
