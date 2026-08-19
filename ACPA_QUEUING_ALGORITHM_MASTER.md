# ⏱️ ACPA & DYNAMIC QUEUING TIME MASTER ALGORITHM SPECIFICATION

> **Platform:** LifeFile (Smart Clinic OS - SCOS)  
> **Module:** OPD Queue Management & Live Patient ETA Tracker  
> **Source Files:**  
> - `scos-backend/services/dynamicPriority.js` *(ACPA Priority Engine)*  
> - `scos-backend/services/queueETA.js` *(Zomato-Style ETA Engine)*  
> - `scos-backend/routes/queue.js` *(Queue API Endpoints & Real-time Event Bus)*  

---

## 🎯 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

Traditional OPD hospital queues operate on a **static First-Come, First-Served (FCFS) token system**. This leads to three severe healthcare inefficiencies:

1. **Clinical Risk:** A patient with severe chest pain or high fever arriving with Token #45 must wait behind 44 routine checkup patients.
2. **Patient Anxiety & Overcrowding:** Patients have zero visibility into their actual wait time, causing crowded hospital waiting rooms.
3. **Queue Starvation:** Naive emergency-override systems repeatedly bump lower-urgency patients to the back of the line indefinitely.

### 💡 The LifeFile Solution
LifeFile solves this using **two interconnected algorithmic engines**:
1. **Adaptive Clinical Priority Algorithm (ACPA):** Dynamically ranks patients in real time using clinical urgency, wait time aging, and anti-starvation math.
2. **Zomato-Style Live ETA Engine:** Calculates a dynamic, realistic wait time window (e.g. `15–25 mins`) for every patient on their smartphone.

---

## 📐 2. ENGINE 1: ADAPTIVE CLINICAL PRIORITY ALGORITHM (ACPA)

Every minute, the backend re-calculates each active patient's **Current Effective Priority ($CEP$)** score. The patient with the highest $CEP$ score is placed at **Position #1** in the doctor's queue.

### 🧮 The Master CEP Formula

$$\text{CEP} = \text{Slot Base} + \text{Aging Contribution} + \text{Fairness Multiplier} + \text{Triage Boost} - \text{Missed Call Penalty}$$

$$CEP = \underbrace{\max(0, 100 - \text{Token}) \times 10}_{\text{1. Slot Base}} + \underbrace{W \times 0.5}_{\text{2. Aging}} + \underbrace{W^{1.2} \times 0.1}_{\text{3. Anti-Starvation}} + \underbrace{T_{\text{boost}}}_{\text{4. Clinical Triage}} - \underbrace{\min(150, M \times 30)}_{\text{5. Penalty}}$$

Where:
* $W = \text{Wait Time in minutes} = \text{currentTime} - \text{scheduledTime}$
* $M = \text{Number of missed calls / doctor skips}$
* $T_{\text{boost}} = \text{Emergency / Clinical Triage Weight}$

---

### 📊 Parameter Breakdown & Clinical Rationale

#### 1. Baseline Booking Slot Weight ($\text{Slot Base}$)
$$\text{Slot Base} = \max(0, 100 - \text{Base Token}) \times 10$$
* **Purpose:** Rewards patients who booked earlier in the day. Token #1 gets $990$ base points, Token #2 gets $980$ base points, ensuring fair initial ordering before waiting begins.

#### 2. Aging / Linear Wait Time Contribution ($\text{Aging}$)
$$\text{Aging} = W \times 0.5$$
* **Parameter:** $+0.5$ points for every 1 minute spent waiting in the clinic.
* **Purpose:** As time passes, every waiting patient's priority steadily rises, reflecting their accumulated wait time.

