# Adaptive Clinical Priority Algorithm (ACPA) & Live ETA Queue Tracking

We have successfully established the foundational mathematical priority engine on the backend (what we called DWPA). To fully align with the SIH requirement phases, we will officially adapt DWPA into **ACPA (Adaptive Clinical Priority Algorithm)** by introducing the missing "Fairness" variable, and then immediately proceed to build the **Zomato-style ETA Tracking Engine** for patients.

## Phase 1: Refining ACPA
Currently, our `calculateCEP` uses: `Base Token` + `Wait Time` + `Triage` - `Missed Penalty`.
To fully conform to Phase 1 of the spec, we will:
1. Rename `services/dynamicPriority.js` -> `services/adaptiveClinicalPriority.js` (or just alias the exports to match ACPA terminology).
2. Introduce **Fairness Contribution**: If a patient is repeatedly passed by other higher-triage patients despite waiting a long time, the Fairness variable will drastically increase their score to prevent infinite starvation.

## Phase 4 & 5: ETA Engine & API Integration
We will build a new service `services/queueETA.js`.
1. **Input**: It will take the fully sorted ACPA dynamic queue array and a standard `ESTIMATED_CONSULT_DURATION` (e.g., 8 minutes).
2. **Output**: For any given patient, it will mathematically calculate their position in the dynamic array and return `estimatedWaitMin` and `estimatedWaitMax` based on the sum of expected durations of the patients ahead of them.
3. **API Integration**: We will modify `GET /api/queue/list` or create a new endpoint `GET /api/queue/patient/:appointmentId` that securely returns *only* the specific patient's position and ETA (hiding other patients' names to comply with privacy rules).

## Phase 6 & 8 & 10: Patient Queue UI
We will build a dedicated, mobile-friendly **"Live Queue Status"** page for the patient (`/patient/queue-status/:appointmentId`).
This UI will visually emulate a Zomato delivery tracker:
1. **Header**: "YOUR QUEUE STATUS"
2. **Current Status**: "NOW SERVING TOKEN #X"
3. **Your Position**: Bold `#3`
4. **Estimated Wait**: `18-25 min`
5. **Visual Progress**: A mini visual roadmap showing the tokens ahead of them.
6. **Almost-Your-Turn State**: If position is 2-3, display a green warning "You're almost there". If position is 1 (Called), display a flashing notification to proceed to the consultation room.

## Phase 7 & 11: Real-Time & Failure Handling
The Patient UI will hook into the existing Socket.io `scos.queue.updates` Kafka topic. 
1. When the doctor completes, skips, or calls the next patient, the Kafka event fires.
2. The Patient UI intercepts the event and instantly re-fetches their specific ACPA position and ETA from the backend.
3. If Kafka disconnects, we will implement a 30-second silent polling fallback to ensure the ETA is always correct even on unstable hospital 4G connections.

## Verification Plan
1. Open three browser tabs (Doctor, Patient A, Patient B).
2. Watch Patient A's ETA dynamically increase if Patient B (Emergency Triage) is slotted in front of them by the ACPA algorithm.
3. Watch the ETA drop in real-time without refreshing as the Doctor clicks "Complete Consult".

> [!WARNING]
> Do you want the `ESTIMATED_CONSULT_DURATION` to be hardcoded globally (e.g., 10 minutes), or should we pull it from the Doctor's specific profile/settings? For the SIH demo, a global default is fastest and easily explainable.
