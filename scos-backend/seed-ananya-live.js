require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Hospital = require('./models/Hospital');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const MedicalRecord = require('./models/MedicalRecord');
const PatientMemory = require('./models/PatientMemory');

function formatTime(d) {
  let h = d.getHours();
  let m = d.getMinutes();
  const meridian = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
}

function makeMedicalSvg(title, subtitle, color = '%230f172a', textColor = '%2338bdf8') {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350" viewBox="0 0 500 350"><rect width="500" height="350" fill="${color}"/><text x="40" y="150" fill="${textColor}" font-size="18" font-family="sans-serif" font-weight="bold">${title}</text><text x="40" y="190" fill="%2394a3b8" font-size="13" font-family="sans-serif">${subtitle}</text><rect x="40" y="220" width="420" height="8" rx="4" fill="%2322c55e"/><text x="40" y="260" fill="%23e2e8f0" font-size="11" font-family="monospace">VALIDATED BY LIFEFILE SCOS</text></svg>`;
}

async function seedAnanyaLive() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/scos';
  console.log('====================================================================');
  console.log('⚡ SCOS REAL-TIME SEEDER: DR. ANANYA SHARMA (30 HOSPITAL + 10 PRIVATE)');
  console.log('====================================================================');
  console.log(`Connecting to: ${mongoUri}...`);

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  // 1. Find or Ensure Central Hospital
  let centralHosp = await Hospital.findOne({ name: /Central/i });
  if (!centralHosp) {
    let hospUser = await User.findOne({ email: 'demo.hospital.central@lifefile.test' });
    if (!hospUser) {
      hospUser = await User.create({
        name: 'LifeFile Central Hospital',
        email: 'demo.hospital.central@lifefile.test',
        password: 'Demo@123',
        role: 'hospital'
      });
    }
    centralHosp = await Hospital.create({
      userId: hospUser._id,
      name: 'LifeFile Central Hospital',
      address: '123 Health Ave, Medical District, NY 10001',
      phone: '(555) 019-2831',
      email: hospUser.email,
      description: 'LifeFile Central Hospital — Full Service Clinical Facility & Trauma Hub',
      departments: ['Cardiology', 'Emergency Medicine', 'General OPD', 'Pediatrics', 'Pulmonology'],
      status: 'active'
    });
  }
  console.log(`🏥 Hospital: ${centralHosp.name} (${centralHosp._id})`);

  // 2. Find or Ensure Dr. Ananya Sharma
  let ananyaDoc = await Doctor.findOne({ name: /Ananya/i });
  let ananyaUser = await User.findOne({ email: 'demo.doctor.ananya@lifefile.test' });

  if (!ananyaUser) {
    ananyaUser = await User.create({
      name: 'Dr. Ananya Sharma',
      email: 'demo.doctor.ananya@lifefile.test',
      password: 'Demo@123',
      role: 'doctor'
    });
  }

  if (!ananyaDoc) {
    ananyaDoc = await Doctor.create({
      userId: ananyaUser._id,
      name: 'Dr. Ananya Sharma',
      specialization: 'Cardiology',
      status: 'Active',
      hours: 'Mon-Fri, 9AM-5PM',
      location: 'Cardiology Room 302',
      experience: 14,
      hospitals: [centralHosp._id],
      rating: 4.9,
      reviewCount: 65,
      bio: 'Senior Interventional Cardiologist specializing in ischemic heart disease, heart failure, and complex arrhythmias.'
    });
  } else {
    // Ensure hospital affiliation is active
    if (!ananyaDoc.hospitals.some(h => h.toString() === centralHosp._id.toString())) {
      ananyaDoc.hospitals.push(centralHosp._id);
      await ananyaDoc.save();
    }
  }
  console.log(`👨‍⚕️ Doctor: ${ananyaDoc.name} (${ananyaDoc._id}) — ${ananyaDoc.specialization}`);

  // 3. Load existing patients from DB (P01–P50)
  console.log('👥 Loading existing patients from DB (P01–P50)...');
  const patients = [];
  for (let i = 1; i <= 50; i++) {
    const pad = String(i).padStart(2, '0');
    const email = `demo.patient.${pad}@lifefile.test`;
    const u = await User.findOne({ email });
    if (!u) {
      console.error(`❌ Patient P${pad} (${email}) not found in DB — run 'npm run seed' first!`);
      await mongoose.disconnect();
      process.exit(1);
    }
    let p = await Patient.findOne({ userId: u._id });
    if (!p) {
      p = await Patient.create({
        userId: u._id,
        name: u.name
      });
      console.log(`ℹ️ Created missing patient profile for P${pad} (${email})`);
    }
    patients.push({ user: u, profile: p, index: i });
  }
  console.log(`✅ Loaded ${patients.length} existing patients (P01–P50) — no new patients created`);

  // 4. Clean previous appointments AND prescriptions for Dr. Ananya
  await Appointment.deleteMany({ doctorId: ananyaDoc._id });
  await Prescription.deleteMany({ doctorId: ananyaDoc._id });
  console.log(`🧹 Cleaned existing appointments & prescriptions for Dr. Ananya Sharma`);

  // 5. Generate Dynamic Appointments FROM CURRENT RUNTIME (Local Time)
  const toLocalYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayStr = toLocalYMD(now);
  console.log(`\n📅 Real-time Reference: ${now.toLocaleTimeString()} (${todayStr})`);

  // Helper date generators for past completed appointments
  const daysAgo = (d) => {
    const dt = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    return toLocalYMD(dt);
  };

  // The first 20 hospital appointments are already checked in and waiting.
  // The next 10 are confirmed bookings whose slots begin one hour after seeding.
  const queueScenarios = [
    { triage: 5, waitMins: 5, missedCalls: 0, complaint: 'EMERGENCY: suspected acute coronary syndrome with severe chest pain.' },
    { triage: 5, waitMins: 12, missedCalls: 1, complaint: 'EMERGENCY: acute respiratory distress with cardiac history.' },
    { triage: 5, waitMins: 2, missedCalls: 0, complaint: 'EMERGENCY: collapse with suspected life-threatening arrhythmia.' },
    { triage: 4, waitMins: 25, missedCalls: 0, complaint: 'HIGH: severe chest pain with abnormal ECG findings.' },
    { triage: 4, waitMins: 18, missedCalls: 1, complaint: 'HIGH: worsening shortness of breath and low oxygen saturation.' },
    { triage: 4, waitMins: 10, missedCalls: 2, complaint: 'HIGH: persistent tachycardia; patient missed two calls.' },
    { triage: 4, waitMins: 4, missedCalls: 0, complaint: 'HIGH: possible deep vein thrombosis with chest symptoms.' },
    { triage: 3, waitMins: 180, missedCalls: 0, complaint: 'MODERATE: prolonged wait, stable but worsening palpitations.' },
    { triage: 3, waitMins: 90, missedCalls: 1, complaint: 'MODERATE: dizziness and intermittent irregular heartbeat.' },
    { triage: 3, waitMins: 45, missedCalls: 0, complaint: 'MODERATE: uncontrolled hypertension with headache.' },
    { triage: 3, waitMins: 25, missedCalls: 2, complaint: 'MODERATE: follow-up; patient has missed two calls.' },
    { triage: 3, waitMins: 10, missedCalls: 0, complaint: 'MODERATE: persistent fatigue and exertional breathlessness.' },
    { triage: 3, waitMins: 0, missedCalls: 0, complaint: 'MODERATE: same-time arrival for chest discomfort review.' },
    { triage: 2, waitMins: 150, missedCalls: 0, complaint: 'LOW: long-wait follow-up for stable coronary disease.' },
    { triage: 2, waitMins: 75, missedCalls: 1, complaint: 'LOW: routine medication review after one missed call.' },
    { triage: 2, waitMins: 30, missedCalls: 0, complaint: 'LOW: stable blood pressure follow-up.' },
    { triage: 2, waitMins: 0, missedCalls: 0, complaint: 'LOW: stable follow-up, checked in at seed time.' },
    { triage: 1, waitMins: 210, missedCalls: 0, complaint: 'ROUTINE: long-wait preventive cardiology review.' },
    { triage: 1, waitMins: 60, missedCalls: 1, complaint: 'ROUTINE: annual check-up after one missed call.' },
    { triage: 1, waitMins: 0, missedCalls: 0, complaint: 'ROUTINE: preventive screening, checked in at seed time.' }
  ];
  const hospitalConfigs = [
    ...queueScenarios.map((scenario, i) => ({
      pIdx: i,
      status: 'Pending', // checked in; visible in the active queue immediately
      // Keep every checked-in appointment on today's queue, even if seeding near midnight.
      offsetMins: -Math.min(scenario.waitMins, now.getHours() * 60 + now.getMinutes()),
      token: 101 + i,
      triage: scenario.triage,
      missedCalls: scenario.missedCalls,
      complaint: scenario.complaint
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      pIdx: 20 + i,
      status: 'Confirmed',
      offsetMins: 60,
      token: 121 + i,
      triage: (i % 3) + 1,
      missedCalls: 0,
      complaint: `SCHEDULED +1 HOUR: ${['routine cardiology review', 'moderate blood pressure follow-up', 'stable palpitations evaluation'][i % 3]}.`
    }))
  ];

  for (const cfg of hospitalConfigs) {
    const pt = patients[cfg.pIdx];
    const apptTime = new Date(now.getTime() + cfg.offsetMins * 60000);

    await Appointment.create({
      patientId: pt.user._id,
      patientName: pt.user.name,
      doctorId: ananyaDoc._id,
      doctorName: ananyaDoc.name,
      spec: ananyaDoc.specialization,
      date: cfg.date || toLocalYMD(apptTime),
      time: formatTime(apptTime),
      status: cfg.status,
      hospitalId: centralHosp._id,
      hospitalName: centralHosp.name,
      location: 'Cardiology Room 302',
      baseToken: cfg.token,
      triageLevel: cfg.triage,
      missedCalls: cfg.missedCalls || 0,
      chiefComplaint: cfg.complaint,
      checkedInAt: cfg.status === 'Pending' ? apptTime : null,
      createdAt: now
    });
  }

  // 10 private clinic appointments are also checked in at seed time.
  console.log('🩺 Creating 10 checked-in private clinic appointments...');
  const privateConfigs = Array.from({ length: 10 }, (_, i) => ({
    pIdx: 30 + i,
    status: 'Pending',
    offsetMins: 0,
    token: i + 1,
    triage: (i % 5) + 1,
    missedCalls: i % 4 === 0 ? 1 : 0,
    complaint: `PRIVATE CLINIC: ${['routine prevention', 'stable follow-up', 'moderate palpitations', 'blood pressure review', 'cardiology consultation'][i % 5]}.`
  }));

  const allAppointmentConfigs = [...hospitalConfigs, ...privateConfigs];
  const assignedPatientIds = allAppointmentConfigs.map(cfg => String(patients[cfg.pIdx].user._id));
  if (new Set(assignedPatientIds).size !== assignedPatientIds.length) {
    throw new Error('Ananya seed assigns the same patient to more than one appointment');
  }
  const waitingHospitalConfigs = hospitalConfigs.filter(cfg => cfg.status === 'Pending');
  const waitingTriageLevels = new Set(waitingHospitalConfigs.map(cfg => cfg.triage));
  if (waitingHospitalConfigs.length !== 20 || [1, 2, 3, 4, 5].some(level => !waitingTriageLevels.has(level))) {
    throw new Error('Ananya seed must create 20 unique active hospital patients across triage levels 1–5');
  }

  for (const cfg of privateConfigs) {
    const pt = patients[cfg.pIdx];
    const apptTime = new Date(now.getTime() + cfg.offsetMins * 60000);

    await Appointment.create({
      patientId: pt.user._id,
      patientName: pt.user.name,
      doctorId: ananyaDoc._id,
      doctorName: ananyaDoc.name,
      spec: ananyaDoc.specialization,
      date: cfg.date || toLocalYMD(apptTime),
      time: formatTime(apptTime),
      status: cfg.status,
      hospitalId: null, // Private mode has hospitalId null
      hospitalName: 'Dr. Ananya Private Cardiology Clinic',
      location: 'Private Consulting Suite A',
      baseToken: cfg.token,
      triageLevel: cfg.triage,
      missedCalls: cfg.missedCalls || 0,
      chiefComplaint: cfg.complaint,
      checkedInAt: cfg.status === 'Pending' ? apptTime : null,
      createdAt: now
    });
  }

  // 6. Seed Prescriptions Issued by Dr. Ananya Sharma (Hospital & Private)
  console.log('💊 Seeding Prescriptions for Dr. Ananya Sharma...');
  // (already deleted in step 4 above)

  const prescriptionDefs = [
    {
      pIdx: 0, hospId: centralHosp._id, hospName: centralHosp.name, date: todayStr,
      diag: 'Acute Coronary Syndrome & Unstable Angina',
      notes: 'Emergency heparinization completed. Avoid beta-lactam antibiotics due to severe penicillin anaphylaxis.',
      meds: [
        { name: 'Atorvastatin', dosage: '80mg', frequency: 'Once daily at night', duration: '30 days' },
        { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily morning', duration: '30 days' },
        { name: 'Metoprolol Succinate', dosage: '50mg', frequency: 'Twice daily', duration: '15 days' },
        { name: 'Nitro-lingual Spray', dosage: '0.4mg', frequency: 'Sublingual PRN for chest pain', duration: 'As needed' }
      ]
    },
    {
      pIdx: 1, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(1),
      diag: 'Cerebral Ischemia & Migraine with Aura',
      notes: 'Target BP < 125/80 mmHg. Review Brain MRI scan in 1 week.',
      meds: [
        { name: 'Propranolol', dosage: '40mg', frequency: 'Once daily morning', duration: '30 days' },
        { name: 'Aspirin (Enteric Coated)', dosage: '75mg', frequency: 'Once daily with meal', duration: '60 days' },
        { name: 'CoQ10', dosage: '100mg', frequency: 'Once daily', duration: '30 days' }
      ]
    },
    {
      pIdx: 2, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(2),
      diag: 'Essential Hypertension Stage 2',
      notes: 'Strict dietary salt reduction < 2g/day. Monitor home BP morning and evening.',
      meds: [
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily morning', duration: '30 days' },
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily night', duration: '30 days' },
        { name: 'Metformin XR', dosage: '500mg', frequency: 'Once daily after dinner', duration: '30 days' }
      ]
    },
    {
      pIdx: 3, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(4),
      diag: 'Rheumatic Heart Disease with Mitral Regurgitation',
      notes: 'Dental antibiotic prophylaxis protocol advised before any procedure.',
      meds: [
        { name: 'Erythromycin', dosage: '250mg', frequency: 'Twice daily (Penicillin substitute)', duration: '10 days' },
        { name: 'Furosemide', dosage: '20mg', frequency: 'Once daily morning', duration: '30 days' }
      ]
    },
    {
      pIdx: 14, hospId: centralHosp._id, hospName: centralHosp.name, date: todayStr,
      diag: 'Paroxysmal Atrial Fibrillation',
      notes: 'CHA2DS2-VASc score 3. Anticoagulation initiated.',
      meds: [
        { name: 'Apixaban', dosage: '5mg', frequency: 'Twice daily', duration: '60 days' },
        { name: 'Diltiazem CD', dosage: '120mg', frequency: 'Once daily morning', duration: '30 days' }
      ]
    },
    {
      pIdx: 15, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(3),
      diag: 'Hypertensive Urgency (Resolved)',
      notes: 'Repeat renal Doppler test if BP remains above 140/90.',
      meds: [
        { name: 'Labetalol', dosage: '100mg', frequency: 'Twice daily', duration: '14 days' },
        { name: 'Rosuvastatin', dosage: '10mg', frequency: 'Once daily night', duration: '30 days' }
      ]
    },
    {
      pIdx: 16, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(6),
      diag: 'Vasovagal Syncope & Orthostatic Intolerance',
      notes: 'Adequate hydration > 2.5L/day. Compression stockings recommended.',
      meds: [
        { name: 'Midodrine', dosage: '5mg', frequency: 'Three times daily before meals', duration: '20 days' }
      ]
    },
    {
      pIdx: 17, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(8),
      diag: 'Hypothyroid Bradycardia & Dyslipidemia',
      notes: 'Co-managed with Endocrinology. Follow-up ECG in 4 weeks.',
      meds: [
        { name: 'Levothyroxine', dosage: '50mcg', frequency: 'Once daily empty stomach', duration: '60 days' },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily night', duration: '30 days' }
      ]
    },
    {
      pIdx: 18, hospId: centralHosp._id, hospName: centralHosp.name, date: daysAgo(12),
      diag: 'Pulmonary Arterial Hypertension (Group 3)',
      notes: 'Continue nocturnal CPAP compliance. Avoid heavy isometric exertion.',
      meds: [
        { name: 'Sildenafil Citrate', dosage: '20mg', frequency: 'Three times daily', duration: '30 days' },
        { name: 'Spironolactone', dosage: '25mg', frequency: 'Once daily morning', duration: '30 days' }
      ]
    },
    // Private Prescriptions
    {
      pIdx: 23, hospId: null, hospName: 'Dr. Ananya Private Cardiology Clinic', date: daysAgo(1),
      diag: 'Refractory Systolic Hypertension',
      notes: 'Private clinic consultation. Dual ARB + Thiazide combination therapy prescribed.',
      meds: [
        { name: 'Olmesartan Medoxomil', dosage: '40mg', frequency: 'Once daily morning', duration: '30 days' },
        { name: 'Chlorthalidone', dosage: '12.5mg', frequency: 'Once daily morning', duration: '30 days' }
      ]
    },
    {
      pIdx: 24, hospId: null, hospName: 'Dr. Ananya Private Cardiology Clinic', date: daysAgo(3),
      diag: 'Severe Hypercholesterolemia & Atherosclerosis Prevention',
      notes: 'Private wellness review. Target LDL-C < 55 mg/dL.',
      meds: [
        { name: 'Rosuvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: '60 days' },
        { name: 'Ezetimibe', dosage: '10mg', frequency: 'Once daily with dinner', duration: '60 days' }
      ]
    }
  ];

  for (const rx of prescriptionDefs) {
    const pt = patients[rx.pIdx];
    await Prescription.create({
      patientId: pt.user._id,
      patientName: pt.user.name,
      doctorId: ananyaDoc._id,
      doctorName: ananyaDoc.name,
      hospitalId: rx.hospId,
      hospitalName: rx.hospName,
      diagnosis: rx.diag,
      notes: rx.notes,
      medications: rx.meds,
      createdAt: new Date(new Date(rx.date).getTime() + 11 * 3600 * 1000)
    });
  }

  // 7. Seed Medical Records for Patients (Medical Timeline)
  console.log('📂 Seeding Medical Records & Timelines for Patients...');
  const recordDefs = [
    { pIdx: 0, title: '12-Lead Electrocardiogram (ECG) Report', type: 'other', pass: false },
    { pIdx: 0, title: 'Cardiac Troponin-I Quantitative Panel', type: 'blood', pass: false },
    { pIdx: 0, title: 'Digital Chest X-Ray (AP View)', type: 'xray', pass: false },
    { pIdx: 1, title: '3-Tesla Brain MRI Scan with Angiography', type: 'mri', pass: true },
    { pIdx: 1, title: 'Carotid Duplex Ultrasound Study', type: 'other', pass: false },
    { pIdx: 2, title: 'Glycated Hemoglobin (HbA1c 8.2%) Panel', type: 'blood', pass: false },
    { pIdx: 2, title: '24-Hour Ambulatory Blood Pressure Log', type: 'other', pass: false },
    { pIdx: 3, title: 'Transthoracic 2D-Echocardiogram with Color Doppler', type: 'other', pass: false },
    { pIdx: 3, title: 'Anti-Streptolysin O (ASO) & ESR Serology', type: 'blood', pass: false },
    { pIdx: 4, title: 'High-Resolution Chest CT Scan (HRCT)', type: 'other', pass: false },
    { pIdx: 4, title: 'Spirometry Pulmonary Function Report', type: 'other', pass: false },
    { pIdx: 20, title: 'Private Comprehensive Lipidomics Panel', type: 'blood', pass: false },
    { pIdx: 23, title: 'Renal Artery Duplex Ultrasound', type: 'other', pass: false }
  ];

  for (const rec of recordDefs) {
    const pt = patients[rec.pIdx];
    const exists = await MedicalRecord.findOne({ patientId: pt.profile._id, title: { $regex: rec.title.slice(0, 15), $options: 'i' } });
    if (!exists) {
      await MedicalRecord.create({
        patientId: pt.profile._id,
        title: rec.title,
        type: rec.type,
        fileUrl: makeMedicalSvg(rec.title, `Patient: ${pt.user.name}`),
        isPasswordProtected: rec.pass,
        password: rec.pass ? 'Demo@123' : null
      });
    }
  }

  // 8. Seed Clinical Memories for SCOS AI engine
  console.log('🧠 Seeding Clinical Memories & Allergy Flags...');
  const memoryDefs = [
    { pIdx: 0, cat: 'ALLERGY', content: 'Severe Penicillin anaphylaxis (causes bronchospasm & angioedema)', conf: 'VERIFIED', status: 'ACTIVE' },
    { pIdx: 0, cat: 'CONDITION', content: 'Acute Coronary Syndrome with Troponin-I elevation', conf: 'VERIFIED', status: 'ACTIVE' },
    { pIdx: 0, cat: 'MEDICATION', content: 'Atorvastatin 80mg daily, Clopidogrel 75mg daily', conf: 'SUPPORTED', status: 'ACTIVE' },
    { pIdx: 1, cat: 'CONDITION', content: 'Chronic Migraine with Visual Aura', conf: 'SUPPORTED', status: 'ACTIVE' },
    { pIdx: 2, cat: 'ALLERGY', content: 'No known drug allergies reported (Patient self-statement)', conf: 'CONFLICTED', status: 'CONFLICTED' },
    { pIdx: 2, cat: 'CONDITION', content: 'Type 2 Diabetes Mellitus & Stage 2 Hypertension', conf: 'VERIFIED', status: 'ACTIVE' },
    { pIdx: 3, cat: 'CONDITION', content: 'Rheumatic Heart Disease with moderate Mitral Regurgitation', conf: 'VERIFIED', status: 'ACTIVE' }
  ];

  for (const mem of memoryDefs) {
    const pt = patients[mem.pIdx];
    await PatientMemory.create({
      patientId: pt.user._id,
      category: mem.cat,
      type: 'FACT',
      content: mem.content,
      normalizedContent: mem.content.toLowerCase().trim(),
      confidence: mem.conf,
      status: mem.status
    });
  }

  console.log('\n====================================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================================');
  console.log('📊 Verification Summary:');
  console.log(`   Patients used:         P01–P40 from existing 50-patient list (NO new patients created)`);
  console.log(`   Hospital Appointments: 30 (20 checked in now; 10 confirmed for +1 hour)`);
  console.log(`   Private Appointments:  10 (checked in now at Dr. Ananya's private clinic)`);
  console.log(`   Priority scenarios:    Emergency, high, moderate, low, routine; varied wait times and missed calls`);
  const triageCounts = queueScenarios.reduce((counts, scenario) => {
    counts[scenario.triage] = (counts[scenario.triage] || 0) + 1;
    return counts;
  }, {});
  console.log(`   Hospital triage mix:   ${JSON.stringify(triageCounts)}`);
  console.log(`   Active Hospital Queue: 20 patients (tokens 101–120)`);
  console.log(`   Prescriptions:         11`);
  console.log(`   Medical Records:       13 (timelines for P01–P05, P21, P24)`);
  console.log(`   Clinical Memories:     7 (allergy flags, conditions, medications)`);
  console.log('====================================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  seedAnanyaLive()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error executing seeder:', err);
      process.exit(1);
    });
}

module.exports = seedAnanyaLive;