#### 3. Anti-Starvation Exponential Fairness Multiplier ($\text{Fairness}$)
$$\text{Fairness} = W^{1.2} \times 0.1$$
* **Parameter:** Non-linear exponential growth based on total wait time $W$.
* **Mathematical Rationale:**
  - At $W = 10\text{ mins} \rightarrow 10^{1.2} \times 0.1 = 1.58\text{ pts}$ (Negligible impact)
  - At $W = 60\text{ mins} \rightarrow 60^{1.2} \times 0.1 = 13.5\text{ pts}$
  - At $W = 120\text{ mins} \rightarrow 120^{1.2} \times 0.1 = 31.2\text{ pts}$
* **Ethical Purpose:** **Eliminates Queue Starvation.** If emergency patients keep arriving, a routine patient's fairness score eventually grows exponentially, guaranteeing they will be seen without waiting forever.

#### 4. Clinical Triage Boost ($T_{\text{boost}}$)
Derived from NLP Symptom Analysis & Vitals:

| Triage Level | Clinical Classification | Priority Boost ($T_{\text{boost}}$) | Clinical Behavior |
| :--- | :--- | :--- | :--- |
| 🔴 **Level 5** | **Critical Emergency (Resuscitation)** | **$+1000$ points** | **Instant Override:** Placed immediately at Position #1 ahead of routine appointments. |
| 🔴 **Level 4** | **Urgent Trauma / High Risk** | **$+500$ points** | **High Priority:** Moves to the front batch of the OPD queue. |
| 🟡 **Level 3** | **Acute Consultation** | $+60$ points | Moderate urgency boost for high fever / acute symptoms. |
| 🟢 **Level 2** | **Routine Consultation** | $+40$ points | Standard consultation pace. |
| 🟢 **Level 1** | **Minor / Preventive Care** | $+20$ points | Baseline preventative checkup. |

#### 5. Missed Call Penalty ($\text{Penalty}$)
$$\text{Penalty} = \min(150, M \times 30)$$
* **Parameter:** $-30$ points per missed call / doctor skip, capped at $-150$ points.
* **Purpose:** If a doctor calls a patient but they are not present, skipping them penalizes their score slightly so present patients can be served, while ensuring they are not permanently deleted from the queue.

---

## ⏱️ 3. ENGINE 2: ZOMATO-STYLE DYNAMIC ETA CALCULATION

Once ACPA sorts the array of patients by $CEP$ score, the **Queue ETA Engine** (`scos-backend/services/queueETA.js`) computes the exact wait time and position for any patient.

### 📐 Step-by-Step ETA Calculation Process

#### Step 1: Find Queue Position Index ($P$)
The patient's appointment ID is located in the ACPA-sorted queue:
$$P = \text{Index of patient in sorted queue array (0-indexed)}$$
$$\text{Queue Position} = P + 1$$

#### Step 2: Calculate Base Estimated Wait Time ($W_{\text{base}}$)
Assuming an average consultation duration per patient $D = 10\text{ minutes}$:
$$W_{\text{base}} = P \times D$$

*Example:* If a patient is at **Position #3** ($P = 2$ people ahead of them), $W_{\text{base}} = 2 \times 10 = 20\text{ minutes}$.

#### Step 3: Compute Zomato-Style Variance Range ($\text{Wait}_{\text{min}} \rightarrow \text{Wait}_{\text{max}}$)
To account for clinical consultation length variations, a variance window of $\pm \lfloor D / 2 \rfloor$ ($\pm 5\text{ mins}$) is applied:

$$\text{Wait}_{\text{min}} = \max\left(0, W_{\text{base}} - \left\lfloor \frac{D}{2} \right\rfloor\right)$$

$$\text{Wait}_{\text{max}} = W_{\text{base}} + \left\lfloor \frac{D}{2} \right\rfloor$$

