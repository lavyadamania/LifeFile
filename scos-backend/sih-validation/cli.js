const fs = require('fs');
const path = require('path');
const PatientGenerator = require('./simulation/PatientGenerator');
const SimulationEngine = require('./simulation/SimulationEngine');
const MetricsCollector = require('./metrics/MetricsCollector');
const ChartGenerator = require('./metrics/ChartGenerator');
const FIFOAlgorithm = require('./algorithms/fifo');
const PriorityAlgorithm = require('./algorithms/priority');
const ACPAAlgorithm = require('./algorithms/acpa');
const { ACPANoAging, ACPANoTriage, ACPANoSkip } = require('./algorithms/acpaAblation');

const algorithms = {
  'FIFO': new FIFOAlgorithm(),
  'Priority': new PriorityAlgorithm(),
  'ACPA': new ACPAAlgorithm(),
  'ACPA_NoAging': new ACPANoAging(),
  'ACPA_NoTriage': new ACPANoTriage(),
  'ACPA_NoSkip': new ACPANoSkip()
};

async function runBenchmark(scenarioName, seed = 20260819, algosToRun = ['FIFO', 'Priority', 'ACPA']) {
  console.log(`\n--- Running Benchmark: ${scenarioName} (Seed: ${seed}) ---`);
  
  const scenarioPath = path.join(__dirname, 'scenarios', `${scenarioName}.json`);
  if (!fs.existsSync(scenarioPath)) {
    console.error(`Scenario ${scenarioName} not found.`);
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
  config.seed = seed;

  const generator = new PatientGenerator(config);
  const patients = generator.generate();
  console.log(`Generated ${patients.length} synthetic patients.`);

  const metricsCollector = new MetricsCollector();
  const results = {};

  for (const algoName of algosToRun) {
    console.log(`Simulating ${algoName}...`);
    const algo = algorithms[algoName];
    if (!algo) continue;

    const engine = new SimulationEngine(algo, patients, config);
    const simResult = engine.run();
    
    const metrics = metricsCollector.calculate(simResult);
    results[algoName] = metrics;
  }

  // Generate Report
  const reportId = `EXP-${Date.now()}`;
  const reportDir = path.join(__dirname, 'reports', reportId);
  fs.mkdirSync(reportDir, { recursive: true });

  const summaryData = {
    experimentId: reportId,
    scenario: scenarioName,
    seed,
    config,
    results
  };

  fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summaryData, null, 2));
  
  // Visually Save Graphs (SVG)
  const baseAlgos = ['FIFO', 'Priority', 'ACPA'];
  
  const emergencyData = {};
  const starvationData = {};
  const routineP95Data = {};
  
  baseAlgos.forEach(algo => {
    if (results[algo]) {
      emergencyData[algo] = results[algo].emergency.averageWait;
      starvationData[algo] = results[algo].starvationIncidents;
      routineP95Data[algo] = results[algo].routine.p95Wait;
    }
  });

  ChartGenerator.generateBarChart('Emergency Wait Time (Lower is Better)', emergencyData, 'Minutes', path.join(reportDir, 'graph_emergency_wait.svg'));
  ChartGenerator.generateBarChart('Routine Starvation Incidents (Lower is Better)', starvationData, 'Patients', path.join(reportDir, 'graph_starvation.svg'));
  ChartGenerator.generateBarChart('Routine P95 Wait Time', routineP95Data, 'Minutes', path.join(reportDir, 'graph_routine_p95.svg'));

  console.log(`\nResults and SVG Graphs saved to reports/${reportId}/`);

  // Print quick comparison table
  console.log('\n--- Quick Comparison ---');
  console.table(
    Object.keys(results).reduce((acc, algo) => {
      acc[algo] = {
        'Wait (Avg)': results[algo].overall.averageWait.toFixed(2),
        'Wait (P95)': results[algo].overall.p95Wait.toFixed(2),
        'Emergency Wait (Avg)': results[algo].emergency.averageWait.toFixed(2),
        'Starvation': results[algo].starvationIncidents,
        'Throughput/hr': results[algo].throughput.toFixed(2)
      };
      return acc;
    }, {})
  );

  return summaryData;
}

// Simple CLI arg parser
const args = process.argv.slice(2);
let scenario = 'normal-opd';
let seed = 20260819;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scenario') scenario = args[i+1];
  if (args[i] === '--seed') seed = parseInt(args[i+1], 10);
}

runBenchmark(scenario, seed);
