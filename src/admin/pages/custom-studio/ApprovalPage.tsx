import React, { useState } from 'react';
import { FileCheck, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Download, Eye } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Dialog, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { CustomDesign } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const ApprovalPage: React.FC = () => {
  const { state, approveCustomDesign, rejectCustomDesign } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedDesign, setSelectedDesign] = useState<CustomDesign | null>(null);
  const [rejectReason, setRejectReason] = useState('رزولوشن تصویر کمتر از استاندارد ۳۰۰ دی‌پی‌آی بوده و خطر پیکسل‌شدگی در چاپ مستقیم دارد.');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);

  const pendingDesigns = state.customDesigns.filter((d) => d.status === 'under_review');
  const otherDesigns = state.customDesigns.filter((d) => d.status !== 'under_review');

  const handleApprove = (designId: string) => {
    const res = approveCustomDesign(designId, 'STF-02');
    if (res.success) {
      addToast({
        title: 'طرح تایید شد',
        description: `آرت‌ورک ${designId} با موفقیت به صف پرینتر مستقیم صنعتی DTG منتقل گردید.`,
        type: 'success',
      });
      if (selectedDesign?.id === designId) {
        setSelectedDesign(null);
      }
    }
  };

  const handleRejectConfirm = () => {
    if (!targetRejectId) return;
    const res = rejectCustomDesign(targetRejectId, 'STF-02', rejectReason);
    if (res.success) {
      addToast({
        title: 'طرح رد شد',
        description: `علت رد به پرونده سفارش اضافه شد و در لاگ کارگاه ثبت گردید.`,
        type: 'error',
      });
      setIsRejectOpen(false);
      setTargetRejectId(null);
      if (selectedDesign?.id === targetRejectId) {
        setSelectedDesign(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="داوری فنی آتلیه و اعتبارسنجی رزولوشن"
        description="میز کارشناس گرافیک: بررسی تراکم رنگ، پس‌زمینه ترانسپارنت، رزولوشن مناسب چاپ پارچه و تایید ارسال به دستگاه."
      />

      {/* Pending Reviews Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            طرح‌های نیازمند بررسی فوری ({toFaDigits(pendingDesigns.length)} طرح)
          </h2>
          <span className="text-xs text-stone-400">استاندارد کارگاه: حداقل ۳۰۰ دی‌پی‌آی با فرمت برداری</span>
        </div>

        {pendingDesigns.length === 0 ? (
          <div className="p-8 bg-[#131211] border border-white/10 rounded-2xl text-center text-stone-400 text-xs">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-white font-bold">صف داوری آتلیه خالی است!</p>
            <p className="mt-1">تمامی طرح‌های دریافتی بررسی و به خط چاپ منتقل شده‌اند.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingDesigns.map((d) => (
              <div
                key={d.id}
                className="bg-[#131211] border border-white/10 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.previewUrl}
                        alt={d.title}
                        className="w-16 h-16 object-contain bg-black rounded-xl border border-white/10 p-1"
                      />
                      <div>
                        <div className="text-sm font-bold text-white">{d.title}</div>
                        <div className="text-[11px] text-[#eed29d] font-mono mt-0.5">
                          {d.id} · سفارش: {d.orderId}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          موقعیت: {d.printZone === 'front_chest' ? 'سینه مرکزی' : d.printZone === 'back_full' ? 'پشت کامل' : 'آستین/یقه'}
                        </div>
                      </div>
                    </div>
                    <Badge label="در انتظار داوری" variant="warning" size="sm" />
                  </div>

                  {/* Technical inspection details */}
                  <div className="bg-stone-900/60 p-3 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-xs mb-4">
                    <div>
                      <span className="text-stone-400 block text-[10px]">رزولوشن محاسبه‌شده:</span>
                      <strong className="text-emerald-400 font-mono text-xs font-fanum">
                        {toFaDigits(d.resolutionDpi)} DPI
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">ابعاد چاپ:</span>
                      <span className="text-stone-200 font-mono text-xs font-fanum" dir="ltr">
                        {d.dimensionsMm}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">پالت رنگی:</span>
                      <span className="text-stone-200 text-xs">{d.colorProfile} نساجی</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">پس‌زمینه ترانسپارنت:</span>
                      <span className="text-emerald-400 text-xs">تایید شده ({d.format})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <Button
                    variant="brass"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(d.id)}
                  >
                    <CheckCircle2 size={14} className="ml-1" />
                    تایید و ارسال به دستگاه DTG
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setTargetRejectId(d.id);
                      setIsRejectOpen(true);
                    }}
                  >
                    <XCircle size={14} className="ml-1" />
                    رد طرح
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History of approved/rejected designs */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">آرشیو اخیر داوری‌های آتلیه</h2>
        <div className="divide-y divide-white/5">
          {otherDesigns.slice(0, 5).map((d) => (
            <div key={d.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={d.previewUrl}
                  alt={d.title}
                  className="w-10 h-10 object-contain bg-black rounded-lg border border-white/10"
                />
                <div>
                  <div className="text-xs font-bold text-white">{d.title}</div>
                  <div className="text-[10px] text-stone-400 font-mono">{d.id}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  label={d.status === 'approved' ? 'تایید شده (در خط چاپ)' : 'رد شده توسط کارشناس'}
                  variant={d.status === 'approved' ? 'success' : 'critical'}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      <Dialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="رد فنی طرح و اطلاع به خریدار"
        description="لطفاً علت رد طرح را مشخص کنید تا در پرونده ثبت و به واحد پشتیبانی ارجاع شود."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectOpen(false)}>
              انصراف
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm}>
              ثبت رد قطعی
            </Button>
          </div>
        }
      >
        <FormField label="علت کارشناسی عدم تایید" required>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثلاً: لبه‌های فایل دارای نویز و تاری می‌باشد..."
          />
        </FormField>
      </Dialog>
    </div>
  );
};
