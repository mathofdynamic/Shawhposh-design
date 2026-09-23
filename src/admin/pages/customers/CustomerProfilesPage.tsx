import React, { useState } from 'react';
import { UserCheck, ShoppingBag, MapPin, Phone, Calendar, Heart } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, MoneyDisplay, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits, maskPhoneNumber } from '../../utils/formatters';

export const CustomerProfilesPage: React.FC = () => {
  const { state } = useAdminRepository();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(state.customers[0]?.id || '');

  const activeCustomer = state.customers.find((c) => c.id === selectedCustomerId) || state.customers[0];
  const customerOrders = state.orders.filter((o) => o.customerId === activeCustomer?.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="پرونده تفصیلی و تاریخچه سفارش‌های کاربر"
        description="مشاهده پرونده وفاداری مشتری، میانگین ارزش سبد، آدرس‌های ثبت‌شده و فاکتورهای صادره."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selector List */}
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-stone-400 block mb-2">انتخاب مشتری جهت بررسی پرونده:</span>
          <div className="max-h-[500px] overflow-y-auto space-y-1">
            {state.customers.map((c) => {
              const isSelected = c.id === activeCustomer?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#ba8d3d]/20 border border-[#ba8d3d]/40 text-white'
                      : 'hover:bg-white/5 text-stone-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{c.fullName}</div>
                    <div className="text-[10px] text-stone-400 font-fanum">{c.city} · {c.id}</div>
                  </div>
                  <Badge
                    label={c.tag === 'vip' ? 'طلایی (VIP)' : c.tag === 'wholesale' ? 'عمده' : c.tag === 'new' ? 'جدید' : 'عادی'}
                    variant={c.tag === 'vip' ? 'warning' : 'default'}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Profile Dossier */}
        <div className="lg:col-span-2 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
          {activeCustomer && (
            <>
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ba8d3d] to-[#604313] flex items-center justify-center text-stone-950 font-black text-lg">
                    {activeCustomer.fullName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{activeCustomer.fullName}</h2>
                      <span className="text-[10px] font-mono text-stone-400 bg-white/5 px-2 py-0.5 rounded">
                        {activeCustomer.id}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1 flex items-center gap-3 font-fanum">
                      <span>شهر: {activeCustomer.city}</span>
                      <span>·</span>
                      <span dir="ltr">{maskPhoneNumber(activeCustomer.phone)}</span>
                    </div>
                  </div>
                </div>

                <Badge
                  label={
                    activeCustomer.tag === 'vip'
                      ? 'عضویت طلایی VIP'
                      : activeCustomer.tag === 'wholesale'
                      ? 'خریدار عمده'
                      : activeCustomer.tag === 'new'
                      ? 'مشتری جدید'
                      : 'مشتری عادی'
                  }
                  variant={activeCustomer.tag === 'vip' ? 'warning' : 'default'}
                  size="sm"
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <span className="text-[10px] text-stone-400 block">تعداد سفارشات</span>
                  <strong className="text-white text-sm mt-1 block font-fanum">
                    {toFaDigits(customerOrders.length)} فاکتور
                  </strong>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <span className="text-[10px] text-stone-400 block">مجموع پرداخت‌ها</span>
                  <div className="mt-1">
                    <MoneyDisplay amount={activeCustomer.totalSpentTomans} size="sm" />
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl text-center">
                  <span className="text-[10px] text-stone-400 block">تاریخ عضویت</span>
                  <strong className="text-stone-200 text-xs mt-1 block font-fanum">
                    {new Date(activeCustomer.createdAt).toLocaleDateString('fa-IR')}
                  </strong>
                </div>
              </div>

              {/* Orders History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white">تاریخچه فاکتورهای این مشتری:</h3>
                {customerOrders.length === 0 ? (
                  <p className="text-xs text-stone-400">سفارشی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-[#eed29d] font-bold block">{o.id}</span>
                          <span className="text-[10px] text-stone-400 font-fanum">
                            {new Date(o.createdAt).toLocaleDateString('fa-IR')} · {toFaDigits(o.items.length)} ردیف کالا
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MoneyDisplay amount={o.totalTomans} size="sm" />
                          <Badge
                            label={o.status === 'in_production' ? 'خط چاپ' : o.status === 'shipped' ? 'ارسال شده' : 'تاییدشده'}
                            variant={o.status === 'shipped' ? 'success' : 'warning'}
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
