require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const PatientMemory = require('./models/PatientMemory');
const Prescription = require('./models/Prescription');
const memoryRouter = require('./routes/memory');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_testing';
process.env.JWT_SECRET = JWT_SECRET;

// Create lightweight test app
const app = express();
app.use(express.json());
app.use('/api/memory', memoryRouter);

async function runMemoryAuthorizationTests() {
  console.log('====================================================');
  console.log('--- STARTING MEMORY ENGINE AUTHORIZATION & RBAC TESTS ---');
  console.log('====================================================\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in process.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB for security verification');

  // Start ephemeral HTTP server for testing routes
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/memory`;
  console.log(`🚀 Ephemeral Auth Test Server running on port ${port}\n`);

  try {
    // 1. Setup Test Users & Profiles in Database
    const userPatientA = await User.findOneAndUpdate(
      { email: 'auth_test_patient_a@lifefile.com' },
      { name: 'Auth Patient A', email: 'auth_test_patient_a@lifefile.com', password: 'password123', role: 'patient' },
      { upsert: true, new: true }
    );

    const userPatientB = await User.findOneAndUpdate(
      { email: 'auth_test_patient_b@lifefile.com' },
      { name: 'Auth Patient B', email: 'auth_test_patient_b@lifefile.com', password: 'password123', role: 'patient' },
      { upsert: true, new: true }
    );

    const userDoctorAuthorized = await User.findOneAndUpdate(
      { email: 'auth_test_doc_auth@lifefile.com' },
      { name: 'Dr. Authorized', email: 'auth_test_doc_auth@lifefile.com', password: 'password123', role: 'doctor' },
      { upsert: true, new: true }
    );

    const userDoctorUnauthorized = await User.findOneAndUpdate(
      { email: 'unauth_doc@lifefile.com' },
      { name: 'Dr. Unauthorized', email: 'unauth_doc@lifefile.com', password: 'password123', role: 'doctor' },
      { upsert: true, new: true }
    );

    const docAuthProfile = await Doctor.findOneAndUpdate(
      { userId: userDoctorAuthorized._id },
      { userId: userDoctorAuthorized._id, name: 'Dr. Authorized', licenseNumber: 'AUTH123', specialty: 'Cardiology' },
      { upsert: true, new: true }
    );

    const docUnauthProfile = await Doctor.findOneAndUpdate(
      { userId: userDoctorUnauthorized._id },
      { userId: userDoctorUnauthorized._id, name: 'Dr. Unauthorized', licenseNumber: 'UNAUTH999', specialty: 'Dermatology' },
      { upsert: true, new: true }
    );

    // Clear old test data
    await PatientMemory.deleteMany({ patientId: { $in: [userPatientA._id, userPatientB._id] } });
    await Prescription.deleteMany({ patientId: { $in: [userPatientA._id, userPatientB._id] } });

    // Seed 1 Prescription creating clinical relationship between Authorized Doctor and Patient A
    const rx = await Prescription.create({
      patientId: userPatientA._id,
      doctorId: docAuthProfile._id,
      patientName: userPatientA.name,
      doctorName: docAuthProfile.name,
      diagnosis: 'Hypertension',
      notes: 'Patient allergic to Sulfa drugs.',
      medications: []
    });

    // Create 1 Memory Record for Patient A
    const memA = await PatientMemory.create({
      patientId: userPatientA._id,
      category: 'ALLERGY',
      type: 'FACT',
      content: 'Sulfa Drug Allergy',
      normalizedContent: 'sulfa drug allergy',
      confidence: 'VERIFIED',
      status: 'ACTIVE',
      sourceRecordIds: [rx._id]
    });

    // Create 1 Memory Record for Patient B
    const memB = await PatientMemory.create({
      patientId: userPatientB._id,
      category: 'CONDITION',
      type: 'FACT',
      content: 'Type 2 Diabetes',
      normalizedContent: 'type 2 diabetes',
      confidence: 'VERIFIED',
      status: 'ACTIVE',
      sourceRecordIds: []
    });

    // Mint Tokens
    const tokenPatientA = jwt.sign({ id: userPatientA._id, role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenPatientB = jwt.sign({ id: userPatientB._id, role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenDocAuthorized = jwt.sign({ id: userDoctorAuthorized._id, role: 'doctor' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenDocUnauthorized = jwt.sign({ id: userDoctorUnauthorized._id, role: 'doctor' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('🔑 Generated test JWT tokens for all roles.\n');

    // -----------------------------------------------------------------
    // TEST 1: Unauthenticated Request (No Token) -> Expect 401
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Unauthenticated Request (No Token) ---');
    const res1 = await fetch(`${baseUrl}/patient/${userPatientA._id}`);
    const data1 = await res1.json();
    console.log(`HTTP Status: ${res1.status} | Body:`, data1);
    if (res1.status !== 401) {
      throw new Error(`FAIL: Expected 401 Unauthorized for missing token, got ${res1.status}`);
    }
    console.log('✅ TEST 1 PASSED: Unauthenticated request rejected with 401 Unauthorized.\n');

    // -----------------------------------------------------------------
    // TEST 2: Patient A Accessing Patient A Memory -> Expect 200 OK
    // -----------------------------------------------------------------
    console.log('--- TEST 2: Patient A Accessing Own Memory ---');
    const res2 = await fetch(`${baseUrl}/patient/${userPatientA._id}`, {
      headers: { 'Authorization': `Bearer ${tokenPatientA}` }
    });
    const data2 = await res2.json();
    console.log(`HTTP Status: ${res2.status} | Total Memories Returned: ${data2.totalCount}`);
    if (res2.status !== 200 || data2.totalCount !== 1) {
      throw new Error(`FAIL: Expected 200 OK with 1 memory for self access, got status ${res2.status}`);
    }
    console.log('✅ TEST 2 PASSED: Patient A successfully retrieved their own memory.\n');

    // -----------------------------------------------------------------
    // TEST 3: Patient A Accessing Patient B Memory (Cross-Patient Violation) -> Expect 403
    // -----------------------------------------------------------------
    console.log('--- TEST 3: Patient A Accessing Patient B Memory (Cross-Patient Attempt) ---');
    const res3 = await fetch(`${baseUrl}/patient/${userPatientB._id}`, {
      headers: { 'Authorization': `Bearer ${tokenPatientA}` }
    });
    const data3 = await res3.json();
    console.log(`HTTP Status: ${res3.status} | Body:`, data3);
    if (res3.status !== 403) {
      throw new Error(`FAIL: Expected 403 Forbidden for cross-patient memory access, got ${res3.status}`);
    }
    console.log('✅ TEST 3 PASSED: Cross-patient access blocked with 403 Forbidden.\n');

    // -----------------------------------------------------------------
    // TEST 4: Unauthorized Doctor Accessing Patient A Memory -> Expect 403
    // -----------------------------------------------------------------
    console.log('--- TEST 4: Unauthorized Doctor Accessing Patient A Memory ---');
    const res4 = await fetch(`${baseUrl}/patient/${userPatientA._id}`, {
      headers: { 'Authorization': `Bearer ${tokenDocUnauthorized}` }
    });
    const data4 = await res4.json();
    console.log(`HTTP Status: ${res4.status} | Body:`, data4);
    if (res4.status !== 403) {
      throw new Error(`FAIL: Expected 403 Forbidden for doctor with no clinical relationship, got ${res4.status}`);
    }
    console.log('✅ TEST 4 PASSED: Unauthorized doctor access blocked with 403 Forbidden.\n');

    // -----------------------------------------------------------------
    // TEST 5: Authorized Doctor Accessing Patient A Memory -> Expect 200 OK
    // -----------------------------------------------------------------
    console.log('--- TEST 5: Authorized Doctor Accessing Patient A Memory ---');
    const res5 = await fetch(`${baseUrl}/patient/${userPatientA._id}`, {
      headers: { 'Authorization': `Bearer ${tokenDocAuthorized}` }
    });
    const data5 = await res5.json();
    console.log(`HTTP Status: ${res5.status} | Total Memories Returned: ${data5.totalCount}`);
    if (res5.status !== 200 || data5.totalCount !== 1) {
      throw new Error(`FAIL: Expected 200 OK for clinically authorized doctor, got ${res5.status}`);
    }
    console.log('✅ TEST 5 PASSED: Authorized doctor granted clinical memory access.\n');

    // -----------------------------------------------------------------
    // TEST 6: Patient A Attempting Doctor Review Endpoint (RBAC Guard) -> Expect 403
    // -----------------------------------------------------------------
    console.log('--- TEST 6: Patient Attempting Doctor Review Endpoint (RBAC Guard) ---');
    const res6 = await fetch(`${baseUrl}/${memA._id}/review`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenPatientA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    const data6 = await res6.json();
    console.log(`HTTP Status: ${res6.status} | Body:`, data6);
    if (res6.status !== 403) {
      throw new Error(`FAIL: Expected 403 Forbidden when patient calls doctor review endpoint, got ${res6.status}`);
    }
    console.log('✅ TEST 6 PASSED: RBAC role guard blocked patient from reviewing memory status.\n');

    console.log('====================================================');
    console.log('🎉 --- ALL NEGATIVE & POSITIVE MEMORY AUTH TESTS PASSED! ---');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ AUTHORIZATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('Server & Database connections closed.');
  }
}

runMemoryAuthorizationTests();
