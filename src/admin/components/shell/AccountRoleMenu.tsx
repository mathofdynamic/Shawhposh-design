import React from 'react';
import { useStaff } from '../../features/StaffAuth';

export const AccountRoleMenu: React.FC = () => {
  const session = useStaff();
  return session ? <button onClick={() => void session.logout()} title={session.staff.name} className="max-w-[160px] truncate rounded-xl bg-white/5 p-2 text-xs text-stone-200"><span className="hidden sm:inline">{session.staff.name} · </span>خروج</button> : null;
};
