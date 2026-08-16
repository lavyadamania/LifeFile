const axios = require('axios');

const BASE = 'http://localhost:5000';
const TOTAL_PATIENTS = 20; // Change this number to test more
const DELAY_MS = 300; // ms between each booking

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function test() {
  console.log('========================================');
  console.log('  LifeFile — Kafka Real-Time Stress Test');
  console.log('========================================\n');

  // Step 1: Login
  console.log('🔵 Step 1: Logging in as admin...');
  const loginRes = await axios.post(`${BASE}/api/auth/login`, {
    email: 'lavya@admin', password: '123456', role: 'admin'
  });
  const token = loginRes.data.token;
  const headers = { Authorization: 'Bearer ' + token };
  console.log('✅ Logged in.\n');

  // Step 2: Fetch doctors
  console.log('🔵 Step 2: Fetching doctors...');
  const doctorsRes = await axios.get(`${BASE}/api/doctors`, { headers });
  const doctors = doctorsRes.data;
  if (!doctors.length) { console.log('❌ No doctors found!'); return; }
  console.log(`✅ Found ${doctors.length} doctor(s).\n`);

  // Step 3: Register and book appointments for N patients
  console.log(`🔵 Step 3: Creating ${TOTAL_PATIENTS} patients and firing Kafka events...\n`);
  
  const today = new Date().toISOString().split('T')[0];
  const results = [];

  for (let i = 1; i <= TOTAL_PATIENTS; i++) {
    try {
      const timestamp = Date.now();
      const patientEmail = `kafka_test_patient_${i}_${timestamp}@test.com`;
      const patientName = `Test Patient ${i}`;

      // Register patient
      const regRes = await axios.post(`${BASE}/api/auth/register`, {
        name: patientName,
        email: patientEmail,
        password: 'test123',
        role: 'patient'
      });

      const patientId = regRes.data.user.id;

      // Pick a doctor (round-robin)
      const doctor = doctors[i % doctors.length];

      // Book appointment → fires Kafka event
      const apptRes = await axios.post(`${BASE}/api/appointments`, {
        patientId,
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: today,
        time: `${(9 + (i % 8)).toString().padStart(2, '0')}:${(i % 2 === 0 ? '00' : '30')}`,
        reason: `Kafka Stress Test - Patient ${i}`
      }, { headers });

      console.log(`  ✅ [${i}/${TOTAL_PATIENTS}] ${patientName} → Dr. ${doctor.name} | Appt: ${apptRes.data._id}`);
      results.push({ success: true, patient: patientName });
    } catch (err) {
      console.log(`  ❌ [${i}/${TOTAL_PATIENTS}] Failed: ${err.response?.data?.error || err.message}`);
      results.push({ success: false });
    }

    await sleep(DELAY_MS); // small delay between events
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n========================================');
  console.log(`  📊 RESULTS: ${passed} success / ${failed} failed`);
  console.log(`  📡 ${passed} Kafka events fired on → scos.appointments`);
  console.log('  🔥 Open Doctor Queue in browser NOW!');
  console.log('  Patients should appear in real-time without refresh!');
  console.log('========================================\n');
}

test().catch(e => console.error('❌ Fatal Error:', e.response?.data || e.message));
