import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TrainerLayout from './layouts/TrainerLayout';
import MemberLayout from './layouts/MemberLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import MemberManagement from './pages/trainer/MemberManagement';
import MemberDetail from './pages/trainer/MemberDetail';
import RoutineTemplates from './layouts/RoutineTemplates';
import TrainerSchedule from './pages/trainer/TrainerSchedule';
import MySchedule from './pages/member/MySchedule';
import DietLog from './pages/member/DietLog';
import BodyStats from './pages/member/BodyStats';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 루트 경로는 로그인 페이지로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* 공통 라우트 (로그인 등) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 트레이너 전용 영역 */}
        <Route
          path="/trainer"
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <TrainerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/trainer/members" replace />} />
          <Route path="members" element={<MemberManagement />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="templates" element={<RoutineTemplates />} />
          <Route path="schedule" element={<TrainerSchedule />} />
        </Route>

        {/* 회원 전용 영역 */}
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/member/my-schedule" replace />} />
          <Route path="my-schedule" element={<MySchedule />} />
          <Route path="diet" element={<DietLog />} />
          <Route path="progress" element={<BodyStats />} />
        </Route>

        {/* 관리자 전용 영역 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;