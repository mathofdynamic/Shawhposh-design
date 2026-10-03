import React from 'react';
import { useStaff } from '../../features/StaffAuth';
import type { StaffRole } from '../../domain/types';
export interface AccountRoleMenuProps { currentRole:StaffRole; onRoleChange:(role:StaffRole)=>void }
export const AccountRoleMenu:React.FC<AccountRoleMenuProps> = () => {
  const session=useStaff();
  return session ? <button onClick={()=>void session.logout()} title={session.staff.name} className="text-xs text-stone-200 p-2 rounded-xl bg-white/5 max-w-[160px] truncate"><span className="hidden sm:inline">{session.staff.name} · </span>خروج</button> : null;
};
