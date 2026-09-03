import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import AccountsPage from './pages/AccountsPage';
import LeadsPage from './pages/LeadsPage';
import DealsPage from './pages/DealsPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ImportPage from './pages/ImportPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ContractsPage from './pages/ContractsPage';
import AreasPage from './pages/AreasPage';
import FinancePage from './pages/FinancePage';
import InventoryPage from './pages/InventoryPage';
import HrPage from './pages/HrPage';
import ProjectsPage from './pages/ProjectsPage';
import ExpensesPage from './pages/ExpensesPage';
import MarketingPage from './pages/MarketingPage';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedbackProvider } from '@/components/Feedback';
import { ApiError } from '@/lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeedbackProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/areas" element={<AreasPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/hr" element={<HrPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
