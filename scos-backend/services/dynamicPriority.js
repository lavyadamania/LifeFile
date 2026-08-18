const DWPA_WEIGHTS = {
  base: 10,       // Points per position closer to 1 (inverted slot order)
  age: 0.5,       // Points per minute waited past appointment time
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
    
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d;
  } catch (err) {
    return new Date(); // fallback
  }
}

/**
 * Calculates the Current Effective Priority (CEP) for an appointment
 * @param {Object} appointment - The appointment mongoose document
 * @param {Date} currentTime - The current time to calculate aging
 * @returns {Object} Priority details including final score and contributions
 */
function calculateCEP(appointment, currentTime = new Date()) {
  // 1. Slot Contribution
  // Lower token number means earlier appointment. Max tokens usually won't exceed 100.
  // We invert it so Token 1 gets a higher score than Token 10.
  // Base score = (100 - baseToken) * W_base
  const token = appointment.baseToken || 1;
  const slotContribution = Math.max(0, 100 - token) * DWPA_WEIGHTS.base;

  // 2. Aging / Wait Time Contribution
  // Time waited past their scheduled appointment time (in minutes)
  const scheduledTime = parseAppointmentDateTime(appointment.date, appointment.time);
  const diffMs = currentTime.getTime() - scheduledTime.getTime();
  let waitMinutes = Math.floor(diffMs / 1000 / 60);
  // If they are early, waitMinutes is negative, we can floor it at 0 to avoid negative aging
  if (waitMinutes < 0) waitMinutes = 0; 
  const agingContribution = waitMinutes * DWPA_WEIGHTS.age;

  // 3. Triage Contribution
  const severity = appointment.triageLevel || 1; // 1-5
  const triageContribution = severity * DWPA_WEIGHTS.triage;

  // 4. Penalty Contribution (Skip / Missed Calls)
  const missed = appointment.missedCalls || 0;
  const penaltyContribution = missed * DWPA_WEIGHTS.penalty;

  // Final CEP Calculation
  const score = parseFloat((slotContribution + agingContribution + triageContribution - penaltyContribution).toFixed(1));

  // Determine priority level (informative only)
  let priorityLevel = 'NORMAL';
  if (score >= 1000) priorityLevel = 'EMERGENCY'; // very high triage + long wait
  else if (score >= 800) priorityLevel = 'HIGH';
  else if (score < 500) priorityLevel = 'LOW';
  
  if (missed > 0 && priorityLevel === 'NORMAL') priorityLevel = 'DELAYED';

  // Construct Reason
  let reason = 'Standard queue position';
  if (triageContribution > 50 && agingContribution > 30) reason = 'High triage + prolonged waiting';
  else if (triageContribution > 50) reason = 'High clinical triage';
  else if (agingContribution > 50) reason = 'Aging priority (long wait)';
  else if (penaltyContribution > 0) reason = 'Missed-call penalty applied';

  return {
    score,
    slotContribution,
    agingContribution,
    triageContribution,
    penaltyContribution,
    priorityLevel,
    reason,
    waitMinutes,
    token
  };
}

module.exports = {
  DWPA_WEIGHTS,
  calculateCEP,
  parseAppointmentDateTime
};
