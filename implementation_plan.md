# Advanced Algorithm Implementation: Dynamic Weighted Priority Algorithm (DWPA)

For a Smart India Hackathon (SIH) winning project, a simple FIFO or basic token queue is insufficient. To truly stand out, we must approach this like a computer science thesis by implementing a **Dynamic Weighted Priority Algorithm (DWPA)** inspired by Operating System CPU Scheduling (Multi-Level Feedback Queue & Aging).

## The Core Problem with Standard Queues
1. **FIFO**: Breaks instantly if a patient is late.
2. **Basic Token**: If a doctor "Skips" Token 4 to the end of the line, Token 4 might wait 5 hours (Queue Starvation).
3. **Walk-ins**: Walk-in emergencies disrupt the schedule, pushing all booked tokens back indefinitely.

## The Solution: Current Effective Priority (CEP)

Instead of a static position, every patient in the queue is constantly evaluated based on a continuous mathematical formula. The patient with the highest **CEP** is always next.

### The Mathematics

```text
CEP = (W_base × Slot_Order) + (W_age × Wait_Time) + (W_triage × Severity) - (W_penalty × Missed_Calls)
```

**Variables Explained:**
- `Slot_Order (Base Token)`: The sequential number given at booking time (e.g., Token 5).
- `Wait_Time (Aging Factor)`: For every minute past their appointment time, their score slowly increases. This **prevents Starvation**. Even a low-priority patient will eventually reach maximum priority and be seen.
- `Severity (Triage Factor)`: Walk-ins or AI-determined severe cases get a multiplier boost to jump the queue safely.
- `Missed_Calls (The Skip Penalty)`: If a doctor clicks "Skip / Patient Not Present", the patient is NOT deleted or thrown to the absolute back. Instead, they receive a massive penalty drop. This allows the next 2-3 tokens to instantly bypass them. As time passes, the *Aging Factor* slowly raises their score back up, naturally slipping them back into the queue when they finally arrive.

## System Architecture

### 1. Backend: The Priority Engine (`scos-backend`)
- **Appointment Model**: Will store `baseToken`, `triageLevel` (1-5), and `missedCalls` (default 0).
- **Kafka Engine**: Will broadcast raw state events (`ADD`, `SKIP`, `TRIAGE_UPDATE`).

### 2. Frontend: The Real-Time Sorting Matrix (`scos-frontend`)
- **Dynamic Re-sorting**: The frontend array (`queueList`) is no longer static. Every 60 seconds (or on every Kafka event), the React state runs the CEP mathematical formula for every patient and re-sorts the array `O(N log N)`. 
- **Doctor UI**: The doctor sees the queue shifting dynamically. The "Skip" button will simply increment the patient's `missedCalls` value in the database and fire a Kafka event. The queue will instantly re-sort, dropping that patient down a few spots based on the math.

## User Review Required

> [!IMPORTANT]
> This is a highly advanced, thesis-level algorithm. It will look incredible in an SIH presentation because you can show the judges the actual mathematical formula determining patient flow.
> 
> **Are you ready to implement the Dynamic Weighted Priority Algorithm (DWPA)?**
