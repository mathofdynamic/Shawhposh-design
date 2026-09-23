/**
 * Shahpoosh Admin Permission Gate
 * Role-Based Access Control wrapper for UI elements and operations.
 */

import React from 'react';
import { StaffRole } from '../../domain/types';

export interface PermissionGateProps {
  currentRole: StaffRole;
  allowedRoles: StaffRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabledMode?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  currentRole,
  allowedRoles,
  children,
  fallback = null,
  disabledMode = false,
}) => {
  const hasPermission = currentRole === 'super_admin' || allowedRoles.includes(currentRole);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (disabledMode && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: 'شما دسترسی مجاز برای این عملیات را ندارید.',
      style: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
    });
  }

  return <>{fallback}</>;
};

export type { StaffRole };
