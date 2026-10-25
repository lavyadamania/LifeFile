from __future__ import annotations

import os

import plotly.express as px
import streamlit as st

from pipeline import (
    DEFAULT_MONGO_URI,
    add_review_sentiment,
    clean_appointment_data,
    load_project_data,
    load_warehouse,
    warehouse_insights,
)

st.set_page_config(page_title="LifeFile BI", page_icon="🏥", layout="wide")


@st.cache_data
def get_data(mongo_uri: str):
    appointments, reviews = load_project_data(mongo_uri)
    return clean_appointment_data(appointments), add_review_sentiment(reviews)


st.title("LifeFile Operational BI")
st.caption("Live analysis of appointments, clinical workload, hospital activity, and patient reviews.")

mongo_uri = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
try:
    appointments, reviews = get_data(mongo_uri)
except Exception as error:
    st.error(f"Could not load LifeFile MongoDB data: {error}")
    st.info("Start MongoDB, seed the LifeFile database, and set MONGO_URI if it is not using the default connection.")
    st.stop()

with st.sidebar:
    st.header("Filters")
    st.link_button("Open Metabase", os.getenv("METABASE_URL", "http://localhost:3000"), use_container_width=True)
    hospitals = st.multiselect("Hospital", sorted(appointments["hospital_name"].unique()), default=sorted(appointments["hospital_name"].unique()))
    specializations = st.multiselect("Specialization", sorted(appointments["specialization"].unique()), default=sorted(appointments["specialization"].unique()))
    statuses = st.multiselect("Status", sorted(appointments["status"].unique()), default=sorted(appointments["status"].unique()))
    walkin = st.selectbox("Visit type", ["All", "Walk-in", "Booked"])

filtered = appointments[
    appointments["hospital_name"].isin(hospitals)
    & appointments["specialization"].isin(specializations)
    & appointments["status"].isin(statuses)
]
if walkin == "Walk-in":
    filtered = filtered[filtered["is_walkin"]]
elif walkin == "Booked":
    filtered = filtered[~filtered["is_walkin"]]

if filtered.empty:
    st.warning("No appointments match the selected filters.")
    st.stop()

completed = int((filtered["status"].str.lower() == "completed").sum())
completion_rate = completed / len(filtered) * 100
avg_triage = filtered["triage_level"].mean()
active_patients = filtered["patient_id"].nunique()

kpi1, kpi2, kpi3, kpi4 = st.columns(4)
kpi1.metric("Appointments", f"{len(filtered):,}")
kpi2.metric("Completed", f"{completed:,}")
kpi3.metric("Completion rate", f"{completion_rate:.1f}%")
kpi4.metric("Unique patients", f"{active_patients:,}")
st.caption(f"Average triage level in the selected data: {avg_triage:.1f} / 5")

left, right = st.columns(2)
with left:
    daily = filtered.groupby("day", as_index=False).size().rename(columns={"size": "appointments"})
    st.plotly_chart(px.line(daily, x="day", y="appointments", markers=True, title="Appointment volume"), use_container_width=True)
with right:
    status = filtered["status"].value_counts().rename_axis("status").reset_index(name="appointments")
    st.plotly_chart(px.bar(status, x="status", y="appointments", color="status", title="Appointment status"), use_container_width=True)

left, right = st.columns(2)
with left:
    doctors = filtered.groupby(["doctor_name", "specialization"], as_index=False).size().rename(columns={"size": "appointments"}).sort_values("appointments", ascending=False).head(15)
    st.plotly_chart(px.bar(doctors, x="appointments", y="doctor_name", color="specialization", orientation="h", title="Doctor workload"), use_container_width=True)
with right:
    triage = filtered["triage_level"].value_counts().sort_index().rename_axis("triage_level").reset_index(name="appointments")
    st.plotly_chart(px.bar(triage, x="triage_level", y="appointments", title="Triage distribution"), use_container_width=True)

st.subheader("Patient review sentiment")
if reviews.empty:
    st.info("No patient reviews are available in the database.")
else:
    review_chart = reviews[reviews["doctor_id"].isin(filtered["doctor_id"])]
    if review_chart.empty:
        review_chart = reviews
    sentiment = review_chart["sentiment"].value_counts().rename_axis("sentiment").reset_index(name="reviews")
    st.plotly_chart(px.pie(sentiment, names="sentiment", values="reviews", title="Review sentiment"), use_container_width=True)

st.subheader("Warehouse SQL insights")
warehouse = load_warehouse(filtered, reviews)
insights = warehouse_insights(warehouse)
insight_tab1, insight_tab2, insight_tab3 = st.tabs(["Doctor load", "Hospital load", "Patient activity"])
with insight_tab1:
    st.dataframe(insights["doctor_load"], use_container_width=True, hide_index=True)
with insight_tab2:
    st.dataframe(insights["hospital_load"], use_container_width=True, hide_index=True)
with insight_tab3:
    st.dataframe(insights["patient_activity"], use_container_width=True, hide_index=True)
warehouse.close()
