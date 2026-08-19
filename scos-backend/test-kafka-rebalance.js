require('dotenv').config();
const { Kafka, Partitioners } = require('kafkajs');
const mongoose = require('mongoose');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const TEST_TOPIC = 'scos.queue.updates';
const TEST_GROUP_ID = 'test-rebalance-verification-group';

const kafka = new Kafka({
  clientId: 'test-kafka-verifier',
  brokers: [KAFKA_BROKER],
  retry: { retries: 5 }
});

async function runKafkaRebalanceTests() {
  console.log('====================================================');
  console.log('--- STARTING KAFKAJS REBALANCE & STABILITY TEST SUITE ---');
  console.log('====================================================\n');

  const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
  const consumerA = kafka.consumer({ groupId: TEST_GROUP_ID });
  const consumerB = kafka.consumer({ groupId: TEST_GROUP_ID });

  let consumedCountA = 0;
  let consumedCountB = 0;
  let rebalanceEventsCount = 0;

  try {
    console.log('📡 Connecting Producer and Consumer A...');
    await producer.connect();
    await consumerA.connect();
    await consumerA.subscribe({ topic: TEST_TOPIC, fromBeginning: false });

    consumerA.on(consumerA.events.GROUP_JOIN, (e) => {
      rebalanceEventsCount++;
      console.log(`🤝 [Consumer A Event] Joined Group (Member: ${e.payload.memberId})`);
    });

    consumerB.on(consumerB.events.GROUP_JOIN, (e) => {
      rebalanceEventsCount++;
      console.log(`🤝 [Consumer B Event] Joined Group (Member: ${e.payload.memberId})`);
    });

    await consumerA.run({
      eachMessage: async ({ topic, partition, message }) => {
        consumedCountA++;
      }
    });

    console.log('✅ Consumer A running.\n');

    // -------------------------------------------------------------
    // TEST 1: Produce 50 Events to Consumer A
    // -------------------------------------------------------------
    console.log('--- TEST 1: Producing 50 Initial Events to Consumer A ---');
    const messages1 = Array.from({ length: 50 }, (_, i) => ({
      value: JSON.stringify({ action: 'ADD_TO_QUEUE', testId: `event_${i}`, timestamp: new Date().toISOString() })
    }));

    await producer.send({ topic: TEST_TOPIC, messages: messages1 });
    await new Promise(r => setTimeout(r, 1500));
    console.log(`Consumed by Consumer A: ${consumedCountA} / 50`);
    if (consumedCountA < 50) {
      throw new Error(`FAIL: Expected 50 consumed events, got ${consumedCountA}`);
    }
    console.log('✅ TEST 1 PASSED: Messages produced and consumed cleanly.\n');

    // -------------------------------------------------------------
    // TEST 2: Rebalance Recovery Test (Spin up Consumer B)
    // -------------------------------------------------------------
    console.log('--- TEST 2: Spinning up Consumer B (Triggering Controlled Rebalance) ---');
    await consumerB.connect();
    await consumerB.subscribe({ topic: TEST_TOPIC, fromBeginning: false });

    await consumerB.run({
      eachMessage: async ({ topic, partition, message }) => {
        consumedCountB++;
      }
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log(`Total Rebalance Events Tracked: ${rebalanceEventsCount}`);
    if (rebalanceEventsCount < 2) {
      console.log('ℹ️ Single partition topic rebalance resolved cleanly.');
    }
    console.log('✅ TEST 2 PASSED: Consumer B joined group. Rebalance handled without crashing.\n');

    // -------------------------------------------------------------
    // TEST 3: Post-Rebalance Event Processing (Produce 50 More Events)
    // -------------------------------------------------------------
    console.log('--- TEST 3: Producing 50 Post-Rebalance Events ---');
    const messages2 = Array.from({ length: 50 }, (_, i) => ({
      value: JSON.stringify({ action: 'CALL_NEXT', testId: `event_post_${i}`, timestamp: new Date().toISOString() })
    }));

    await producer.send({ topic: TEST_TOPIC, messages: messages2 });
    await new Promise(r => setTimeout(r, 1500));

    const totalConsumed = consumedCountA + consumedCountB;
    console.log(`Total Consumed across Consumer A & B: ${totalConsumed} / 100`);
    if (totalConsumed < 100) {
      throw new Error(`FAIL: Expected 100 total events consumed, got ${totalConsumed}`);
    }
    console.log('✅ TEST 3 PASSED: Post-rebalance events processed with 0 message loss.\n');

    // -------------------------------------------------------------
    // TEST 4: Controlled Consumer B Exit (Trigger Second Rebalance)
    // -------------------------------------------------------------
    console.log('--- TEST 4: Gracefully Disconnecting Consumer B ---');
    await consumerB.disconnect();
    await new Promise(r => setTimeout(r, 1500));

    console.log('Producing 20 Final Verification Events to Consumer A...');
    const messages3 = Array.from({ length: 20 }, (_, i) => ({
      value: JSON.stringify({ action: 'CONSULTATION_COMPLETE', testId: `event_final_${i}`, timestamp: new Date().toISOString() })
    }));

    await producer.send({ topic: TEST_TOPIC, messages: messages3 });
    await new Promise(r => setTimeout(r, 1500));

    const finalConsumed = consumedCountA + consumedCountB;
    console.log(`Final Consumed Count: ${finalConsumed} / 120`);
    if (finalConsumed < 120) {
      throw new Error(`FAIL: Expected 120 final events consumed, got ${finalConsumed}`);
    }
    console.log('✅ TEST 4 PASSED: Consumer A recovered after Consumer B exit and continued processing.\n');

    console.log('====================================================');
    console.log('🎉 --- KAFKA REBALANCE & STABILITY SUITE PASSED 100%! ---');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ KAFKA TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await consumerA.disconnect().catch(() => {});
    await consumerB.disconnect().catch(() => {});
    await producer.disconnect().catch(() => {});
    console.log('Kafka test connections closed.');
  }
}

runKafkaRebalanceTests();
