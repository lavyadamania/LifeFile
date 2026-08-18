import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalToaster from './components/GlobalToaster';

// Layouts
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';
import AdminLayout from './layouts/AdminLayout';
import HospitalLayout from './layouts/HospitalLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Patient Pages
import PatientProfile from './pages/patient/PatientProfile';
import SearchDoctors from './pages/patient/SearchDoctors';
import DoctorBooking from './pages/patient/DoctorBooking';
import PublicDoctorProfile from './pages/patient/PublicDoctorProfile';
import PatientAppointments from './pages/patient/PatientAppointments';
import LiveQueue from './pages/patient/LiveQueue';
import PatientQueueStatus from './pages/patient/PatientQueueStatus';
import MedicalTimeline from './pages/patient/MedicalTimeline';
import SearchHospitals from './pages/patient/SearchHospitals';
import HospitalDetail from './pages/patient/HospitalDetail';
import HospitalRecords from './pages/patient/HospitalRecords';
import AIPredictor from './pages/patient/AIPredictor';
import SymptomTriage from './pages/patient/SymptomTriage';
import PatientAnalytics from './pages/patient/PatientAnalytics';

// Doctor Pages
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorQueue from './pages/doctor/DoctorQueue';
import DoctorConsultation from './pages/doctor/DoctorConsultation';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import DoctorRecords from './pages/doctor/DoctorRecords';
import DoctorHospitals from './pages/doctor/DoctorHospitals';
import DoctorAnalytics from './pages/doctor/DoctorAnalytics';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminManageDoctors from './pages/admin/AdminManageDoctors';
import AdminManageClinics from './pages/admin/AdminManageClinics';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminManageHospitals from './pages/admin/AdminManageHospitals';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Hospital Pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalAnalytics from './pages/hospital/HospitalAnalytics';

// Initialize React Query client
const queryClient = new QueryClient();

// Dummy route components
const DashboardRedirect = () => <Navigate to="/login" replace />;
const Unauthorized = () => <div className="p-4 flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold text-red-600">403 - Unauthorized Access</h1></div>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<DashboardRedirect />} />

            {/* Patient Routes */}
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route element={<PatientLayout />}>
                <Route path="/patient" element={<LiveQueue />} />
                <Route path="/patient/queue-status/:appointmentId" element={<PatientQueueStatus />} />
                <Route path="/patient/search" element={<SearchDoctors />} />
                <Route path="/patient/doctor/:id" element={<PublicDoctorProfile />} />
                <Route path="/patient/book/:doctorId" element={<DoctorBooking />} />
                <Route path="/patient/appointments" element={<PatientAppointments />} />
                <Route path="/patient/timeline" element={<MedicalTimeline />} />
                <Route path="/patient/hospitals" element={<SearchHospitals />} />
                <Route path="/patient/hospital/:id" element={<HospitalDetail />} />
                <Route path="/patient/hospital/:id/records" element={<HospitalRecords />} />
                <Route path="/patient/ai-predictor" element={<AIPredictor />} />
                <Route path="/patient/ai-triage" element={<SymptomTriage />} />
                <Route path="/patient/analytics" element={<PatientAnalytics />} />
                <Route path="/patient/settings" element={<PatientProfile />} />
                <Route path="/patient/history" element={<Navigate to="/patient/timeline" replace />} />
              </Route>
            </Route>

            {/* Doctor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route element={<DoctorLayout />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/doctor/queue" element={<DoctorQueue />} />
                <Route path="/doctor/consultation/:patientId" element={<DoctorConsultation />} />
                <Route path="/doctor/schedule" element={<DoctorSchedule />} />
                <Route path="/doctor/records" element={<DoctorRecords />} />
                <Route path="/doctor/profile" element={<DoctorProfile />} />
                <Route path="/doctor/hospitals" element={<DoctorHospitals />} />
                <Route path="/doctor/analytics" element={<DoctorAnalytics />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/doctors" element={<AdminManageDoctors />} />
                <Route path="/admin/clinics" element={<AdminManageClinics />} />
                <Route path="/admin/audit" element={<AdminAuditLogs />} />
                <Route path="/admin/hospitals" element={<AdminManageHospitals />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
              </Route>
            </Route>

            {/* Hospital Routes */}
            <Route element={<ProtectedRoute allowedRoles={['hospital']} />}>
              <Route element={<HospitalLayout />}>
                <Route path="/hospital" element={<HospitalDashboard />} />
                <Route path="/hospital/analytics" element={<HospitalAnalytics />} />
              </Route>
            </Route>
            
          </Routes>
        </Router>
        <GlobalToaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