#### Step 4: Special Handling for "Next in Line" (Position #1)
If $P = 0$ (the patient is Position #1, next to be called):
$$\text{Wait}_{\text{min}} = 0\text{ mins}, \quad \text{Wait}_{\text{max}} = 5\text{ mins}$$
*The UI displays a flashing green alert: **"🔔 You're Next! Please proceed to the consultation room."***

#### Step 5: Special Handling for Currently In Consultation (`In_Progress`)
If the appointment status is `In_Progress`:
$$\text{Queue Position} = 1, \quad \text{Wait Time} = 0\text{ mins}$$
*The UI displays: **"Consultation In Progress — Now Serving Token #X"***

---

## 📊 4. WORKED NUMERICAL EXAMPLE

Imagine 3 patients in Dr. Ananya's Cardiology OPD at **10:00 AM**:

| Patient | Token | Scheduled Time | Clinical Triage Level | Minutes Waited ($W$) | Missed Calls ($M$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Patient A (Routine)** | Token #1 | 09:30 AM | Level 2 (Routine) | 30 mins | 0 |
| **Patient B (Acute)** | Token #2 | 09:45 AM | Level 3 (Acute Fever) | 15 mins | 0 |
| **Patient C (Emergency)** | Token #3 | 10:00 AM | **Level 5 (Chest Pain)** | 0 mins | 0 |

### 🧮 ACPA CEP Score Calculation:

1. **Patient A (Routine):**
   - Slot Base: $(100 - 1) \times 10 = 990$
   - Aging: $30 \times 0.5 = 15$
   - Fairness: $30^{1.2} \times 0.1 = 5.9$
   - Triage Boost: $2 \times 20 = 40$
   - **Total CEP:** $990 + 15 + 5.9 + 40 = \mathbf{1050.9}$

2. **Patient B (Acute):**
   - Slot Base: $(100 - 2) \times 10 = 980$
   - Aging: $15 \times 0.5 = 7.5$
   - Fairness: $15^{1.2} \times 0.1 = 2.6$
   - Triage Boost: $3 \times 20 = 60$
   - **Total CEP:** $980 + 7.5 + 2.6 + 60 = \mathbf{1050.1}$

3. **Patient C (Emergency - Chest Pain):**
   - Slot Base: $(100 - 3) \times 10 = 970$
   - Aging: $0 \times 0.5 = 0$
   - Fairness: $0$
   - Triage Boost: **$+1000$ (Level 5 Emergency Override)**
   - **Total CEP:** $970 + 1000 = \mathbf{1970.0}$

### 🏆 Final Queue Order & Zomato ETAs:

| Position | Patient | CEP Score | Queue Status | Displayed Estimated Wait |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | **Patient C (Emergency)** | **1970.0** | 🔔 **Next to be Called** | **0 – 5 mins** |
| **#2** | **Patient A (Routine)** | **1050.9** | In Line | **5 – 15 mins** |
| **#3** | **Patient B (Acute)** | **1050.1** | In Line | **15 – 25 mins** |

*Result: Patient C instantly jumps to Position #1 due to critical cardiac triage, while Patient A stays ahead of Patient B due to earlier booking and accumulated wait time!*

---

## ⚡ 5. REAL-TIME EVENT SYNCHRONIZATION ARCHITECTURE

```
+--------------------------+        +---------------------------+
|  Doctor / Patient Action |        |    Apache Kafka Topic     |
| (Check-In / Call Next)   | -----> |  'scos.queue.updates'     |
+--------------------------+        +---------------------------+
                                                  |
                                                  v
+--------------------------+        +---------------------------+
|   Patient Smartphone UI  | <----- |     Socket.IO Gateway     |
| (Live ETA Auto-Update)   |        |  (Real-Time Broadcast)    |
+--------------------------+        +---------------------------+
```

1. When a event occurs (e.g. Doctor clicks **"Call Next Patient"**), an event is produced to Kafka topic `scos.queue.updates`.
2. Socket.IO broadcasts the event to all connected patient mobile clients.
3. Every patient device automatically triggers `fetchETA()` in `PatientQueueStatus.tsx`.
4. The queue position and wait time bar re-render seamlessly without requiring page refreshes!
