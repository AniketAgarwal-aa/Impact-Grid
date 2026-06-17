/**
 * ImpactSensei v5.1 - App Router
 * Three-tier: Admin | Project Manager | Client
 * v5.1: Real-time WebSockets, 2FA, Advanced Analytics, Webhooks
 */
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ToastContainer } from "@/components/common/Toast";
import Layout from "@/components/layout/Layout";

import React, { Suspense } from 'react';

// Public
const Landing = React.lazy(() => import('@/pages/Landing'));
const Login = React.lazy(() => import('@/pages/Login'));
const Signup = React.lazy(() => import('@/pages/Signup'));
const ResetPassword = React.lazy(() => import('@/pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('@/pages/VerifyEmail'));

// Shared (all authenticated roles)
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Projects = React.lazy(() => import('@/pages/Projects'));
const ProjectDetail = React.lazy(() => import('@/pages/ProjectDetail'));
const NewAnalysis = React.lazy(() => import('@/pages/NewAnalysis'));
const Results = React.lazy(() => import('@/pages/Results'));
const Scenarios = React.lazy(() => import('@/pages/Scenarios'));
const Compare = React.lazy(() => import('@/pages/Compare'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const Notifications = React.lazy(() => import('@/pages/Notifications'));

// PM Pages
const PMDashboard = React.lazy(() => import('@/pages/PMDashboard'));
const Approvals = React.lazy(() => import('@/pages/Approvals'));
const TeamManagement = React.lazy(() => import('@/pages/TeamManagement'));

// Admin Pages
const AdminDashboard = React.lazy(() => import('@/pages/AdminDashboard'));
const UserManagement = React.lazy(() => import('@/pages/UserManagement'));
const CompanyManagement = React.lazy(() => import('@/pages/CompanyManagement'));
const SystemSettings = React.lazy(() => import('@/pages/SystemSettings'));
const AuditLogs = React.lazy(() => import('@/pages/AuditLogs'));
const TemplateManager = React.lazy(() => import('@/pages/TemplateManager'));

const NotFound = React.lazy(() => import('@/pages/NotFound'));

// v5.1 New Pages
const AdvancedAnalytics = React.lazy(() => import('@/pages/AdvancedAnalytics'));
const Integrations = React.lazy(() => import('@/pages/AdminIntegrations'));
const SprintPlanning = React.lazy(() => import('@/pages/SprintPlanning'));
const PMAnalytics = React.lazy(() => import('@/pages/PMAnalytics'));
const AdminSecurity = React.lazy(() => import('@/pages/SecuritySettings'));
const PMProjects = React.lazy(() => import('@/pages/PMProjects'));
const BackupCodes = React.lazy(() => import('@/pages/BackupCodes'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes>
          {/* ── PUBLIC ──────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/admin" element={<Login />} />
          <Route path="/login/pm" element={<Login />} />
          <Route path="/login/client" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify" element={<VerifyEmail />} />

          {/* ── AUTHENTICATED LAYOUT ─────────────────── */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* ── CLIENT/SHARED PAGES ─────────────────── */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            {/* v5.1 New Routes */}
            <Route path="/analytics" element={<AdvancedAnalytics />} />
            <Route path="/backup-codes" element={<BackupCodes />} />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <Integrations />
                </ProtectedRoute>
              }
            />

            {/* ── PM PAGES (project_manager + admin) ──── */}
            <Route
              path="/pm/dashboard"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <PMDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/projects"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <PMProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/approvals"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/team"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/templates"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <TemplateManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/sprints"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <SprintPlanning />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm/analytics"
              element={
                <ProtectedRoute requiredRoles={["project_manager", "admin"]}>
                  <PMAnalytics />
                </ProtectedRoute>
              }
            />

            {/* ── ADMIN PAGES (admin only) ─────────────── */}
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <CompanyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/security"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AdminSecurity />
                </ProtectedRoute>
              }
            />

            {/* Legacy redirects */}
            <Route path="/team" element={<Navigate to="/pm/team" replace />} />
            <Route
              path="/approvals"
              element={<Navigate to="/pm/approvals" replace />}
            />
            <Route
              path="/admin/templates"
              element={<Navigate to="/pm/templates" replace />}
            />
            <Route
              path="/admin/integrations"
              element={<Navigate to="/integrations" replace />}
            />
            <Route
              path="/pm/integrations"
              element={<Navigate to="/integrations" replace />}
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
