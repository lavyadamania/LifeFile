from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path

import pandas as pd
import plotly.express as px
from pymongo import MongoClient
from textblob import TextBlob

BASE_DIR = Path(__file__).resolve().parent
REPORT_DIR = BASE_DIR / "reports"
DEFAULT_MONGO_URI = "mongodb://localhost:27017/scos"


def as_text(value: object) -> str:
    return "" if value is None else str(value)


def load_project_data(mongo_uri: str = DEFAULT_MONGO_URI, database: str = "scos") -> tuple[pd.DataFrame, pd.DataFrame]:
    """Read real LifeFile appointments and reviews from the project's MongoDB database."""
    with MongoClient(mongo_uri, serverSelectionTimeoutMS=5000) as client:
        client.admin.command("ping")
        db = client[database]
        appointments = list(db.appointments.find({}))
        reviews = list(db.reviews.find({}))
        doctors = {as_text(item.get("_id")): item for item in db.doctors.find({})}
        hospitals = {as_text(item.get("_id")): item for item in db.hospitals.find({})}

    appointment_rows = []
    for item in appointments:
        doctor_id = as_text(item.get("doctorId"))
        hospital_id = as_text(item.get("hospitalId"))
        doctor = doctors.get(doctor_id, {})
        hospital = hospitals.get(hospital_id, {})
        appointment_rows.append(
            {
                "appointment_id": as_text(item.get("_id")),
                "appointment_date": item.get("date") or item.get("createdAt"),
                "patient_id": as_text(item.get("patientId")),
                "doctor_id": doctor_id,
                "doctor_name": item.get("doctorName") or doctor.get("name", "Unknown"),
                "specialization": item.get("spec") or doctor.get("specialization", "Unknown"),
                "hospital_id": hospital_id,
                "hospital_name": item.get("hospitalName") or hospital.get("name", "Private / Unknown"),
                "status": item.get("status", "Pending"),
                "is_walkin": bool(item.get("isWalkin", False)),
                "triage_level": item.get("triageLevel", 1),
                "location": item.get("location", ""),
                "chief_complaint": item.get("chiefComplaint", ""),
            }
        )

    review_rows = [
        {
            "review_id": as_text(item.get("_id")),
            "review_date": item.get("createdAt"),
            "patient_id": as_text(item.get("patientId")),
            "doctor_id": as_text(item.get("doctorId")),
            "rating": item.get("rating"),
            "comment": item.get("comment", ""),
        }
        for item in reviews
    ]

    appointments_df = pd.DataFrame(appointment_rows)
    reviews_df = pd.DataFrame(review_rows)
    if appointments_df.empty:
        raise RuntimeError("No appointments found in MongoDB. Seed the LifeFile database first.")
    return appointments_df, reviews_df


