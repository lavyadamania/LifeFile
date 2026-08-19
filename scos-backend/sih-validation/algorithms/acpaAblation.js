/**
 * ACPA Ablation Variants
 * Used to isolate the contribution of specific formula components.
 */

const triageMap = { 5: 1000, 4: 500, 3: 100, 2: 50, 1: 0 };

class ACPAAblationBase {
  constructor(name, config) {
    this.name = name;
    this.config = config; // { useAging: true, useTriage: true, useSkip: true }
  }

  calculateScore(patient, currentTime) {
    const baseScore = (100 - patient.token) * 10;
    
    let triageScore = 0;
    if (this.config.useTriage) {
      triageScore = triageMap[patient.triageLevel] || 0;
    }
    
    let agingScore = 0;
    if (this.config.useAging) {
      let waitMinutes = 0;
      if (patient.checkInTime !== null && patient.checkInTime <= currentTime) {
        waitMinutes = currentTime - patient.checkInTime;
      }
      agingScore = waitMinutes * 1.5;
    }
    
    let skipPenalty = 0;
    if (this.config.useSkip) {
      skipPenalty = (patient._simulatedMisses || 0) * -30;
      if (skipPenalty < -150) skipPenalty = -150;
    }
    
    const finalScore = baseScore + triageScore + agingScore + skipPenalty;
    return { baseScore, triageScore, agingScore, skipPenalty, finalScore };
  }

  getNextPatient(queue, currentTime) {
    if (!queue || queue.length === 0) return null;
    const eligible = queue.filter(p => p.checkInTime !== null && p.checkInTime <= currentTime);
    if (eligible.length === 0) return null;

    const scoredPatients = eligible.map(p => {
      const scoreData = this.calculateScore(p, currentTime);
      return { patient: p, scoreData };
    });

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
    selected.patient._latestScoreBreakdown = selected.scoreData;
    return selected.patient;
  }
}

class ACPANoAging extends ACPAAblationBase {
  constructor() { super('ACPA (No Aging)', { useAging: false, useTriage: true, useSkip: true }); }
}
class ACPANoTriage extends ACPAAblationBase {
  constructor() { super('ACPA (No Triage)', { useAging: true, useTriage: false, useSkip: true }); }
}
class ACPANoSkip extends ACPAAblationBase {
  constructor() { super('ACPA (No Skip)', { useAging: true, useTriage: true, useSkip: false }); }
}

module.exports = {
  ACPANoAging,
  ACPANoTriage,
  ACPANoSkip
};
