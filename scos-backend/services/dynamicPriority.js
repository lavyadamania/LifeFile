const ACPA_WEIGHTS = {
  base: 10,       // Points per position closer to 1 (inverted slot order)
  age: 0.5,       // Linear points per minute waited
  fairness: 1.2,  // Exponential multiplier to prevent starvation (waitMinutes ^ 1.2)
  triage: 20,     // Points per triage level (1-5)
  penalty: 30     // Points deducted per missed call / skip
};

/**
 * Helper to parse appointment date and time into a Date object
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - "HH:MM", "HH:MM AM", or "HH:MM PM"
 */
function parseAppointmentDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return new Date();
  try {
    let hours = 0, minutes = 0;
    
    // Check if 12-hour format
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const [time, modifier] = timeStr.split(' ');
      let [h, m] = time.split(':');
      hours = parseInt(h, 10);
      minutes = parseInt(m, 10);
      if (hours === 12) hours = 0;
      if (modifier === 'PM') hours += 12;
    } else {
      // 24-hour format
      const [h, m] = timeStr.split(':');
      hours = parseInt(h, 10);
      minutes = parseInt(m, 10);
    }
    
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch (err) {
    return new Date(); // fallback
  }
}

/**
 * Calculates the Current Effective Priority (CEP) using Adaptive Clinical Priority Algorithm (ACPA)
 * @param {Object} appointment - The appointment mongoose document
 * @param {Date} currentTime - The current time to calculate aging
 * @returns {Object} Priority details including final score and contributions
 */
function calculateCEP(appointment, currentTime = new Date()) {
  // 1. Slot Contribution
  const token = appointment.baseToken || 1;
  const slotContribution = Math.max(0, 100 - token) * ACPA_WEIGHTS.base;

  // 2. Aging / Wait Time Contribution
  const scheduledTime = parseAppointmentDateTime(appointment.date, appointment.time);
  const diffMs = currentTime.getTime() - scheduledTime.getTime();
  let waitMinutes = Math.floor(diffMs / 1000 / 60);
  if (waitMinutes < 0) waitMinutes = 0; 
  const agingContribution = waitMinutes * ACPA_WEIGHTS.age;

  // 3. Fairness Contribution (Non-linear exponential growth to prevent starvation)
  // If waitMinutes is high, fairness exponentially grows to forcefully bypass triage
  const fairnessContribution = Math.pow(waitMinutes, ACPA_WEIGHTS.fairness) * 0.1;

  // 4. Triage (Clinical) Contribution (Exponential for emergency levels 4 & 5 to ethically prioritize life-threatening cases)
  const severity = appointment.triageLevel || 1; // 1-5
  let triageContribution = severity * ACPA_WEIGHTS.triage;
  if (severity === 5) triageContribution += 1000; // Critical Resuscitation Priority Override
  else if (severity === 4) triageContribution += 500;  // Severe Emergency Priority Override

  // 5. Penalty Contribution (Missed Calls) - capped to prevent permanent clinical lock-out
  const missed = appointment.missedCalls || 0;
  const penaltyContribution = Math.min(150, missed * ACPA_WEIGHTS.penalty);

  // Final CEP Calculation
  const score = parseFloat((slotContribution + agingContribution + fairnessContribution + triageContribution - penaltyContribution).toFixed(1));

  // Determine priority level
  let priorityLevel = 'NORMAL';
  if (score >= 1000) priorityLevel = 'EMERGENCY'; 
  else if (score >= 800) priorityLevel = 'HIGH';
  else if (score < 500) priorityLevel = 'LOW';
  
  if (missed > 0 && priorityLevel === 'NORMAL') priorityLevel = 'DELAYED';

  // Construct Reason
  let reason = 'Standard queue position';
  if (fairnessContribution > 50) reason = 'Fairness priority (anti-starvation override)';
  else if (triageContribution > 50 && agingContribution > 30) reason = 'High triage + prolonged waiting';
  else if (triageContribution > 50) reason = 'High clinical triage';
  else if (agingContribution > 50) reason = 'Aging priority (long wait)';
  else if (penaltyContribution > 0) reason = 'Missed-call penalty applied';

  return {
    score,
    slotContribution,
    agingContribution,
    fairnessContribution: parseFloat(fairnessContribution.toFixed(1)),
    triageContribution,
    penaltyContribution,
    priorityLevel,
    reason,
    waitMinutes,
    token
  };
}

module.exports = {
  ACPA_WEIGHTS,
  calculateCEP,
  parseAppointmentDateTime
};
