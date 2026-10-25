# LifeFile BI Lab Practicals

This folder implements five practicals against the real LifeFile MongoDB database. It does not generate fake sales data.

## Practicals covered

1. **Open-source BI visualizations**: Plotly charts show appointment, doctor, hospital, and review performance.
2. **Data cleaning**: Pandas removes duplicate appointments, handles missing fields, normalizes statuses, and validates triage levels.
3. **Interactive dashboard**: Streamlit provides hospital, specialization, status, and walk-in filters.
4. **Data warehouse and SQL**: SQLite creates patient, doctor, hospital, appointment, and review fact/dimension tables.
5. **Sentiment analysis**: TextBlob assigns polarity and Positive/Neutral/Negative labels to real patient reviews.

## Metabase integration

The included [docker-compose.metabase.yml](docker-compose.metabase.yml) runs Metabase alongside the existing local MongoDB:

```powershell
docker compose -f docker-compose.metabase.yml up -d
```

Open `http://localhost:3000`, complete the first-time Metabase setup, and add a MongoDB database with:

- Host: `host.docker.internal`
- Port: `27017`
- Database: `scos`

Use the `appointments`, `doctors`, `hospitals`, and `reviews` collections to build saved BI questions and dashboards. The Streamlit sidebar includes an **Open Metabase** link.

## Setup

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python pipeline.py
streamlit run dashboard.py
```

The pipeline reads MongoDB using `MONGO_URI` (default: `mongodb://localhost:27017/scos`) and writes cleaned data, SQL query results, an HTML chart, and `summary.json` into `reports/`. Seed the LifeFile database before running it.

## Suggested submission evidence

- `pipeline.py`: source implementation
- `reports/cleaned_appointments.csv`: cleaned LifeFile appointment data
- `reports/status_breakdown.csv`, `doctor_load.csv`, `hospital_load.csv`, and `patient_activity.csv`: SQL outputs
- `reports/review_sentiment.csv`: sentiment results for real patient reviews
- `reports/appointments_by_doctor.html`: static BI visualization
- A screenshot of the Streamlit dashboard with filters applied
