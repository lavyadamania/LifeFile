# SIH Hackathon AI Feature Proposals

To make this project stand out for the Smart India Hackathon (SIH), we need a feature that looks computationally impressive but remains 100% free without needing paid API keys. 

Here are three strong, hackathon-ready AI features we can implement natively. Please review and let me know which one (or multiple) you'd like to build!

## User Review Required

> [!IMPORTANT]
> Please review the 3 options below and reply with the number(s) you want to implement. All of these can be built to run natively in the browser/Node.js, keeping them completely free.

### Option 1: AI Cardiovascular / Diabetes Risk Predictor (Recommended)
**What it is:** A machine learning model (using math/logistic regression or a lightweight TensorFlow.js model) embedded in the patient portal. 
**How it works:** The patient enters basic vitals (Age, Blood Pressure, BMI, Glucose, Smoking Status). The AI calculates their % risk of developing heart disease or diabetes over the next 10 years.
**Why it wins SIH:** Judges love predictive healthcare models. It demonstrates the use of data science to shift from reactive to *preventative* healthcare.

### Option 2: Smart NLP Symptom Triage Checker
**What it is:** A natural language processing (NLP) symptom checker.
**How it works:** The patient types a paragraph explaining how they feel (e.g., "I have had a severe headache for 3 days, feeling dizzy, and my neck is stiff"). We use a local NLP library to extract the symptoms and match them against a medical knowledge base. The AI then outputs a triage level (e.g., "URGENT - Seek immediate care" or "MILD - Book a general consultation") and possible conditions.
**Why it wins SIH:** It demonstrates intelligent routing and reduces unnecessary hospital load, a massive problem in Indian healthcare.

### Option 3: "Smart Doctor Notes" with Auto-Extraction
**What it is:** An enhancement to the Doctor's Consultation screen.
**How it works:** Instead of manually typing medications and diagnosis, the doctor types a single block of raw clinical notes (e.g., "Patient presents with acute bronchitis. Prescribing Amoxicillin 500mg twice daily for 7 days."). We build a local NLP script that instantly scans the text, extracts the drug name, dosage, frequency, and diagnosis, and auto-fills the structured form.
**Why it wins SIH:** It tackles doctor burnout and administrative overhead, showing that the system makes doctors faster.

---

**Which option would you like to add? (I recommend combining Option 1 and Option 2 for maximum impact on the Patient side!)**
