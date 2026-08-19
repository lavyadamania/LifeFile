require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Prescription = require('./models/Prescription');
const PatientMemory = require('./models/PatientMemory');
const { extractDeterministicMemories, deduplicateAndPersistCandidates } = require('./services/memoryService');

async function runMemoryEngineTests() {
  console.log('--- STARTING LIFEFILE MEMORY ENGINE INTEGRATION & SECURITY TESTS ---');

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in process.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB for testing');

  try {
    // Setup test patient users
    const patientA = await User.findOneAndUpdate(
      { email: 'test_patient_a@lifefile.com' },
      { name: 'Patient A (Test)', email: 'test_patient_a@lifefile.com', password: 'password123', role: 'patient' },
      { upsert: true, new: true }
    );

    const patientB = await User.findOneAndUpdate(
      { email: 'test_patient_b@lifefile.com' },
      { name: 'Patient B (Test)', email: 'test_patient_b@lifefile.com', password: 'password123', role: 'patient' },
      { upsert: true, new: true }
    );

    // Clear previous test memories & prescriptions for clean run
    await PatientMemory.deleteMany({ patientId: { $in: [patientA._id, patientB._id] } });
    await Prescription.deleteMany({ patientId: { $in: [patientA._id, patientB._id] } });

    console.log('🧪 Test Setup Ready. Patient A ID:', patientA._id, 'Patient B ID:', patientB._id);

    // -------------------------------------------------------------
    // TEST 1: Basic Creation & Extraction
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Basic Creation & Extraction ---');
    const rx1 = await Prescription.create({
      patientId: patientA._id,
      doctorId: new mongoose.Types.ObjectId(),
      patientName: patientA.name,
      doctorName: 'Dr. Test Senior',
      diagnosis: 'Acute Hypertension',
      notes: 'Patient reports severe penicillin allergy.',
      medications: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' }]
    });

    const extractResult1 = await extractDeterministicMemories(patientA._id);
    console.log('Extraction Result 1:', extractResult1);

    const memoriesA1 = await PatientMemory.find({ patientId: patientA._id });
    console.log(`Extracted ${memoriesA1.length} memories:`, memoriesA1.map(m => `[${m.category}] ${m.content}`));

    if (memoriesA1.length < 2) {
      throw new Error(`FAIL: Expected at least 2 memories (Condition & Allergy/Medication), found ${memoriesA1.length}`);
    }
    console.log('✅ TEST 1 PASSED: Basic extraction created structured memories with source traceability!');

    // -------------------------------------------------------------
    // TEST 2: Deduplication & Source Merging
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Deduplication & Source Merging ---');
    const rx2 = await Prescription.create({
      patientId: patientA._id,
      doctorId: new mongoose.Types.ObjectId(),
      patientName: patientA.name,
      doctorName: 'Dr. Test Junior',
      diagnosis: 'Acute Hypertension Followup',
      notes: 'Confirmed penicillin allergy.',
      medications: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' }]
    });

    const extractResult2 = await extractDeterministicMemories(patientA._id);
    console.log('Extraction Result 2 (Deduplicated):', extractResult2);

    const penicillinMemory = await PatientMemory.findOne({ 
      patientId: patientA._id, 
      normalizedContent: { $regex: /penicillin/i } 
    });

    if (!penicillinMemory) {
      throw new Error('FAIL: Penicillin memory not found');
    }

    console.log(`Penicillin Memory Source Count: ${penicillinMemory.sourceRecordIds.length} sources`);
    if (penicillinMemory.sourceRecordIds.length < 2) {
      throw new Error(`FAIL: Expected at least 2 sources merged for Penicillin memory, got ${penicillinMemory.sourceRecordIds.length}`);
    }
    console.log('✅ TEST 2 PASSED: Duplicate assertions merged into 1 memory with multiple source IDs!');

    // -------------------------------------------------------------
    // TEST 3: Contradiction & Conflict Detection
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Contradiction & Conflict Detection ---');
    const rx3 = await Prescription.create({
      patientId: patientA._id,
      doctorId: new mongoose.Types.ObjectId(),
      patientName: patientA.name,
      doctorName: 'Dr. Conflict Test',
      diagnosis: 'Routine Checkup',
      notes: 'No known allergy to medications. Patient denies penicillin allergy.',
      medications: []
    });

    // Extract candidates including opposing assertion
    await deduplicateAndPersistCandidates(patientA._id, [{
      category: 'ALLERGY',
      type: 'FACT',
      content: 'No known allergy (denies penicillin allergy)',
      sourceRecordIds: [rx3._id]
    }]);

    const conflictedMemories = await PatientMemory.find({ patientId: patientA._id, status: 'CONFLICTED' });
    console.log(`Found ${conflictedMemories.length} CONFLICTED memories:`, conflictedMemories.map(c => `"${c.content}" -> Notes: ${c.conflictNotes}`));

    if (conflictedMemories.length === 0) {
      throw new Error('FAIL: Conflict detection did not flag opposing allergy claims!');
    }
    console.log('✅ TEST 3 PASSED: Opposing medical assertions automatically flagged as CONFLICTED!');

    // -------------------------------------------------------------
    // TEST 4: Security & Cross-Patient Authorization Rules
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Security & Cross-Patient Authorization Rules ---');
    const rxPatientB = await Prescription.create({
      patientId: patientB._id,
      doctorId: new mongoose.Types.ObjectId(),
      patientName: patientB.name,
      doctorName: 'Dr. Secret',
      diagnosis: 'Confidential Condition B',
      notes: 'Patient B confidential note.',
      medications: []
    });

    await extractDeterministicMemories(patientB._id);
    const memoriesB = await PatientMemory.find({ patientId: patientB._id });

    // Verify Patient B memory is isolated
    const leakedToA = memoriesB.some(m => m.patientId.toString() === patientA._id.toString());
    if (leakedToA) {
      throw new Error('SECURITY VIOLATION: Patient B memory was associated with Patient A!');
    }
    console.log('✅ TEST 4 PASSED: Patient memories are strictly isolated!');

    console.log('\n🎉 --- ALL LIFEFILE MEMORY ENGINE TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runMemoryEngineTests();
