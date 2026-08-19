const { Kafka, Partitioners, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'scos-backend',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8
  }
});

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
const consumer = kafka.consumer({ 
  groupId: 'scos-backend-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  rebalanceTimeout: 30000,
  allowAutoTopicCreation: true
});

const TOPICS = [
  'scos.queue.updates',
  'scos.appointments',
  'scos.prescriptions',
  'lifefile.queue.updates',
  'lifefile.appointments',
  'lifefile.prescriptions',
];

let io = null; // Socket.io instance
let isKafkaConnected = false;
let isConnecting = false;
let isConsuming = false;
let eventListenersRegistered = false;

const registerConsumerEvents = () => {
  if (eventListenersRegistered) return;
  eventListenersRegistered = true;

  const { GROUP_JOIN, REBALANCING, CRASH, CONNECT, DISCONNECT } = consumer.events;

  consumer.on(CONNECT, () => {
    console.log('📡 [Kafka Event] Consumer connected to broker');
  });

  consumer.on(DISCONNECT, () => {
    console.log('🔌 [Kafka Event] Consumer disconnected from broker');
    isKafkaConnected = false;
    isConsuming = false;
  });

  consumer.on(GROUP_JOIN, (e) => {
    console.log(`🤝 [Kafka Event] Consumer joined group "${e.payload.groupId}" (Member ID: ${e.payload.memberId}, Leader: ${e.payload.isLeader})`);
  });

  consumer.on(REBALANCING, (e) => {
    console.log(`🔄 [Kafka Event] Consumer group "${e.payload?.groupId || 'scos-backend-group'}" is rebalancing...`);
  });

  consumer.on(CRASH, (e) => {
    console.error(`💥 [Kafka Event] Consumer crashed:`, e.payload.error?.message || e.payload.error);
    isConsuming = false;
    isKafkaConnected = false;
  });
};

const attemptConnection = async () => {
  if (isConnecting || isConsuming) {
    return;
  }

  isConnecting = true;

  try {
    registerConsumerEvents();

    if (!isKafkaConnected) {
      await producer.connect();
      console.log('✅ Kafka Producer connected');

      await consumer.connect();
      console.log('✅ Kafka Consumer connected');

      for (const topic of TOPICS) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
      console.log('✅ Kafka Consumer subscribed to:', TOPICS.join(', '));
      isKafkaConnected = true;
    }

    if (!isConsuming) {
      isConsuming = true;
      isConnecting = false;
      console.log('✅ Kafka Producer & Consumer running and fully initialized');

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) return;
            const value = JSON.parse(message.value.toString());
            console.log(`[Kafka ← ${topic}] Action: ${value.action || 'EVENT'}`);

            // Broadcast to all connected Socket.io clients for real-time UI synchronization
            if (io) {
              io.emit('kafka-event', {
                topic,
                data: value,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.error(`Error processing Kafka message on topic ${topic}:`, err.message);
          }
        },
      });
    }
  } catch (error) {
    isKafkaConnected = false;
    isConsuming = false;
    isConnecting = false;
    console.warn(`⚠️ Kafka connection notice (${error.message}). Retrying in 5 seconds...`);
    setTimeout(attemptConnection, 5000);
  }
};

const initKafka = (socketIo) => {
  io = socketIo;
  console.log('🔄 Starting Kafka connection manager...');
  attemptConnection();
};

const produceEvent = async (topic, data) => {
  if (!isKafkaConnected) {
    console.warn(`⚠️ Kafka not connected, dropping event for ${topic}:`, data.action);
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(data) },
      ],
    });
    console.log(`[Kafka → ${topic}] Action: ${data.action || 'EVENT'}`);
  } catch (err) {
    console.error(`[Kafka Error] Failed to produce to ${topic}:`, err.message);
  }
};

const disconnectKafka = async () => {
  isKafkaConnected = false;
  isConsuming = false;
  isConnecting = false;
  try {
    console.log('🔌 Disconnecting Kafka Producer & Consumer...');
    await consumer.disconnect();
    await producer.disconnect();
    console.log('✅ Kafka disconnected cleanly.');
  } catch (err) {
    console.error('Failed to disconnect Kafka cleanly:', err.message);
  }
};

module.exports = { initKafka, produceEvent, disconnectKafka, TOPICS };
