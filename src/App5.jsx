import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Shell from './components/Shell';
import PortalShell from './components/PortalShell';
import RoleHome from './components/RoleHome';

import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Beds from './pages/Beds';
import Lab from './pages/Lab';
import Inventory from './pages/Inventory';
import Prescriptions from './pages/Prescriptions';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Availability from './pages/Availability';
import Schedule from './pages/Schedule';
import PrintInvoice from './pages/PrintInvoice';
import PrintPrescription from './pages/PrintPrescription';
import PrintPatientReport from './pages/PrintPatientReport';
import Messages from './pages/Messages';

import PortalDashboard from './pages/portal/PortalDashboard';
import PortalAppointments from './pages/portal/PortalAppointments';
import PortalLabResults from './pages/portal/PortalLabResults';
import PortalPrescriptions from './pages/portal/PortalPrescriptions';
import PortalBilling from './pages/portal/PortalBilling';
import PortalMessages from './pages/portal/PortalMessages';

const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'receptionist'];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* Staff dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute roles={STAFF_ROLES}>
                <Shell />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHome />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="beds" element={<Beds />} />
            <Route path="lab" element={<Lab />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            <Route
              path="inventory"
              element={
                <ProtectedRoute roles={['admin', 'nurse']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route path="billing" element={<Billing />} />
            <Route
              path="reports"
              element={
                <ProtectedRoute roles={['admin', 'receptionist']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="availability"
              element={
                <ProtectedRoute roles={['admin', 'doctor']}>
                  <Availability />
                </ProtectedRoute>
              }
            />
            <Route path="schedule" element={<Schedule />} />
            <Route
              path="messages"
              element={
                <ProtectedRoute roles={['doctor']}>
                  <Messages />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Print-friendly pages — deliberately outside Shell/PortalShell so
              there's no sidebar/nav in the printed output. Still behind
              ProtectedRoute so a logged-out tab can't load someone's invoice. */}
          <Route path="/print/invoice/:id" element={<ProtectedRoute><PrintInvoice /></ProtectedRoute>} />
          <Route path="/print/prescription/:id" element={<ProtectedRoute><PrintPrescription /></ProtectedRoute>} />
          <Route
            path="/print/patient-report/:id"
            element={
              <ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse']}>
                <PrintPatientReport />
              </ProtectedRoute>
            }
          />

          {/* Patient self-service portal */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute roles={['patient']}>
                <PortalShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="appointments" element={<PortalAppointments />} />
            <Route path="lab-results" element={<PortalLabResults />} />
            <Route path="prescriptions" element={<PortalPrescriptions />} />
            <Route path="billing" element={<PortalBilling />} />
            <Route path="messages" element={<PortalMessages />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
