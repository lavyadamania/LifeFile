/**
 * Adaptive Clinical Prioritization Algorithm (ACPA)
 * SCOS core scheduling logic.
 */

const triageMap = {
  5: 1000,
  4: 500,
  3: 100,
  2: 50,
  1: 0
};

class ACPAAlgorithm {
  constructor() {
    this.name = 'ACPA';
  }

  calculateScore(patient, currentTime) {
    // 1. Base Score (Inversely proportional to token number)
    const baseScore = (100 - patient.token) * 10;
    
    // 2. Triage Score
    const triageScore = triageMap[patient.triageLevel] || 0;
    
    // 3. Aging Score (Wait time in minutes * 1.5)
    // Wait time starts when patient checks in.
    let waitMinutes = 0;
    if (patient.checkInTime !== null && patient.checkInTime <= currentTime) {
      waitMinutes = currentTime - patient.checkInTime;
    }
    const agingScore = waitMinutes * 1.5;
    
    // 4. Skip Penalty (-30 per miss, max -150)
    let skipPenalty = (patient._simulatedMisses || 0) * -30;
    if (skipPenalty < -150) skipPenalty = -150;
    
    const finalScore = baseScore + triageScore + agingScore + skipPenalty;
    
    return {
      baseScore,
      triageScore,
      agingScore,
      skipPenalty,
      finalScore
    };
  }

  getNextPatient(queue, currentTime) {
    if (!queue || queue.length === 0) return null;

    const eligible = queue.filter(p => p.checkInTime !== null && p.checkInTime <= currentTime);
    if (eligible.length === 0) return null;

    // Calculate dynamic scores and append to temporary objects
    const scoredPatients = eligible.map(p => {
      const scoreData = this.calculateScore(p, currentTime);
      return {
        patient: p,
        scoreData
      };
    });

    // Sort descending by finalScore. Tie-breaker: checkInTime -> token
    scoredPatients.sort((a, b) => {
      if (Math.abs(a.scoreData.finalScore - b.scoreData.finalScore) > 0.01) {
        return b.scoreData.finalScore - a.scoreData.finalScore; 
      }
      if (a.patient.checkInTime !== b.patient.checkInTime) {
        return a.patient.checkInTime - b.patient.checkInTime;
      }
      return a.patient.token - b.patient.token;
    });

    const selected = scoredPatients[0];
    
    // Store score breakdown in patient object for analytics
    selected.patient._latestScoreBreakdown = selected.scoreData;
    
    return selected.patient;
  }
}

module.exports = ACPAAlgorithm;
