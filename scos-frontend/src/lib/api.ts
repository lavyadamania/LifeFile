import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('scos-auth-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// Auth
export const loginUser = (data: { email: string; password: string; role: string }) =>
  api.post('/auth/login', data);

export const registerUser = (data: { name: string; email: string; password: string; role: string }) =>
  api.post('/auth/register', data);

export const getMe = () => api.get('/auth/me');

// Doctors
export const getDoctorProfile = () => api.get('/doctors/me');
export const getDoctors = (params?: { search?: string; spec?: string; hospitalId?: string }) =>
  api.get('/doctors', { params });

export const addDoctor = (data: any) => api.post('/doctors', data);
export const updateDoctor = (id: string, data: any) => api.put(`/doctors/${id}`, data);
export const deleteDoctor = (id: string) => api.delete(`/doctors/${id}`);

// Clinics
export const getClinics = (params?: { search?: string }) =>
  api.get('/clinics', { params });

export const addClinic = (data: any) => api.post('/clinics', data);
export const updateClinic = (id: string, data: any) => api.put(`/clinics/${id}`, data);

// Appointments
export const getAppointments = (params?: { status?: string }) =>
  api.get('/appointments', { params });

export const createAppointment = (data: any) => api.post('/appointments', data);
export const rescheduleAppointment = (id: string, data: any) => api.put(`/appointments/${id}`, data);
export const cancelAppointment = (id: string) => api.delete(`/appointments/${id}`);
export const createWalkinAppointment = (data: any) => api.post('/appointments/walkin', data);
export const getMissedAppointments = (params?: { hospitalId?: string }) => api.get('/appointments/missed', { params });
export const updateAppointmentStatus = (id: string, data: { status: string; postponedDate?: string; postponedTime?: string }) =>
  api.put(`/appointments/${id}/status`, data);

// Patients
export const getPatientProfile = () => api.get('/patients/me');
export const updatePatientProfile = (data: any) => api.put('/patients/me', data);
export const searchPatients = (q: string) => api.get('/patients/search', { params: { q } });

// Medical Records (Patient uploaded)
export const createMedicalRecord = (data: any) => api.post('/patients/records', data);
export const getMedicalRecords = () => api.get('/patients/records');
export const verifyMedicalRecordPassword = (id: string, password: string) => api.post(`/patients/records/${id}/verify`, { password });

// Queue
export const addToQueue = (data: { patientId: string; patientName?: string; doctorId?: string }) => api.post('/queue/add', data);

// Prescriptions
export const getPrescriptions = (params?: { hospitalId?: string }) => api.get('/prescriptions', { params });
export const createPrescription = (data: any) => api.post('/prescriptions', data);
export const getPatientPrescriptions = (patientId: string) => api.get(`/prescriptions/patient/${patientId}`);

// File Uploads
export const uploadSignature = (file: File) => {
  const fd = new FormData();
  fd.append('signature', file);
  return api.post('/doctors/upload-signature', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadAttachment = (file: File, type: string) => {
  const fd = new FormData();
  fd.append('attachment', file);
  fd.append('type', type);
  return api.post('/prescriptions/upload-attachment', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Audit Logs
export const getAuditLogs = (params?: { severity?: string }) =>
  api.get('/audit-logs', { params });

// Reviews
export const getReviews = (doctorId: string) => api.get(`/reviews/${doctorId}`);
export const submitReview = (data: any) => api.post('/reviews', data);

// Stats (admin dashboard)
export const getStats = () => api.get('/stats');

// Hospitals
export const getHospitals = (params?: { search?: string; department?: string }) =>
  api.get('/hospitals', { params });
export const getMyHospital = () => api.get('/hospitals/me');
export const updateMyHospital = (data: any) => api.put('/hospitals/me', data);
export const getHospital = (id: string) => api.get(`/hospitals/${id}`);
export const addHospital = (data: any) => api.post('/hospitals', data);
export const updateHospital = (id: string, data: any) => api.put(`/hospitals/${id}`, data);
export const deleteHospital = (id: string) => api.delete(`/hospitals/${id}`);
export const updateHospitalDoctors = (id: string, data: { doctorId: string; action: 'add' | 'remove' }) =>
  api.put(`/hospitals/${id}/doctors`, data);
export const applyToHospital = (hospitalId: string) => api.post(`/hospitals/${hospitalId}/apply`);
export const getHospitalRequests = () => api.get('/hospitals/me/requests');
export const updateHospitalRequest = (reqId: string, status: string) => api.put(`/hospitals/me/requests/${reqId}`, { status });
export const markDoctorUnavailable = (hospitalId: string, doctorId: string, data: { date: string, reason?: string }) => api.post(`/hospitals/${hospitalId}/doctors/${doctorId}/unavailable`, data);
export const getDoctorApplications = () => api.get('/doctors/me/requests');
export const hireHospitalDoctor = (id: string, data: { name: string; email: string; password: string; specialization?: string }) =>
  api.post(`/hospitals/${id}/hire`, data);
export const getHospitalPatientRecords = (hospitalId: string, patientId: string) =>
  api.get(`/hospitals/${hospitalId}/records/${patientId}`);
export const transferHospital = (hospitalId: string | null) =>
  api.put('/patients/me/hospital', { hospitalId });
export const getHospitalPrescriptions = (hospitalId: string, patientId: string) =>
  api.get(`/prescriptions/hospital/${hospitalId}/patient/${patientId}`);

export default api;
