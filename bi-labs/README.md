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

## Google Colab: live MongoDB Atlas

Colab cannot access a MongoDB server bound to your computer's `localhost`. For a live connection:

1. Create a MongoDB Atlas cluster and database user.
2. In Atlas, add the Colab IP range to Network Access, or use the least-permissive approved access rule for your demo.
3. Copy the Atlas connection string and store it as a Colab secret named `MONGO_URI`. Do not commit it or paste it into a notebook cell.
4. Clone this repository in Colab and install the BI dependencies:

```python
!git clone https://github.com/lavyadamania/LifeFile.git
%cd LifeFile/bi-labs
!pip install -r requirements.txt
```

```python
import os
from google.colab import userdata

os.environ["MONGO_URI"] = userdata.get("MONGO_URI")
!python pipeline.py --database scos
```

If you do not use Colab Secrets, replace the assignment with:

```python
from getpass import getpass
os.environ["MONGO_URI"] = getpass("MongoDB Atlas URI: ")
```

The URI should use `mongodb+srv://...` and point to the `scos` database. The live export files will be written to `bi-labs/reports/`.

## Google Colab: offline CSV/JSON-style export workflow

This option does not require Colab to connect to MongoDB:

1. On the development computer, set `MONGO_URI` to the local or Atlas database and run `python pipeline.py`.
2. Copy `bi-labs/reports/cleaned_appointments.csv` and `bi-labs/reports/review_sentiment.csv` to Colab.
3. Run the BI pipeline from the copied folder:

```python
from google.colab import files
files.upload()  # Select both CSV files
```

```python
!python pipeline.py --input-dir /content
```

The same import mode is available to Streamlit:

```powershell
$env:BI_INPUT_DIR = "reports"
streamlit run dashboard.py
```

When `BI_INPUT_DIR` is set, the dashboard uses the two exported CSV files and does not open a MongoDB connection.

## Suggested submission evidence

- `pipeline.py`: source implementation
- `reports/cleaned_appointments.csv`: cleaned LifeFile appointment data
- `reports/status_breakdown.csv`, `doctor_load.csv`, `hospital_load.csv`, and `patient_activity.csv`: SQL outputs
- `reports/review_sentiment.csv`: sentiment results for real patient reviews
- `reports/appointments_by_doctor.html`: static BI visualization
- A screenshot of the Streamlit dashboard with filters applied
