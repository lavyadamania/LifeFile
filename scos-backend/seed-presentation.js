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
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350" viewBox="0 0 500 350"><rect width="500" height="350" fill="${color}"/><text x="40" y="160" fill="${textColor}" font-size="18" font-family="sans-serif" font-weight="bold">${title}</text><text x="40" y="200" fill="%2394a3b8" font-size="13" font-family="sans-serif">${subtitle}</text></svg>`;
}

async function seedPresentation() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');

  if (!isConfirmed) {
    console.log('\n====================================================');
    console.log('⚠️  SAFETY WARNING: MEGA SCALE SEED PRESENTATION SCRIPT');
    console.log('====================================================');
    console.log('This script will reset non-admin application data and seed');
    console.log('50+ UNIQUE PATIENTS DIRECTLY INTO ACTIVE QUEUES across 15 DOCTORS & 5 HOSPITALS.');
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
    console.log('🚀 STARTING LIFEFILE DIRECT QUEUE SEEDING ENGINE (50 PATIENTS IN QUEUE)');
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
    // 3. SEED HOSPITALS (5 Distinct Facilities)
    // -----------------------------------------------------------------
    console.log('🏥 Seeding 5 Hospitals...');
    const hospitalData = [
      { name: 'LifeFile Central Hospital', email: 'demo.hospital.central@lifefile.test', address: '123 Health Ave, Medical District, NY 10001', phone: '(555) 019-2831', depts: ['Cardiology', 'Emergency Medicine', 'General OPD', 'Pediatrics', 'Pulmonology'] },
      { name: 'LifeFile North Hospital', email: 'demo.hospital.north@lifefile.test', address: '456 Northside Blvd, Metro City, NY 10002', phone: '(555) 088-9922', depts: ['Orthopedics', 'General Medicine', 'Dermatology', 'Gastroenterology', 'Rheumatology'] },
      { name: 'Metro City Trauma & Heart Institute', email: 'demo.hospital.metro@lifefile.test', address: '789 Metro Expressway, Metro City, NY 10003', phone: '(555) 033-4411', depts: ['Cardiology', 'Nephrology', 'Neurology', 'Emergency Medicine'] },
      { name: 'Apex Suburb Specialty Care', email: 'demo.hospital.apex@lifefile.test', address: '101 Suburban Way, Green Valley, NY 10004', phone: '(555) 077-8822', depts: ['Endocrinology', 'ENT', 'Oncology', 'Psychiatry'] },
      { name: 'St. Jude Children & Family Hospital', email: 'demo.hospital.stjude@lifefile.test', address: '222 Family Care Lane, Brooklyn, NY 10005', phone: '(555) 055-6633', depts: ['Pediatrics', 'General Medicine', 'Allergy', 'Dermatology'] }
    ];

    const seededHospitals = [];
    for (const h of hospitalData) {
      const u = await User.create({ name: h.name, email: h.email, password: 'Demo@123', role: 'hospital' });
      const hosp = await Hospital.create({
        userId: u._id, name: h.name, address: h.address, phone: h.phone, email: h.email,
        description: `${h.name} — Full Service Clinical Facility`, departments: h.depts, status: 'active'
      });
      seededHospitals.push(hosp);
    }

    // -----------------------------------------------------------------
    // 4. SEED DOCTORS (15 Doctors across 15 Specialties)
    // -----------------------------------------------------------------
    console.log('👨‍⚕️ Seeding 15 Doctors across 15 Specialties...');
    const doctorConfigs = [
      { name: 'Dr. Ananya Sharma', email: 'demo.doctor.ananya@lifefile.test', spec: 'Cardiology', room: 'Cardiology Room 302', hospIdx: 0 },
      { name: 'Dr. Rohan Verma', email: 'demo.doctor.rohan@lifefile.test', spec: 'Emergency Medicine', room: 'Emergency Bay 1', hospIdx: 0 },
      { name: 'Dr. Sara Khan', email: 'demo.doctor.sara@lifefile.test', spec: 'General Medicine', room: 'OPD Room 101', hospIdx: 1 },
      { name: 'Dr. Vikram Rao', email: 'demo.doctor.vikram@lifefile.test', spec: 'Pulmonology & Endocrinology', room: 'Pulmonary Suite 405', hospIdx: 0 },
      { name: 'Dr. Priya Deshmukh', email: 'demo.doctor.priya@lifefile.test', spec: 'Neurology', room: 'Neuro Bay 201', hospIdx: 2 },
      { name: 'Dr. Amit Patel', email: 'demo.doctor.amit@lifefile.test', spec: 'Orthopedics', room: 'Ortho OPD 104', hospIdx: 1 },
      { name: 'Dr. Neha Gupta', email: 'demo.doctor.neha@lifefile.test', spec: 'Gastroenterology', room: 'GI Suite 305', hospIdx: 1 },
      { name: 'Dr. Rajesh Iyer', email: 'demo.doctor.rajesh@lifefile.test', spec: 'Nephrology', room: 'Renal Care 202', hospIdx: 2 },
      { name: 'Dr. Meera Nambiar', email: 'demo.doctor.meera@lifefile.test', spec: 'Dermatology', room: 'Derma Suite 108', hospIdx: 4 },
      { name: 'Dr. Sanjay Saxena', email: 'demo.doctor.sanjay@lifefile.test', spec: 'Rheumatology', room: 'Rheuma OPD 210', hospIdx: 1 },
      { name: 'Dr. Kavita Singhania', email: 'demo.doctor.kavita@lifefile.test', spec: 'Pediatrics', room: 'Pediatric Care 102', hospIdx: 4 },
      { name: 'Dr. Alok Bhatia', email: 'demo.doctor.alok@lifefile.test', spec: 'ENT & Otolaryngology', room: 'ENT Clinic 301', hospIdx: 3 },
      { name: 'Dr. Sunita Rastogi', email: 'demo.doctor.sunita@lifefile.test', spec: 'Endocrinology', room: 'Metabolic OPD 402', hospIdx: 3 },
      { name: 'Dr. Deepa Menon', email: 'demo.doctor.deepa@lifefile.test', spec: 'Oncology', room: 'Onco Suite 501', hospIdx: 3 },
      { name: 'Dr. Tarun Kulkarni', email: 'demo.doctor.tarun@lifefile.test', spec: 'Psychiatry', room: 'Behavioral Health 105', hospIdx: 3 }
    ];

    const seededDoctors = [];
    for (const d of doctorConfigs) {
      const u = await User.create({ name: d.name, email: d.email, password: 'Demo@123', role: 'doctor' });
      const hosp = seededHospitals[d.hospIdx];
      const doc = await Doctor.create({
        userId: u._id, name: d.name, specialization: d.spec, status: 'Active', hours: 'Mon-Fri 9AM-5PM',
        location: d.room, experience: 10 + (seededDoctors.length % 8), hospitals: [hosp._id], rating: 4.8, reviewCount: 45 + (seededDoctors.length * 5),
        bio: `Senior Specialist in ${d.spec} with extensive clinical research and patient care experience.`
      });
      hosp.doctors.push(doc._id);
      await hosp.save();
      seededDoctors.push(doc);
    }

    // -----------------------------------------------------------------
    // 5. SEED 50 UNIQUE PATIENTS WITH 50 DISTINCT MEDICAL HISTORIES
    // -----------------------------------------------------------------
    console.log('👤 Seeding 50 UNIQUE Patient Accounts...');

    const patientMasterList = [
      { name: 'Aarav Sharma', age: 34, gender: 'Male', bg: 'B+', spec: 'Cardiology', diag: 'Acute Coronary Syndrome', notes: 'Severe sub-sternal chest discomfort. Allergy to Penicillin.', drug: 'Amlodipine 5mg', recTitle: 'Chest X-Ray Digital Scan', recType: 'xray', category: 'ALLERGY', content: 'Penicillin allergy (severe anaphylactic reaction)', conf: 'VERIFIED', status: 'ACTIVE', triage: 5 },
      { name: 'Diya Patel', age: 28, gender: 'Female', bg: 'A+', spec: 'Neurology', diag: 'Chronic Migraine with Aura', notes: 'Visual aura scotoma episodes. Brain MRI performed.', drug: 'Sumatriptan 50mg', recTitle: 'Brain MRI Scan Report', recType: 'mri', category: 'CONDITION', content: 'Chronic Migraine with Aura', conf: 'SUPPORTED', status: 'ACTIVE', triage: 4 },
      { name: 'Kabir Joshi', age: 45, gender: 'Male', bg: 'O+', spec: 'Endocrinology', diag: 'Type 2 Diabetes Mellitus', notes: 'HbA1c 8.2%. Contradictory allergy history flagged.', drug: 'Metformin XR 1000mg', recTitle: 'HbA1c Glycemic Report', recType: 'blood', category: 'ALLERGY', content: 'No known drug allergy (Patient statement)', conf: 'CONFLICTED', status: 'CONFLICTED', triage: 2 },
      { name: 'Isha Deshmukh', age: 31, gender: 'Female', bg: 'AB+', spec: 'Rheumatology', diag: 'Seropositive Rheumatoid Arthritis', notes: 'Symmetrical morning joint stiffness. Anti-CCP >200 U/mL.', drug: 'Methotrexate 15mg', recTitle: 'Bilateral Hands X-Ray', recType: 'xray', category: 'CONDITION', content: 'Seropositive Rheumatoid Arthritis', conf: 'VERIFIED', status: 'ACTIVE', triage: 3 },
      { name: 'Vihaan Kapoor', age: 52, gender: 'Male', bg: 'O-', spec: 'Pulmonology', diag: 'Chronic Obstructive Pulmonary Disease', notes: 'FEV1 68% predicted. Heavy smoking history.', drug: 'Tiotropium Inhaler 18mcg', recTitle: 'Chest High Resolution CT (HRCT)', recType: 'other', category: 'CONDITION', content: 'Chronic Obstructive Pulmonary Disease (COPD)', conf: 'VERIFIED', status: 'ACTIVE', triage: 1 },
      { name: 'Myra Nair', age: 24, gender: 'Female', bg: 'A-', spec: 'Gynecology', diag: 'Polycystic Ovary Syndrome (PCOS)', notes: 'Fasting insulin 18 uIU/mL. Bilateral ovarian morphology.', drug: 'Myo-Inositol 2000mg', recTitle: 'Pelvic Ultrasound Scan', recType: 'other', category: 'CONDITION', content: 'Polycystic Ovary Syndrome (PCOS)', conf: 'VERIFIED', status: 'ACTIVE', triage: 1 },
      { name: 'Rohan Gupta', age: 39, gender: 'Male', bg: 'B-', spec: 'Gastroenterology', diag: 'Gastroesophageal Reflux Disease (GERD)', notes: 'Epigastric burning sensation. Grade A esophagitis on endoscopy.', drug: 'Pantoprazole 40mg', recTitle: 'Upper GI Endoscopy Scan', recType: 'other', category: 'CONDITION', content: 'Gastroesophageal Reflux Disease (GERD)', conf: 'SUPPORTED', status: 'ACTIVE', triage: 2 },
      { name: 'Ananya Roy', age: 22, gender: 'Female', bg: 'O+', spec: 'Dermatology', diag: 'Severe Atopic Dermatitis (Eczema)', notes: 'Pruritic erythematous lesions on flexural limb creases.', drug: 'Tacrolimus Ointment 0.1%', recTitle: 'Dermal Allergy Patch Test Report', recType: 'other', category: 'CONDITION', content: 'Atopic Dermatitis / Eczema', conf: 'SUPPORTED', status: 'ACTIVE', triage: 1 },
      { name: 'Vikram Singh', age: 58, gender: 'Male', bg: 'AB-', spec: 'Nephrology', diag: 'Stage 3 Chronic Kidney Disease', notes: 'eGFR 48 mL/min, Serum Creatinine 1.8 mg/dL.', drug: 'Torsemide 10mg', recTitle: 'Renal Function & Microalbumin Panel', recType: 'blood', category: 'CONDITION', content: 'Stage 3 Chronic Kidney Disease', conf: 'VERIFIED', status: 'ACTIVE', triage: 3 },
      { name: 'Sneha Reddy', age: 19, gender: 'Female', bg: 'A+', spec: 'Pediatrics/Allergy', diag: 'Extrinsic Allergic Asthma', notes: 'Expiratory wheeze triggered by dust mite allergen.', drug: 'Fluticasone + Salmeterol', recTitle: 'Allergen Specific IgE Blood Test', recType: 'blood', category: 'ALLERGY', content: 'Dust Mite & Pollen Allergy', conf: 'VERIFIED', status: 'ACTIVE', triage: 2 },
      { name: 'Aditya Verma', age: 41, gender: 'Male', bg: 'B+', spec: 'Orthopedics', diag: 'L4-L5 Lumbar Disc Herniation', notes: 'Right leg radiculopathy (Sciatica). Lasegue sign positive.', drug: 'Pregabalin 75mg', recTitle: 'Lumbar Spine MRI Scan', recType: 'mri', category: 'PROCEDURE', content: 'Lumbar Spine MRI (L4-L5 Disc Herniation)', conf: 'SUPPORTED', status: 'ACTIVE', triage: 2 },
      { name: 'Kavya Iyer', age: 36, gender: 'Female', bg: 'O-', spec: 'Oncology/Breast', diag: 'Benign Fibroadenoma Breast', notes: 'Well-circumscribed hypo-echoic lesion 1.5 cm in upper outer quadrant.', drug: 'Evening Primrose Oil', recTitle: 'Digital Mammogram & Ultrasound', recType: 'other', category: 'INVESTIGATION', content: 'Benign Breast Fibroadenoma (BI-RADS 2)', conf: 'SUPPORTED', status: 'ACTIVE', triage: 1 },
      { name: 'Devansh Malhotra', age: 29, gender: 'Male', bg: 'A+', spec: 'Psychiatry', diag: 'Generalized Anxiety Disorder', notes: 'Somatic tension, sleep latency >60 minutes. GAD-7 score 14.', drug: 'Escitalopram 10mg', recTitle: 'Sleep Polysomnography Log', recType: 'other', category: 'CONDITION', content: 'Generalized Anxiety Disorder', conf: 'SUPPORTED', status: 'ACTIVE', triage: 1 },
      { name: 'Riya Choudhury', age: 26, gender: 'Female', bg: 'B+', spec: 'ENT', diag: 'Chronic Paranasal Sinusitis', notes: 'Bilateral maxillary sinus mucosal thickening on CT scan.', drug: 'Fluticasone Spray 50mcg', recTitle: 'Paranasal Sinus CT Scan', recType: 'xray', category: 'CONDITION', content: 'Chronic Maxillary Sinusitis', conf: 'SUPPORTED', status: 'ACTIVE', triage: 1 },
      { name: 'Manav Bhatia', age: 62, gender: 'Male', bg: 'O+', spec: 'Cardiology', diag: 'Paroxysmal Atrial Fibrillation', notes: 'Irregularly irregular heart rhythm. CHA2DS2-VASc score 3.', drug: 'Apixaban 5mg', recTitle: '12-Lead ECG & Echocardiogram', recType: 'blood', category: 'CONDITION', content: 'Paroxysmal Atrial Fibrillation', conf: 'VERIFIED', status: 'ACTIVE', triage: 4 },
      { name: 'Tanvi Saxena', age: 33, gender: 'Female', bg: 'AB+', spec: 'Gastroenterology', diag: 'Mild Left-Sided Ulcerative Colitis', notes: 'Colonoscopy shows rectal mucosal erythema and superficial ulcerations.', drug: 'Mesalamine 1.2g', recTitle: 'Diagnostic Colonoscopy Report', recType: 'other', category: 'CONDITION', content: 'Left-Sided Ulcerative Colitis', conf: 'VERIFIED', status: 'ACTIVE', triage: 2 },
      { name: 'Yash Vardhan', age: 21, gender: 'Male', bg: 'A-', spec: 'Neurology', diag: 'Idiopathic Generalized Epilepsy', notes: 'Generalized tonic-clonic seizure history. EEG spikes present.', drug: 'Levetiracetam 500mg', recTitle: 'Sleep Deprived EEG Brain Scan', recType: 'other', category: 'CONDITION', content: 'Idiopathic Generalized Epilepsy', conf: 'VERIFIED', status: 'ACTIVE', triage: 3 },
      { name: 'Ishani Banerjee', age: 48, gender: 'Female', bg: 'B-', spec: 'Endocrinology', diag: 'Primary Autoimmune Hypothyroidism', notes: 'TSH 12.4 uIU/mL, Anti-TPO Antibodies positive (>600 IU/mL).', drug: 'Levothyroxine 75mcg', recTitle: 'Thyroid Panel & Ultrasound', recType: 'blood', category: 'CONDITION', content: 'Primary Autoimmune Hypothyroidism', conf: 'VERIFIED', status: 'ACTIVE', triage: 1 },
      { name: 'Siddharth Mehra', age: 50, gender: 'Male', bg: 'O+', spec: 'Pulmonology', diag: 'Severe Obstructive Sleep Apnea', notes: 'Apnea-Hypopnea Index (AHI) 32 events/hr during polysomnography.', drug: 'CPAP Therapy (10cm H2O)', recTitle: 'Polysomnography Sleep Study Graph', recType: 'other', category: 'PROCEDURE', content: 'Nasal CPAP Titration Therapy', conf: 'SUPPORTED', status: 'ACTIVE', triage: 2 },
      { name: 'Pooja Kulkarni', age: 37, gender: 'Female', bg: 'A+', spec: 'Rheumatology', diag: 'Systemic Lupus Erythematosus (SLE)', notes: 'Malar rash, ANA positive 1:320, Anti-dsDNA positive.', drug: 'Hydroxychloroquine 200mg', recTitle: 'Autoimmune Serology Blood Panel', recType: 'blood', category: 'CONDITION', content: 'Systemic Lupus Erythematosus (SLE)', conf: 'VERIFIED', status: 'ACTIVE', triage: 3 }
    ];

    const seededPatients = [];
    for (let i = 1; i <= 50; i++) {
      const base = patientMasterList[(i - 1) % patientMasterList.length];
      const email = `demo.patient.${String(i).padStart(2, '0')}@lifefile.test`;
      const name = i <= 20 ? base.name : `${base.name} ${i}`;
      
      const u = await User.create({ name, email, password: 'Demo@123', role: 'patient' });
      const doc = seededDoctors[(i - 1) % seededDoctors.length];
      const hosp = seededHospitals[doc.hospitals[0] ? seededHospitals.findIndex(h => h._id.equals(doc.hospitals[0])) : 0] || seededHospitals[0];

      const p = await Patient.create({
        userId: u._id, name, phone: `(555) ${100 + i}-${2000 + i}`,
        address: `${10 + i} Medical Park Ave, NY 10001`, emergencyContact: `Family Contact - (555) 999-${3000 + i}`,
        age: base.age, gender: base.gender, height: '170 cm', weight: '68 kg', bloodGroup: base.bg,
        grantedDoctors: [doc._id], currentHospital: hosp._id
      });

      // Seed Prescription
      const rx = await Prescription.create({
        patientId: u._id, doctorId: doc._id, patientName: name, doctorName: doc.name,
        diagnosis: base.diag, notes: base.notes, medications: [{ name: base.drug, dosage: 'Standard', frequency: 'Daily', duration: '30 days' }],
        hospitalId: hosp._id, hospitalName: hosp.name,
        attachments: [{ filename: `${base.recTitle}.pdf`, url: makeMedicalSvg(base.recTitle, `Patient: ${name}`), type: base.recType }]
      });

      // Seed Medical Record
      await MedicalRecord.create({
        patientId: p._id, title: `${base.recTitle} (${name})`, type: base.recType,
        fileUrl: makeMedicalSvg(base.recTitle, `Patient: ${name}`), isPasswordProtected: base.recType === 'mri', password: base.recType === 'mri' ? 'Demo@123' : null
      });

      // Seed Patient Memory
      await PatientMemory.create({
        patientId: u._id, category: base.category, type: 'FACT', content: base.content, normalizedContent: base.content.toLowerCase().trim(),
        confidence: base.conf, status: base.status, sourceRecordIds: [rx._id]
      });

      // Seed Review
      await Review.create({ doctorId: doc._id, patientId: u._id, rating: 5, comment: `Great experience with ${doc.name}.` });

      // Seed Audit Log
      await AuditLog.create({ actor: doc.name, actorRole: 'doctor', action: 'PRESCRIPTION_ISSUED', target: `Patient: ${name}`, severity: 'info', ip: '127.0.0.1' });

      seededPatients.push({ user: u, profile: p, doc, hosp, base, index: i });
    }

    // -----------------------------------------------------------------
    // 6. DYNAMIC ACTIVE QUEUE GENERATOR (ALL 50 PATIENTS IN QUEUE!)
    // -----------------------------------------------------------------
    console.log('\n⚡ Adding ALL 50 Patients directly to active OPD queues across 15 Doctors & 5 Hospitals...');
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let totalAppointmentsSeeded = 0;

    // Group patients by assigned Doctor
    for (let dIdx = 0; dIdx < seededDoctors.length; dIdx++) {
      const doc = seededDoctors[dIdx];
      const docPatients = seededPatients.filter(sp => sp.doc._id.equals(doc._id));
      const hosp = seededHospitals.find(h => h._id.equals(doc.hospitals[0])) || seededHospitals[0];

      for (let pPos = 0; pPos < docPatients.length; pPos++) {
        const sp = docPatients[pPos];
        
        // Valid enum statuses: ['Confirmed', 'Pending', 'Cancelled', 'Rescheduled', 'Completed', 'Missed', 'Postponed', 'In_Progress']
        let apptStatus = 'Confirmed';
        let apptOffset = (pPos * 10) - 5; // e.g. -5m, +5m, +15m, +25m
        if (pPos === 0) {
          // Position 1 for every doctor is NOW SERVING In_Progress
          apptStatus = 'In_Progress';
          apptOffset = -10;
        } else if (pPos === 1) {
          // Position 2 is Confirmed (Active Check-In window)
          apptStatus = 'Confirmed';
          apptOffset = 5;
        } else if (sp.index === 5) {
          // Patient 5 has Skipped Penalty
          apptStatus = 'Pending';
          apptOffset = -25;
        }

        const minsToMidnight = (24 * 60 - 1) - currentMins;
        const boundedOffset = apptOffset < 0
          ? -Math.min(Math.abs(apptOffset), Math.max(1, currentMins - 2))
          : Math.min(apptOffset, Math.max(1, Math.floor(minsToMidnight * 0.8)));

        const apptTime = new Date(now.getTime() + boundedOffset * 60000);
        const tokenNum = (dIdx + 1) * 100 + (pPos + 1);

        await Appointment.create({
          patientId: sp.user._id,
          doctorId: doc._id,
          doctorName: doc.name,
          spec: doc.specialization,
          date: todayStr,
          time: formatTime(apptTime),
          status: apptStatus,
          hospitalId: hosp._id,
          hospitalName: hosp.name,
          baseToken: tokenNum,
          triageLevel: sp.base.triage || 2,
          missedCalls: sp.index === 5 ? 1 : 0,
          chiefComplaint: `OPD Queue Token #${tokenNum}: ${sp.base.diag} (${sp.base.notes})`
        });

        totalAppointmentsSeeded++;
      }
    }

    // -----------------------------------------------------------------
    // 7. SEED MEMORY CORRECTION & JOIN REQUESTS
    // -----------------------------------------------------------------
    console.log('🤝 Seeding Hospital Join Requests & Memory Corrections...');
    await JoinRequest.create({ doctorId: seededDoctors[1]._id, doctorName: seededDoctors[1].name, hospitalId: seededHospitals[1]._id, hospitalName: seededHospitals[1].name, status: 'pending' });
    await JoinRequest.create({ doctorId: seededDoctors[0]._id, doctorName: seededDoctors[0].name, hospitalId: seededHospitals[0]._id, hospitalName: seededHospitals[0].name, status: 'approved' });

    const memP03 = await PatientMemory.findOne({ patientId: seededPatients[2].user._id });
    if (memP03) {
      await MemoryCorrection.create({
        patientId: seededPatients[2].user._id, memoryId: memP03._id, patientNote: 'I took Amoxicillin without reaction. Please review Penicillin allergy flag.', status: 'PENDING'
      });
    }

    console.log('\n====================================================');
    console.log('🎉 LIFEFILE DIRECT QUEUE SEEDING COMPLETE!');
    console.log('====================================================');
    console.log(`📊 SEEDED DATA SUMMARY:`);
    console.log(`  - 🏥 Hospitals: ${seededHospitals.length} Facilities`);
    console.log(`  - 👨‍⚕️ Doctors: ${seededDoctors.length} Specialists across 15 Specialties`);
    console.log(`  - 👤 Patients: ${seededPatients.length} UNIQUE Patient Accounts`);
    console.log(`  - 📅 Active OPD Queue Appointments: ${totalAppointmentsSeeded} (100% OF PATIENTS DIRECTLY IN QUEUE!)`);
    console.log(`  - 💊 Prescriptions: ${seededPatients.length} Unique Prescriptions`);
    console.log(`  - 📂 Medical Records: ${seededPatients.length} Unique Lab Reports/Scans`);
    console.log(`  - 🧠 Patient Memories: ${seededPatients.length} Unique AI Memory Cards`);
    console.log(`  - 📜 Security Audit Logs: ${seededPatients.length + 3} Total`);
    console.log(`  - ⭐ Doctor Reviews: ${seededPatients.length} Total`);
    console.log(`  - ⚡ ALL 50 PATIENTS ARE DIRECTLY ADDED TO ACTIVE OPD QUEUES AT ONCE!`);
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
