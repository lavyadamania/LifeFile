/**
 * Metrics Collector
 * Calculates statistical outcomes (P95, averages, starvation, utilization).
 */

class MetricsCollector {
  constructor(config = {}) {
    this.starvationThreshold = config.starvationThreshold || 45; // Minutes
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    if (Math.floor(index) === index) return sorted[index];
    const i = Math.floor(index);
    const fraction = index - i;
    return sorted[i] + (sorted[i + 1] - sorted[i]) * fraction;
  }

  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  max(arr) {
    if (arr.length === 0) return 0;
    return Math.max(...arr);
  }

  median(arr) {
    return this.percentile(arr, 50);
  }

  calculate(simulationResult) {
    const { completedPatients, totalTime, doctors } = simulationResult;

    // Overall waiting times
    const allWaits = completedPatients.map(p => p.waitingTime);
    
    // Emergency (Triage 4 & 5)
    const emergencyPatients = completedPatients.filter(p => p.triageLevel >= 4);
    const emergencyWaits = emergencyPatients.map(p => p.waitingTime);
    
    // Routine (Triage 1)
    const routinePatients = completedPatients.filter(p => p.triageLevel === 1);
    const routineWaits = routinePatients.map(p => p.waitingTime);

    // Starvation
    const starvationIncidents = routineWaits.filter(w => w > this.starvationThreshold).length;

    // Throughput (Patients per hour)
    const throughput = totalTime > 0 ? (completedPatients.length / (totalTime / 60)) : 0;

    // Utilization
    const doctorStats = doctors.map(d => {
      const busy = d.totalBusyTime || 0;
      const util = totalTime > 0 ? (busy / totalTime) * 100 : 0;
      return { id: d.id, utilization: util };
    });
    const avgUtilization = this.average(doctorStats.map(d => d.utilization));

    return {
      overall: {
        averageWait: this.average(allWaits),
        medianWait: this.median(allWaits),
        p95Wait: this.percentile(allWaits, 95),
        maxWait: this.max(allWaits)
      },
      emergency: {
        count: emergencyPatients.length,
        averageWait: this.average(emergencyWaits),
        p95Wait: this.percentile(emergencyWaits, 95)
      },
      routine: {
        count: routinePatients.length,
        averageWait: this.average(routineWaits),
        p95Wait: this.percentile(routineWaits, 95),
        maxWait: this.max(routineWaits)
      },
      starvationIncidents,
      throughput,
      doctorUtilization: avgUtilization,
      totalTime
    };
  }
}

module.exports = MetricsCollector;
