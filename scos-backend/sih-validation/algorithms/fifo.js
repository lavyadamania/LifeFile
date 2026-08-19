/**
 * FIFO Algorithm
 * First checked-in, first served.
 * No clinical reprioritization.
 */

class FIFOAlgorithm {
  constructor() {
    this.name = 'FIFO';
  }

  getNextPatient(queue, currentTime) {
    if (!queue || queue.length === 0) return null;

    // Filter patients who have checked in and checkInTime <= currentTime
    const eligible = queue.filter(p => p.checkInTime !== null && p.checkInTime <= currentTime);
    if (eligible.length === 0) return null;

    // Sort by checkInTime ascending. Tie-breaker: token ascending (deterministic)
    eligible.sort((a, b) => {
      if (a.checkInTime === b.checkInTime) {
        return a.token - b.token;
      }
      return a.checkInTime - b.checkInTime;
    });

    return eligible[0];
  }
}

module.exports = FIFOAlgorithm;
