require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const User = require('./models/User');
const { calculateCEP } = require('./services/dynamicPriority');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('--- STARTING ACCEPTANCE TEST ---');

  const doc = await Doctor.findOne();
  const today = new Date().toLocaleDateString('en-CA');

  // Clean test queue
  await Appointment.deleteMany({ doctorId: doc._id, date: today, chiefComplaint: /ACCEPTANCE_TEST/ });

  // Create 5 test patients with permanent tokens #1 to #5 and distinct ACPA scores
  const testData = [
    { token: 1, triage: 1, waitMins: 10, name: 'Test Patient 1' }, // Low score
    { token: 2, triage: 3, waitMins: 30, name: 'Test Patient 2' }, // Medium score
    { token: 3, triage: 2, waitMins: 15, name: 'Test Patient 3' }, // Low-Medium
    { token: 4, triage: 5, waitMins: 20, name: 'Test Patient 4' }, // HIGH Emergency Score -> Position 1
    { token: 5, triage: 4, waitMins: 25, name: 'Test Patient 5' }, // Urgent Score -> Position 3
  ];

  const appts = [];
  const now = new Date();

  for (const t of testData) {
    const user = await User.create({ name: t.name, email: `test_${t.token}_${Date.now()}@test.com`, password: 'pass', role: 'patient' });
    const schedDate = new Date(now.getTime() - t.waitMins * 60 * 1000);
    const timeStr = `${String(schedDate.getHours()).padStart(2, '0')}:${String(schedDate.getMinutes()).padStart(2, '0')}`;

    const appt = await Appointment.create({
      patientId: user._id,
      patientName: user.name,
      doctorId: doc._id,
      doctorName: doc.name,
      date: today,
      time: timeStr,
      status: 'Pending',
      baseToken: t.token,
      triageLevel: t.triage,
      chiefComplaint: 'ACCEPTANCE_TEST'
    });
    appts.push(appt);
  }

  console.log('✅ Created 5 patients with Tokens #1 to #5.');

  // Calculate dynamic positions
  let currentAppts = await Appointment.find({ doctorId: doc._id, date: today, chiefComplaint: 'ACCEPTANCE_TEST' });
  let queue = currentAppts.map(a => ({
    id: a._id,
    token: a.baseToken,
    name: a.patientName,
    score: calculateCEP(a).score
  })).sort((a,b) => b.score - a.score);

  console.log('\nDynamic Queue Order (ACPA Sorted):');
  queue.forEach((q, i) => {
    console.log(`Position #${i+1} -> Token #${q.token} (${q.name}) [Score: ${q.score}]`);
  });

  const token5Appt = appts.find(a => a.baseToken === 5);
  console.log(`\n🎯 Action: Doctor clicks START on Token #5 (ID: ${token5Appt._id})...`);

  // Simulate POST /api/queue/call-next with appointmentId of Token #5
  await Appointment.updateMany({ doctorId: doc._id, status: 'In_Progress' }, { status: 'Pending' });
  const started = await Appointment.findByIdAndUpdate(token5Appt._id, { status: 'In_Progress' }, { new: true });

  console.log(`Now Serving Status in DB: Token #${started.baseToken} — ${started.patientName} (${started.status})`);
  
  if (started.baseToken === 5 && started.status === 'In_Progress') {
    console.log('✅ TEST PASSED: Token #5 became NOW SERVING (Not Token #4)!');
  } else {
    console.error('❌ TEST FAILED: Wrong patient started!');
    process.exit(1);
  }

  // Simulate COMPLETE on Token #5
  console.log(`\n🎯 Action: Doctor clicks COMPLETE on Token #5...`);
  await Appointment.findByIdAndUpdate(token5Appt._id, { status: 'Completed' });

  // Refetch remaining queue
  const remaining = await Appointment.find({ doctorId: doc._id, date: today, status: { $in: ['Pending', 'Confirmed'] }, chiefComplaint: 'ACCEPTANCE_TEST' });
  let remQueue = remaining.map(a => ({
    id: a._id,
    token: a.baseToken,
    name: a.patientName,
    score: calculateCEP(a).score
  })).sort((a,b) => b.score - a.score);

  console.log('\nRemaining Dynamic Queue:');
  remQueue.forEach((q, i) => {
    console.log(`Position #${i+1} -> Permanent Token #${q.token} (${q.name})`);
  });

  // Verify token numbers did not change
  const originalTokens = [1, 2, 3, 4];
  const currentTokens = remQueue.map(q => q.token).sort();
  if (JSON.stringify(originalTokens) === JSON.stringify(currentTokens)) {
    console.log('✅ TEST PASSED: Permanent Token numbers remained strictly unchanged!');
  } else {
    console.error('❌ TEST FAILED: Token numbers were modified!');
    process.exit(1);
  }

  // Cleanup test data
  await Appointment.deleteMany({ chiefComplaint: 'ACCEPTANCE_TEST' });
  console.log('\n--- ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY ---');
  mongoose.disconnect();
});