def load_exported_data(input_dir: str | Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load the BI CSV exports without requiring a MongoDB connection."""
    export_dir = Path(input_dir)
    appointments_path = export_dir / "cleaned_appointments.csv"
    reviews_path = export_dir / "review_sentiment.csv"
    if not appointments_path.exists() or not reviews_path.exists():
        raise FileNotFoundError(
            f"Expected {appointments_path.name} and {reviews_path.name} in {export_dir}"
        )
    return pd.read_csv(appointments_path), pd.read_csv(reviews_path)


def clean_appointment_data(data: pd.DataFrame) -> pd.DataFrame:
    cleaned = data.copy()
    cleaned.columns = cleaned.columns.str.strip().str.lower().str.replace(" ", "_", regex=False)
    cleaned = cleaned.drop_duplicates(subset=["appointment_id"], keep="last")
    cleaned["appointment_date"] = pd.to_datetime(cleaned["appointment_date"], errors="coerce")
    cleaned["appointment_date"] = cleaned["appointment_date"].fillna(pd.Timestamp.now())
    for column in ["doctor_name", "specialization", "hospital_name", "status", "location"]:
        cleaned[column] = cleaned[column].fillna("Unknown").astype(str).str.strip()
    cleaned["triage_level"] = pd.to_numeric(cleaned["triage_level"], errors="coerce").fillna(1).clip(1, 5).astype(int)
    cleaned["is_walkin"] = cleaned["is_walkin"].fillna(False).astype(bool)
    cleaned["month"] = cleaned["appointment_date"].dt.to_period("M").astype(str)
    cleaned["day"] = cleaned["appointment_date"].dt.date.astype(str)
    return cleaned


def add_review_sentiment(reviews: pd.DataFrame) -> pd.DataFrame:
    result = reviews.copy()
    if result.empty:
        result["polarity"] = pd.Series(dtype=float)
        result["sentiment"] = pd.Series(dtype=str)
        return result
    result["rating"] = pd.to_numeric(result["rating"], errors="coerce").fillna(0).clip(0, 5)
    result["comment"] = result["comment"].fillna("").astype(str).str.strip()
    result["polarity"] = result["comment"].map(lambda text: round(TextBlob(text).sentiment.polarity, 3))
    result["sentiment"] = result["polarity"].map(
        lambda value: "Positive" if value > 0.1 else "Negative" if value < -0.1 else "Neutral"
    )
    return result


def load_warehouse(appointments: pd.DataFrame, reviews: pd.DataFrame, database: str | Path = ":memory:") -> sqlite3.Connection:
    connection = sqlite3.connect(database)
    appointments[["patient_id"]].drop_duplicates().to_sql("dim_patient", connection, if_exists="replace", index=False)
    appointments[["doctor_id", "doctor_name", "specialization"]].drop_duplicates("doctor_id").to_sql(
        "dim_doctor", connection, if_exists="replace", index=False
    )
    appointments[["hospital_id", "hospital_name"]].drop_duplicates("hospital_id").to_sql(
        "dim_hospital", connection, if_exists="replace", index=False
    )
    appointments[
        ["appointment_id", "appointment_date", "patient_id", "doctor_id", "hospital_id", "status", "is_walkin", "triage_level"]
    ].to_sql("fact_appointments", connection, if_exists="replace", index=False)
    reviews.to_sql("fact_reviews", connection, if_exists="replace", index=False)
    return connection


def warehouse_insights(connection: sqlite3.Connection) -> dict[str, pd.DataFrame]:
    queries = {
        "status_breakdown": """
            SELECT status, COUNT(*) AS appointments
            FROM fact_appointments GROUP BY status ORDER BY appointments DESC
        """,
        "doctor_load": """
            SELECT d.doctor_name, d.specialization, COUNT(f.appointment_id) AS appointments
            FROM fact_appointments f JOIN dim_doctor d ON f.doctor_id = d.doctor_id
            GROUP BY d.doctor_id, d.doctor_name, d.specialization ORDER BY appointments DESC
        """,
        "hospital_load": """
            SELECT h.hospital_name, COUNT(f.appointment_id) AS appointments
            FROM fact_appointments f JOIN dim_hospital h ON f.hospital_id = h.hospital_id
            GROUP BY h.hospital_id, h.hospital_name ORDER BY appointments DESC
        """,
        "patient_activity": """
            SELECT patient_id, COUNT(*) AS appointments,
                   SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
            FROM fact_appointments GROUP BY patient_id ORDER BY appointments DESC LIMIT 20
        """,
    }
    return {name: pd.read_sql_query(query, connection) for name, query in queries.items()}


def export_reports(appointments: pd.DataFrame, reviews: pd.DataFrame) -> dict[str, object]:
    REPORT_DIR.mkdir(exist_ok=True)
    connection = load_warehouse(appointments, reviews)
    insights = warehouse_insights(connection)
    appointments.to_csv(REPORT_DIR / "cleaned_appointments.csv", index=False)
    reviews.to_csv(REPORT_DIR / "review_sentiment.csv", index=False)
    for name, frame in insights.items():
        frame.to_csv(REPORT_DIR / f"{name}.csv", index=False)

    chart = px.bar(insights["doctor_load"].head(10), x="doctor_name", y="appointments", color="specialization", title="Appointments by Doctor")
    chart.write_html(REPORT_DIR / "appointments_by_doctor.html", include_plotlyjs="cdn")
    completed = int((appointments["status"].str.lower() == "completed").sum())
    summary = {
        "source": "MongoDB LifeFile scos database",
        "appointments": len(appointments),
        "reviews": len(reviews),
        "completed_appointments": completed,
        "completion_rate": round(completed / len(appointments) * 100, 2),
        "sentiment_counts": reviews["sentiment"].value_counts().to_dict() if not reviews.empty else {},
    }
    (REPORT_DIR / "summary.json").write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    connection.close()
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Run BI analysis on the real LifeFile MongoDB data.")
    parser.add_argument("--mongo-uri", default=os.getenv("MONGO_URI", DEFAULT_MONGO_URI))
    parser.add_argument("--database", default="scos")
    parser.add_argument(
        "--input-dir",
        default=os.getenv("BI_INPUT_DIR"),
        help="Read cleaned_appointments.csv and review_sentiment.csv instead of MongoDB.",
    )
    args = parser.parse_args()
    if args.input_dir:
        appointments, reviews = load_exported_data(args.input_dir)
    else:
        appointments, reviews = load_project_data(args.mongo_uri, args.database)
    appointments = clean_appointment_data(appointments)
    reviews = add_review_sentiment(reviews)
    print(json.dumps(export_reports(appointments, reviews), indent=2, default=str))


if __name__ == "__main__":
    main()
