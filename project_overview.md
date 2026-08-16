# LifeFile (LifeFile) - Project Context

This document provides a 100% accurate, real, and detailed technical overview of the **LifeFile** (also referred to as **LifeFile / LifeFile**) project. This is designed to be fed directly into ChatGPT or any other LLM to provide complete context of the current state of the codebase.

---

## 1. Project Overview
LifeFile is a comprehensive, multi-tenant healthcare management system designed to digitize clinical workflows. It manages the interactions between four primary user types: **Patients**, **Doctors**, **Hospitals**, and **System Admins**. The platform handles everything from appointment booking and live queue tracking to multi-lingual AI assistance, prescription generation, and complex hospital roster management.

---

## 2. Technology Stack

### Frontend (`scos-frontend`)
*   **Core:** React 18, TypeScript, Vite
*   **Routing:** React Router DOM (v6)
*   **State Management:** Zustand (for Auth, Doctor state, Notification, and Streaming/Kafka state)
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **Forms & Validation:** React Hook Form, Zod
*   **Data Fetching:** Axios, React Query
*   **PDF Generation:** `html2pdf.js` (used for generating downloadable Prescription PDFs)

### Backend (`scos-backend`)
*   **Core:** Node.js, Express.js
*   **Database:** MongoDB with Mongoose ODM
*   **Authentication:** JWT (JSON Web Tokens), bcryptjs
*   **File Uploads:** Multer (handles attachments like X-Rays, MRIs, and Doctor Signatures)
*   **Real-time Infrastructure:** Apache Kafka (`kafkajs`). Used to stream live events (queue updates, appointment status changes, new prescriptions).

---

## 3. User Roles & Features

### 1. Patient (`/patient/*`)
*   **Dashboard & Live Queue:** Patients can see real-time queue updates powered by Kafka.
*   **Doctor Booking:** Patients can search for doctors by specialty or hospital, view their schedules (filtering out unavailable days set by hospitals), and book slots.
*   **Medical Timeline:** A historical view of past appointments and generated prescriptions/attachments.
*   **Access Control:** Patients have a privacy settings dashboard where they can explicitly toggle which doctors are allowed to view their full medical history (`grantedDoctors` array).
*   **AI Voice Assistant (`PatientAIAssistant.tsx`):** A global floating microphone button built using the native browser `SpeechRecognition` API. It supports English, Hindi, and Spanish out-of-the-box. It maps transcribed voice commands (e.g., "Book an appointment", "मुझे डॉक्टर से अपॉइंटमेंट चाहिए") to internal navigation routes.

### 2. Doctor (`/doctor/*`)
*   **Consultation Workspace:** A split-screen interface where doctors can view a patient's medical history on one side and write a new prescription on the other. 
*   **Prescription Generation:** Doctors can add medications (name, dosage, frequency, duration), write notes, and attach files (X-Rays). Upon saving, it auto-marks the appointment as 'Completed' and generates a PDF preview featuring the doctor's custom clinic header and digital signature.
*   **Hospital Network:** Doctors can search for public hospitals and click "Apply" to send a `JoinRequest`.
*   **Schedule Management:** Doctors can view their daily appointments, mark no-shows as "Missed", or "Postpone" them to a future date.

### 3. Hospital (`/hospital/*`)
*   **Facility Management:** Hospital accounts can edit their profile (address, phone, departments, status).
*   **Doctor Roster:** Hospitals can hire new doctors directly (auto-creating an account) or assign existing unassigned doctors from the global pool.
*   **Application Management:** Hospitals receive `JoinRequest` applications from doctors. Approving a request auto-adds the doctor to the hospital's roster.
*   **Unavailability Toggles:** Hospitals can select a doctor on their roster and mark them as "Unavailable" for specific dates (e.g., Holidays). This instantly blocks patients from booking that doctor *at that specific hospital* for that day.

### 4. System Admin (`/admin/*`)
*   **Global Oversight:** Admins have god-mode access to view, edit, and delete any Doctor, Clinic, or Hospital in the system.
*   **Audit Logs:** All critical actions (logins, deletions, profile updates) are tracked via an `AuditLog` model with severity levels (info, warning, critical).

---

## 4. Database Schema (MongoDB / Mongoose)

### `User.js`
*   `name`, `email`, `password`, `role` (enum: `patient`, `doctor`, `admin`, `hospital`).

### `Patient.js` / `Doctor.js` / `Hospital.js`
*   Every specialized profile is linked back to a core `User` document via `userId`.
*   **Doctor specific fields:** `specialization`, `hours`, `schedule` (weekly availability), `unavailableDates` (array of objects tracking `date` and `hospitalId`), `hospitals` (array of linked Hospital ObjectIds), `prescriptionTemplate`.
*   **Hospital specific fields:** `departments`, `doctors` (array of linked Doctor ObjectIds), `status` (active/maintenance).
*   **Patient specific fields:** `grantedDoctors` (array of doctors permitted to view history).

### `Appointment.js`
*   `patientId`, `doctorId`, `doctorName`, `date`, `time`, `status` (Confirmed, Pending, Cancelled, Rescheduled, Completed, Missed, Postponed), `isWalkin` (boolean for unregistered on-the-spot patients), `hospitalId` (if booked through a specific hospital context).

### `Prescription.js`
*   `patientId`, `doctorId`, `diagnosis`, `notes`, `medications` (array of name, dosage, frequency, duration), `attachments` (array of URLs for X-rays/labs).

### `JoinRequest.js`
*   `doctorId`, `doctorName`, `hospitalId`, `hospitalName`, `status` (pending, approved, rejected). Manages the workflow of doctors applying to work at hospitals.

---

## 5. Key Architecture Decisions & Workflows

1.  **Walk-in Patients:** Doctors can register walk-in patients directly from the consultation screen. The system auto-generates a `User` account with a default password and instantly creates a "Completed/Pending" appointment so the doctor can prescribe medicine immediately without the patient going through the registration portal.
2.  **Stateless PDF Generation:** The PDF prescription isn't generated and saved on the backend. Instead, the frontend fetches the structured JSON prescription data and uses `html2pdf.js` to render the PDF dynamically on the client side whenever a patient or doctor clicks "Download".
3.  **Kafka Implementation:** Located in `scos-backend/services/kafka.js`. It runs a producer and consumer locally. When an appointment status changes, an event is emitted. The frontend uses a polling/streaming hook (`useStreamingStore.ts`) to listen for these updates to make the live queue numbers shift without refreshing the page.
4.  **Role-Based Access Control (RBAC):** `auth.js` middleware uses `requireRole('admin', 'hospital')` to protect routes. Furthermore, deep resource authorization checks ensure that a Hospital can only edit doctors *within their own roster* (`hospital.userId === req.user.id`), preventing cross-tenant data leaks.
