const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const PatientGenerator = require('../sih-validation/simulation/PatientGenerator');
const SimulationEngine = require('../sih-validation/simulation/SimulationEngine');
const MetricsCollector = require('../sih-validation/metrics/MetricsCollector');
const FIFOAlgorithm = require('../sih-validation/algorithms/fifo');
const PriorityAlgorithm = require('../sih-validation/algorithms/priority');
const ACPAAlgorithm = require('../sih-validation/algorithms/acpa');
const { ACPANoAging, ACPANoTriage, ACPANoSkip } = require('../sih-validation/algorithms/acpaAblation');

const algorithms = {
  'FIFO': new FIFOAlgorithm(),
  'Priority': new PriorityAlgorithm(),
  'ACPA': new ACPAAlgorithm(),
  'ACPA_NoAging': new ACPANoAging(),
  'ACPA_NoTriage': new ACPANoTriage(),
  'ACPA_NoSkip': new ACPANoSkip()
};

// GET /api/benchmark/scenarios
router.get('/scenarios', (req, res) => {
  try {
    const dir = path.join(__dirname, '..', 'sih-validation', 'scenarios');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const scenarios = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { id: f.replace('.json', ''), ...data };
    });
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/benchmark/run
router.post('/run', (req, res) => {
  try {
    const { scenarioId, customConfig, algosToRun = ['FIFO', 'Priority', 'ACPA', 'ACPA_NoAging', 'ACPA_NoTriage', 'ACPA_NoSkip'] } = req.body;
    
    let config = {};
    if (scenarioId) {
      const scenarioPath = path.join(__dirname, '..', 'sih-validation', 'scenarios', `${scenarioId}.json`);
      if (fs.existsSync(scenarioPath)) {
        config = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
      }
    }
    
    // Override with custom config from UI
    config = { ...config, ...customConfig };
    config.seed = config.seed || 20260819;

    const generator = new PatientGenerator(config);
    const patients = generator.generate();

    const metricsCollector = new MetricsCollector();
    const results = {};
    const sampleScores = {}; // To return score breakdown for UI

    for (const algoName of algosToRun) {
      const algo = algorithms[algoName];
      if (!algo) continue;

      const engine = new SimulationEngine(algo, patients, config);
      const simResult = engine.run();
      
      const metrics = metricsCollector.calculate(simResult);
      results[algoName] = metrics;

      // Extract a sample ACPA score breakdown for the UI Inspector
      if (algoName === 'ACPA') {
        const p = simResult.completedPatients.find(x => x._latestScoreBreakdown);
        if (p) sampleScores.patient = { id: p.id, breakdown: p._latestScoreBreakdown };
      }
    }

    res.json({
      config,
      patientsGenerated: patients.length,
      results,
      sampleScores
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
