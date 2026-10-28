import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"e:\ie proj\lifefile_screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def capture_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Login Page
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_page.png"))
        print("Captured: 01_login_page.png")

        # 2. Log in as Patient (Aarav Sharma - P01)
        p01_btn = page.locator("button:has-text('P01')").first
        if p01_btn.is_visible():
            p01_btn.click()
            time.sleep(3)
            print("Patient logged in! URL:", page.url)

            # Patient Appointments & Check-In Window
            page.goto("http://localhost:5173/patient/appointments", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "05_patient_appointments.png"))
            print("Captured: 05_patient_appointments.png")

            # Patient Live Queue & Dynamic ETA
            page.goto("http://localhost:5173/patient/queue", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "06_patient_live_queue.png"))
            print("Captured: 06_patient_live_queue.png")

            # Patient Symptom Triage NLP
            page.goto("http://localhost:5173/patient/symptoms", wait_until="networkidle")
            time.sleep(2)
            try:
                ta = page.locator("textarea").first
                if ta.is_visible():
                    ta.fill("Severe squeezing chest pain radiating to left shoulder with shortness of breath and sweating")
                    time.sleep(1)
            except Exception as e:
                pass
            page.screenshot(path=os.path.join(OUTPUT_DIR, "07_patient_symptom_triage.png"))
            print("Captured: 07_patient_symptom_triage.png")

            # Patient AI Health Risk Predictor
            page.goto("http://localhost:5173/patient/predictor", wait_until="networkidle")
            time.sleep(2)
            try:
                calc_btn = page.locator("button:has-text('Calculate')").first
                if calc_btn.is_visible():
                    calc_btn.click()
                    time.sleep(1)
            except Exception as e:
                pass
            page.screenshot(path=os.path.join(OUTPUT_DIR, "08_patient_ai_risk_predictor.png"))
            print("Captured: 08_patient_ai_risk_predictor.png")

            # Patient Medical Timeline & Password Protected Records
            page.goto("http://localhost:5173/patient/timeline", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "09_patient_medical_timeline.png"))
            print("Captured: 09_patient_medical_timeline.png")

        context.close()

        # 3. Log in as Doctor
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1)
        doc_btn = page.locator("button:has-text('Dr. Vikram Rao')").first
        if doc_btn.is_visible():
            doc_btn.click()
            time.sleep(3)
            print("Doctor logged in! URL:", page.url)

            # Doctor Queue Dashboard
            page.goto("http://localhost:5173/doctor/queue", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "02_doctor_queue_dashboard.png"))
            print("Captured: 02_doctor_queue_dashboard.png")

            # Doctor Records & Patient Memory
            page.goto("http://localhost:5173/doctor/records", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "03_doctor_memory_records.png"))
            print("Captured: 03_doctor_memory_records.png")

            # Doctor Schedule & Clinic Hours
            page.goto("http://localhost:5173/doctor/schedule", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "04_doctor_schedule.png"))
            print("Captured: 04_doctor_schedule.png")

        context.close()

        # 4. Log in as Admin
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1)
        admin_btn = page.locator("button:has-text('Admin (1)')").first
        if admin_btn.is_visible():
            admin_btn.click()
            time.sleep(0.5)
            admin_quick = page.locator("button:has-text('System Admin')").first
            if admin_quick.is_visible():
                admin_quick.click()
                time.sleep(3)
                print("Admin logged in! URL:", page.url)

                # SIH Benchmark Dashboard
                page.goto("http://localhost:5173/admin/benchmark", wait_until="networkidle")
                time.sleep(2)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "10_admin_sih_benchmark.png"))
                print("Captured: 10_admin_sih_benchmark.png")

                # Hospital Analytics
                page.goto("http://localhost:5173/hospital/analytics", wait_until="networkidle")
                time.sleep(2)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "11_hospital_analytics.png"))
                print("Captured: 11_hospital_analytics.png")

        context.close()

        # 5. Streamlit / Power BI Dashboard (Port 8511)
        context = browser.new_context(viewport={'width': 1440, 'height': 1100})
        page = context.new_page()
        try:
            page.goto("http://localhost:8511", wait_until="networkidle")
            time.sleep(4)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "12_operational_bi_powerbi.png"))
            print("Captured: 12_operational_bi_powerbi.png")
        except Exception as e:
            print("BI error:", e)
        context.close()

        browser.close()
        print("Feature capturing completed!")

if __name__ == "__main__":
    capture_features()
