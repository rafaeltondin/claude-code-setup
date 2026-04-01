// Layout principal: sidebar + header + conteudo — Premium Theme v5
import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './Toast';


export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-full min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div
        className="flex flex-col min-h-screen content-area"
        style={{ marginLeft: 'var(--sidebar-w)', width: 'calc(100% - var(--sidebar-w))', minWidth: 0 }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 md:hidden"
          style={{
            height: 'var(--header-h)',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            borderBottom: '1px solid var(--surface-border)',
          }}
        >
          {/* Hamburger — mobile */}
          <button
            className="md:hidden p-2 rounded-sm transition-colors mr-2 shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onClick={openSidebar}
            aria-label="Abrir menu lateral"
            aria-expanded={sidebarOpen}
          >
            <Menu size={22} />
          </button>

          <div className="relative w-full max-w-[280px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 text-[13px] focus:outline-none transition-colors"
              style={{
                height: '36px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
              }}
              aria-label="Busca global"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-md transition-colors relative"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Notificações"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col" id="main-content" style={{ padding: 'var(--space-xl) var(--space-2xl)' }}>
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
