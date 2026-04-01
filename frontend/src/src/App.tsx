// App principal — Dashboard Unificado: CRM + Ecosystem
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ToastProvider }  from './contexts/ToastContext';
import { ChatProvider }   from './contexts/ChatContext';
import { Layout }          from './components/Layout';
import { ErrorBoundary }   from './components/ErrorBoundary';

// Ecosystem Pages — lazy loaded para code splitting
const EcoTasks       = React.lazy(() => import('./pages/EcoTasks').then(m => ({ default: m.EcoTasks })));
const KnowledgeBase  = React.lazy(() => import('./pages/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const Memory         = React.lazy(() => import('./pages/Memory').then(m => ({ default: m.Memory })));
const Prompts        = React.lazy(() => import('./pages/Prompts').then(m => ({ default: m.Prompts })));
const Credentials       = React.lazy(() => import('./pages/Credentials').then(m => ({ default: m.Credentials })));
const TelegramSettings  = React.lazy(() => import('./pages/TelegramSettings').then(m => ({ default: m.TelegramSettings })));

// Chat IA
const Chat              = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.ChatPage })));

// AI Features
const AgentPlanner      = React.lazy(() => import('./pages/AgentPlanner').then(m => ({ default: m.AgentPlanner })));
const ScheduledTasks    = React.lazy(() => import('./pages/ScheduledTasks').then(m => ({ default: m.ScheduledTasks })));

// Orbity Pages — Personal modules
const PersonalTasks     = React.lazy(() => import('./pages/PersonalTasks').then(m => ({ default: m.PersonalTasks })));
const Finance           = React.lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const Notes             = React.lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const CalendarPage      = React.lazy(() => import('./pages/Calendar').then(m => ({ default: m.CalendarPage })));

// Spinner reutilizado no Suspense fallback
function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const err = error as Error & { status?: number };
        if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('404')) {
          return false;
        }
        return failureCount < 2;
      },
      gcTime: 10 * 60 * 1000,       // 10 minutos — manter cache inativo
      staleTime: 30 * 1000,          // 30 segundos — considerar dado fresco
      refetchOnWindowFocus: false,   // não refetch ao focar janela
    },
  },
});

function AutoAuth({ children }: { children: ReactNode }) {
  // Auto-login silencioso — dashboard local sem auth obrigatório
  if (!localStorage.getItem('auth_token')) {
    localStorage.setItem('auth_token', 'local-dev-token');
    localStorage.setItem('auth_user', JSON.stringify({ name: 'Rafael', email: 'rafael@riwerlabs.com' }));
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
          <ChatProvider>
          <Routes>
            {/* Login (mantido por compatibilidade, redireciona para home) */}
            <Route path="/login"    element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />

            {/* Rotas protegidas */}
            <Route
              element={
                <AutoAuth>
                  <Layout />
                </AutoAuth>
              }
            >
              {/* Suspense envolve todas as rotas lazy */}
              <Route
                index
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Chat />
                  </Suspense>
                }
              />

              {/* Ecosystem */}
              <Route
                path="tasks"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <EcoTasks />
                  </Suspense>
                }
              />
              <Route
                path="knowledge-base"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <KnowledgeBase />
                  </Suspense>
                }
              />
              <Route
                path="memory"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Memory />
                  </Suspense>
                }
              />
              <Route
                path="prompts"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Prompts />
                  </Suspense>
                }
              />
              <Route
                path="credentials"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Credentials />
                  </Suspense>
                }
              />
              <Route
                path="telegram"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <TelegramSettings />
                  </Suspense>
                }
              />

              {/* Chat IA */}
              <Route
                path="chat"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Chat />
                  </Suspense>
                }
              />

              {/* AI Features */}
              <Route
                path="agent-planner"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <AgentPlanner />
                  </Suspense>
                }
              />
              <Route
                path="scheduled-tasks"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <ScheduledTasks />
                  </Suspense>
                }
              />

              {/* Orbity — Personal */}
              <Route
                path="personal-tasks"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <PersonalTasks />
                  </Suspense>
                }
              />
              <Route
                path="finance"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Finance />
                  </Suspense>
                }
              />
              <Route
                path="notes"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <Notes />
                  </Suspense>
                }
              />
              <Route
                path="calendar"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <CalendarPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Aliases de rota para compatibilidade */}
            <Route path="eco-tasks" element={<Navigate to="/tasks" replace />} />
            <Route path="smart-reports" element={<Navigate to="/scheduled-tasks" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ChatProvider>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
