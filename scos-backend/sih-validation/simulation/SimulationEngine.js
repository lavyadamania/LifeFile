/**
 * Virtual Clock Event Loop Simulation Engine
 */

class SimulationEngine {
  constructor(algorithm, patients, config) {
    this.algorithm = algorithm;
    // Deep clone patients to avoid cross-algorithm mutation
    this.patients = JSON.parse(JSON.stringify(patients)); 
    this.doctorCount = config.doctorCount || 1;
    this.doctors = [];
    for (let i = 0; i < this.doctorCount; i++) {
      this.doctors.push({ id: `DOC_${i}`, availableUntil: 0, currentPatientId: null });
    }
    
    this.currentTime = 0;
    this.queue = [];
    this.completedPatients = [];
    this.missedPatients = [];
    this.events = [];
    this.metricsHistory = []; // Track queue length over time

    this.initializeEvents();
  }

  initializeEvents() {
    this.patients.forEach(p => {
      // Arrival event
      this.events.push({ time: p.arrivalTime, type: 'PATIENT_ARRIVAL', patient: p });
      
      // Check-in event
      if (p.checkInTime !== null && p.status !== 'NO_SHOW') {
        this.events.push({ time: p.checkInTime, type: 'PATIENT_CHECKIN', patient: p });
      }

      // Schedule missed calls if patient has any
      if (p.missedCalls > 0 && p.checkInTime !== null) {
        // We simulate a missed call at random intervals after check-in, but before consultation
        for (let i = 0; i < p.missedCalls; i++) {
          this.events.push({ time: p.checkInTime + 1 + i*5, type: 'PATIENT_MISSED', patient: p });
        }
      }
    });

    // Sort events chronologically
    this.events.sort((a, b) => a.time - b.time);
  }

  run() {
    while (this.events.length > 0 || this.queue.length > 0) {
      // 1. Process all events that occur exactly at currentTime
      while (this.events.length > 0 && this.events[0].time <= this.currentTime) {
        const ev = this.events.shift();
        this.processEvent(ev);
      }

      // 2. Free up doctors whose consultation has ended
      this.doctors.forEach(doc => {
        if (doc.availableUntil <= this.currentTime && doc.currentPatientId !== null) {
          const completedPat = this.completedPatients.find(p => p.id === doc.currentPatientId);
          if (completedPat) {
            completedPat.consultationEndTime = this.currentTime;
          }
          doc.currentPatientId = null;
        }
      });

      // 3. Assign patients to available doctors
      let availableDoctors = this.doctors.filter(d => d.availableUntil <= this.currentTime);
      while (availableDoctors.length > 0 && this.queue.length > 0) {
        // Find next eligible patient using chosen algorithm
        const nextPatient = this.algorithm.getNextPatient(this.queue, this.currentTime);
        
        if (nextPatient) {
          const doc = availableDoctors.shift();
          this.startConsultation(nextPatient, doc);
        } else {
          // No eligible patient (e.g. queue has patients but none have checked in yet)
          break;
        }
      }

      // Record queue length metric periodically (every 5 virtual minutes)
      if (this.currentTime % 5 === 0) {
        this.metricsHistory.push({ time: this.currentTime, queueLength: this.queue.length });
      }

      // 4. Advance Time
      // Jump to next event or next doctor availability, whichever is sooner.
      let nextTime = Infinity;
      if (this.events.length > 0) nextTime = Math.min(nextTime, this.events[0].time);
      this.doctors.forEach(d => {
        if (d.availableUntil > this.currentTime) {
          nextTime = Math.min(nextTime, d.availableUntil);
        }
      });

      if (nextTime === Infinity) break; // Simulation complete
      
      this.currentTime = Math.max(this.currentTime + 1, nextTime); // Prevent infinite loop on 0 delta
    }

    return this.getResults();
  }

  processEvent(ev) {
    if (ev.type === 'PATIENT_ARRIVAL') {
      // Just logged for analytics, doesn't enter active queue until check-in
    } else if (ev.type === 'PATIENT_CHECKIN') {
      if (ev.patient.status !== 'IN_PROGRESS' && ev.patient.status !== 'COMPLETED') {
        const pState = this.patients.find(p => p.id === ev.patient.id);
        pState.status = 'WAITING';
        if (!this.queue.some(q => q.id === pState.id)) {
           this.queue.push(pState);
        }
      }
    } else if (ev.type === 'PATIENT_MISSED') {
       // Emulates doctor calling, patient not responding.
       const pState = this.patients.find(p => p.id === ev.patient.id);
       if (pState.status === 'WAITING') {
         // The patient state already holds the total expected missedCalls from generator
         // The algorithm reads p.missedCalls on the fly. 
         // In reality, this event would increment a dynamic counter.
         pState._simulatedMisses = (pState._simulatedMisses || 0) + 1;
       }
    }
  }

  startConsultation(patient, doctor) {
    // Remove from queue
    this.queue = this.queue.filter(p => p.id !== patient.id);
    
    // Update patient state
    patient.status = 'COMPLETED';
    patient.consultationStartTime = this.currentTime;
    patient.consultationEndTime = this.currentTime + patient.consultationDuration;
    patient.waitingTime = this.currentTime - patient.checkInTime;
    
    // Update doctor state
    doctor.currentPatientId = patient.id;
    doctor.availableUntil = patient.consultationEndTime;
    doctor.totalBusyTime = (doctor.totalBusyTime || 0) + patient.consultationDuration;

    this.completedPatients.push(patient);
  }

  getResults() {
    return {
      algorithm: this.algorithm.name,
      totalTime: this.currentTime,
      completedPatients: this.completedPatients,
      doctors: this.doctors,
      queueHistory: this.metricsHistory,
      unseenPatients: this.queue // e.g. those who never checked in
    };
  }
}

module.exports = SimulationEngine;
