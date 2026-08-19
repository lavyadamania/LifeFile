/**
 * Standard Priority Algorithm
 * Sorted strictly by clinical triage level (Highest to lowest).
 * Tie-breaker: Check-in time.
 * No aging, no dynamic scoring.
 */

class PriorityAlgorithm {
  constructor() {
    this.name = 'Priority';
  }

  getNextPatient(queue, currentTime) {
    if (!queue || queue.length === 0) return null;

    const eligible = queue.filter(p => p.checkInTime !== null && p.checkInTime <= currentTime);
    if (eligible.length === 0) return null;

    // Sort by triageLevel descending. Tie-breaker: checkInTime ascending.
    eligible.sort((a, b) => {
      if (a.triageLevel !== b.triageLevel) {
        return b.triageLevel - a.triageLevel; // Higher triage first
      }
      if (a.checkInTime === b.checkInTime) {
         return a.token - b.token;
      }
      return a.checkInTime - b.checkInTime;
    });

    return eligible[0];
  }
}

module.exports = PriorityAlgorithm;
