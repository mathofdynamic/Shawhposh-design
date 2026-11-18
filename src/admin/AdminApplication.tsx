import { AdminRouterProvider } from './router';
import { CatalogProvider } from './features/CatalogProvider';
import { StaffAuth } from './features/StaffAuth';
import { AdminLayout } from './AdminLayout';
import { ToastProvider } from './components/ui';

type AdminApplicationProps = {
  onExitToStore: () => void;
};

export default function AdminApplication({ onExitToStore }: AdminApplicationProps) {
  return (
    <ToastProvider>
      <AdminRouterProvider onExitToStore={onExitToStore}>
        <StaffAuth>
          <CatalogProvider>
            <AdminLayout />
          </CatalogProvider>
        </StaffAuth>
      </AdminRouterProvider>
    </ToastProvider>
  );
}
