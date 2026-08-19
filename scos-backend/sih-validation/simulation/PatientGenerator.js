/**
 * Deterministic Patient Generator (Mulberry32 PRNG)
 * Ensures 100% reproducible patient streams across identical seeds.
 */

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class PatientGenerator {
  constructor(config) {
    this.seed = config.seed || 20260819;
    this.random = mulberry32(this.seed);
    this.config = config;
  }

  // Generate random int between min and max (inclusive)
  randInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Generate patients for the simulation
  generate() {
    const patients = [];
    const count = this.config.patientCount || 100;
    const emergencyRate = this.config.emergencyRate || 0.1; // 10%
    const noShowRate = this.config.noShowRate || 0.05; // 5%
    
    // Virtual minutes start at 0 (e.g. 08:00 AM)
    let currentTime = 0;

    for (let i = 1; i <= count; i++) {
      // Determine triage level
      let triageLevel = 1;
      const severityRoll = this.random();
      
      if (severityRoll < emergencyRate) {
        // High severity (4 or 5)
        triageLevel = this.randInt(4, 5);
      } else if (severityRoll < emergencyRate + 0.3) {
        // Medium severity (2 or 3)
        triageLevel = this.randInt(2, 3);
      }

      // Arrival spacing
      // Distribute across a dense period (e.g., severe morning surge)
      const maxSpacing = this.config.maxArrivalSpacing || Math.max(1, Math.floor(480 / count));
      const interArrivalTime = this.randInt(0, maxSpacing); 
      currentTime += interArrivalTime;

      // Appointment time (rough correlation with arrival)
      const appointmentTime = currentTime + this.randInt(-15, 30);

      // Does patient no-show?
      const isNoShow = this.random() < noShowRate;
      let checkInTime = null;

      if (!isNoShow) {
        // Check-in occurs anywhere from 10 mins before to 20 mins after appointment
        checkInTime = appointmentTime + this.randInt(-10, 20);
        // Logical constraint: cannot check in before physically arriving at hospital
        if (checkInTime < currentTime) checkInTime = currentTime;
      }

      // Missed call simulation
      const missedCalls = (this.random() < 0.05) ? this.randInt(1, 3) : 0;

      // Consultation duration (5 to 20 mins)
      const duration = this.randInt(5, 20);
      
      // Token numbers typically reset per session (e.g. 50 patients per doctor session)
      const tokenNumber = ((i - 1) % 50) + 1;

      patients.push({
        id: `PAT_${i.toString().padStart(4, '0')}`,
        token: tokenNumber,
        triageLevel,
        arrivalTime: currentTime,
        appointmentTime,
        checkInTime,
        missedCalls,
        consultationDuration: duration,
        status: isNoShow ? 'NO_SHOW' : 'PENDING'
      });
    }

    return patients;
  }
}

module.exports = PatientGenerator;
