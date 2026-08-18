const { Kafka, Partitioners, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'scos-backend',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
});

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
const consumer = kafka.consumer({ groupId: 'scos-backend-group' });

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

const attemptConnection = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');

    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    for (const topic of TOPICS) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    console.log('✅ Kafka Consumer subscribed to:', TOPICS.join(', '));

    isKafkaConnected = true;
    console.log('✅ Kafka Producer & Consumer running and fully initialized');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value.toString());
          console.log(`[Kafka ← ${topic}]`, value);

          // Broadcast to all connected Socket.io clients
          if (io) {
            io.emit('kafka-event', {
              topic,
              data: value,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error(`Error processing Kafka message on topic ${topic}:`, err);
        }
      },
    });
  } catch (error) {
    isKafkaConnected = false;
    console.warn(`⚠️ Kafka connection failed (${error.message}). Retrying in 5 seconds...`);
    // Backoff and retry
    setTimeout(attemptConnection, 5000);
  }
};

const initKafka = (socketIo) => {
  io = socketIo;
  console.log('🔄 Starting Kafka connection manager...');
  // Do not await, let it run in background to prevent blocking server startup
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
    console.log(`[Kafka → ${topic}]`, data);
  } catch (err) {
    console.error(`[Kafka Error] Failed to produce to ${topic}:`, err.message);
  }
};

const disconnectKafka = async () => {
  isKafkaConnected = false;
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('Kafka disconnected');
  } catch (err) {
    console.error('Failed to disconnect Kafka:', err);
  }
};

module.exports = { initKafka, produceEvent, disconnectKafka, TOPICS };
