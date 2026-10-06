import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AdminNavGroupDef, AdminRouteDef, RouterState } from './types';
import { ADMIN_GROUPS, ALL_ADMIN_ROUTES, DEFAULT_ADMIN_ROUTE, findRouteByPath, matchRoute } from './routes';

const AdminRouterContext = createContext<RouterState | null>(null);

function resolveInitialPath(): string {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_ROUTE.path;

  const pathname = window.location.pathname;
  const hash = window.location.hash;

  // Check pathname first
  if (pathname.startsWith('/admin') || pathname.startsWith('/orders')) {
    const clean = pathname.replace(/\/+$/, '');
    if (clean === '/admin' || clean === '') {
      return DEFAULT_ADMIN_ROUTE.path;
    }
    const matched = findRouteByPath(clean);
    return matched ? clean : DEFAULT_ADMIN_ROUTE.path;
  }

  // Check hash fallback e.g. #/admin/sales/orders or #admin/sales/orders
  if (hash.startsWith('#/admin') || hash.startsWith('#admin') || hash.startsWith('#/orders')) {
    const rawSub = hash.replace(/^#\/?/, '/');
    const matched = findRouteByPath(rawSub);
    return matched ? rawSub : DEFAULT_ADMIN_ROUTE.path;
  }

  return DEFAULT_ADMIN_ROUTE.path;
}

export interface AdminRouterProviderProps {
  children: React.ReactNode;
  onExitToStore?: () => void;
}

export const AdminRouterProvider: React.FC<AdminRouterProviderProps> = ({
  children,
  onExitToStore,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(() => resolveInitialPath());

  const matchResult = useMemo(() => {
    return matchRoute(currentPath);
  }, [currentPath]);

  const activeRoute: AdminRouteDef | null = useMemo(() => {
    return matchResult?.route || DEFAULT_ADMIN_ROUTE;
  }, [matchResult]);

  const params: Record<string, string> = useMemo(() => {
    return matchResult?.params || {};
  }, [matchResult]);

  const activeGroup: AdminNavGroupDef | null = useMemo(() => {
    if (!activeRoute) return ADMIN_GROUPS[0];
    return ADMIN_GROUPS.find((g) => g.id === activeRoute.groupId) || ADMIN_GROUPS[0];
  }, [activeRoute]);

  // Navigate handler with pushState / replaceState
  const navigate = useCallback((toPath: string, replace = false) => {
    let cleanPath = toPath.replace(/\/+$/, '');
    if (cleanPath === '/admin' || cleanPath === '') {
      cleanPath = DEFAULT_ADMIN_ROUTE.path;
    }

    if (replace) {
      window.history.replaceState({ path: cleanPath }, '', cleanPath);
    } else {
      window.history.pushState({ path: cleanPath }, '', cleanPath);
    }

    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

    // Sync hash if running in environments where hash is used
    if (window.location.hash && (window.location.hash.startsWith('#admin') || window.location.hash.startsWith('#/admin'))) {
      window.location.hash = '#' + cleanPath;
    }
  }, []);

  const goBackToStore = useCallback(() => {
    if (onExitToStore) {
      onExitToStore();
    } else {
      window.history.pushState(null, '', '/');
      window.location.hash = '';
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onExitToStore]);

  // Listen to browser Back/Forward (popstate) and hashchange
  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveInitialPath();
      setCurrentPath(resolved);
    };

    const handleHashChange = () => {
      const resolved = resolveInitialPath();
      setCurrentPath(resolved);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Sync initial URL if was just '/admin'
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
      window.history.replaceState({ path: DEFAULT_ADMIN_ROUTE.path }, '', DEFAULT_ADMIN_ROUTE.path);
    }
  }, []);

  return (
    <AdminRouterContext.Provider
      value={{
        currentPath,
        activeGroup,
        activeRoute,
        params,
        navigate,
        goBackToStore,
      }}
    >
      {children}
    </AdminRouterContext.Provider>
  );
};

export const useAdminRouter = (): RouterState => {
  const context = useContext(AdminRouterContext);
  if (!context) {
    throw new Error('useAdminRouter must be used within an AdminRouterProvider');
  }
  return context;
};
