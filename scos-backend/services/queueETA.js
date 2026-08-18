/**
 * ETA Engine for the Zomato-style Patient Live Queue tracker.
 * Calculates position and wait time mathematically based on the ACPA-sorted queue.
 */

// We can assume an average consultation duration in minutes if none is provided.
const DEFAULT_CONSULT_DURATION = 10;

/**
 * Calculates the ETA and position for a specific patient.
 * @param {Array} sortedQueue - The entire ACPA-sorted dynamic queue
 * @param {string} targetAppointmentId - The specific appointment ID to track
 * @param {number} avgConsultDuration - Estimated time per patient (in minutes)
 * @returns {Object|null} ETA details
 */
function getPatientETA(sortedQueue, targetAppointmentId, avgConsultDuration = DEFAULT_CONSULT_DURATION) {
  if (!sortedQueue || !Array.isArray(sortedQueue)) return null;

  // Find the target patient's exact position in the dynamic queue
  const positionIndex = sortedQueue.findIndex(p => p._id.toString() === targetAppointmentId.toString());

  // If patient isn't in the pending queue (maybe completed/cancelled)
  if (positionIndex === -1) {
    return null; 
  }

  const queuePosition = positionIndex + 1; // 1-indexed

  // Base estimate: number of people ahead of them * avg consult duration
  // If they are position 1 (next to be called), wait time is 0-5 mins
  let baseWaitMin = positionIndex * avgConsultDuration;
  
  // Calculate variance (min and max) to give a Zomato-style realistic window
  // E.g., if base is 20, window might be 15-25
  let estimatedWaitMin = Math.max(0, baseWaitMin - Math.floor(avgConsultDuration / 2));
  let estimatedWaitMax = baseWaitMin + Math.floor(avgConsultDuration / 2);

  // If they are literally next (position 1), hardcode a very tight window
  if (positionIndex === 0) {
    estimatedWaitMin = 0;
    estimatedWaitMax = 5;
  }

  // Get the currently serving token to display (if we track it in the DB, or we can just say "Next in line is #X")
  // Wait, "currently serving" is tricky because the queue array only holds "Pending".
  // The first person in the array is technically "Next to be called".
  // The frontend handles currentServing token, but we can pass the top of the queue's token here.
  const topToken = sortedQueue.length > 0 ? sortedQueue[0].baseToken : null;

  return {
    queuePosition,
    estimatedWait: {
      min: estimatedWaitMin,
      max: estimatedWaitMax
    },
    topTokenInQueue: topToken
  };
}

module.exports = {
  getPatientETA,
  DEFAULT_CONSULT_DURATION
};
