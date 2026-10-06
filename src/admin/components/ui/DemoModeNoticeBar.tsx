/**
 * Shahpoosh Global Demo Notice Bar & Invariant Inspector
 * Enforces visible "داده‌های نمایشی" banner, demo clock disclosure, reset trigger, and live invariant audits.
 */

import React, { useState } from 'react';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { InvariantSuiteReport } from '../../domain/invariants';
import { Button } from './Button';
import { Badge } from './Badge';
import { Dialog, ConfirmDialog } from './Dialog';
import { useToast } from './Toast';

export const DemoModeNoticeBar: React.FC = () => {
  const { resetData, runInvariantChecks } = useAdminRepository();
  const { addToast } = useToast();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isInvariantModalOpen, setIsInvariantModalOpen] = useState(false);
  const [invariantReport, setInvariantReport] = useState<InvariantSuiteReport | null>(null);

  const handleReset = () => {
    resetData();
    setIsResetConfirmOpen(false);
    addToast({
      title: 'داده‌های نمایشی مرورگر بازنشانی شد',
      description: 'این عملیات فقط فیکسچرهای نمایشی مرورگر را تغییر می‌دهد و اطلاعات واقعی سرور را لمس نمی‌کند.',
      type: 'success',
    });
  };

  const handleOpenInvariants = () => {
    const report = runInvariantChecks();
    setInvariantReport(report);
    setIsInvariantModalOpen(true);
  };

  return (
    <>
      {/* Top Banner */}
      <div className="bg-[#181614] border-b border-[#ba8d3d]/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Badge tone="warning" dot>
            ماژول‌های نمایشی
          </Badge>
          <span className="text-stone-300 font-medium">
            حساب، سبد، سفارش، کاتالوگ و موجودی به سرور متصل‌اند
          </span>
          <span className="hidden md:inline-block text-stone-500">|</span>
          <span className="hidden md:inline-flex items-center gap-1.5 text-stone-400">
            <span>مبدا تقویم آزمایشی:</span>
            <span className="font-mono text-[#ba8d3d] dir-ltr text-[11px] bg-black/40 px-1.5 py-0.5 rounded border border-[#ba8d3d]/20">
              2026-09-23 12:00 UTC (۲ مهر ۱۴۰۵)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-stone-700 hover:border-[#ba8d3d]/60 text-stone-300 hover:text-white"
            onClick={handleOpenInvariants}
          >
            <svg className="w-3.5 h-3.5 ml-1 text-[#ba8d3d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            بررسی ناوردایی‌ها و تطبیق داده
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-stone-400 hover:text-amber-400 hover:bg-stone-800"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            بازنشانی فیکسچرهای مرورگر
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="بازنشانی فیکسچرهای نمایشی مرورگر"
        description="فقط فیکسچرها و تغییرات نمایشی همین مرورگر بازنشانی می‌شوند. حساب‌های واقعی، سفارش‌ها، محصولات، تنوع‌ها و موجودی روی سرور تغییر نمی‌کنند."
        confirmLabel="بله، بازنشانی شود"
        cancelLabel="انصراف"
        isDestructive
      />

      {/* Invariants Audit Modal */}
      {invariantReport && (
        <Dialog
          isOpen={isInvariantModalOpen}
          onClose={() => setIsInvariantModalOpen(false)}
          title="گزارش تطبیق ناوردایی‌های پایگاه داده (Data Invariants Audit)"
          size="lg"
          footer={
            <Button variant="brass" size="sm" onClick={() => setIsInvariantModalOpen(false)}>
              بستن پنجره گزارش
            </Button>
          }
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between p-3 rounded bg-stone-900 border border-stone-800">
              <div>
                <div className="text-xs text-stone-400">وضعیت کل سیستم:</div>
                <div className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                  {invariantReport.allPassed ? (
                    <span className="text-emerald-400">تمامی ناوردایی‌ها با موفقیت تایید شدند</span>
                  ) : (
                    <span className="text-rose-400">برخی ناوردایی‌ها دارای مغایرت هستند</span>
                  )}
                </div>
              </div>
              <div className="text-left font-mono text-xs">
                <span className="text-emerald-400">{invariantReport.passedChecks} پاس شده</span>
                <span className="text-stone-500 mx-1.5">/</span>
                <span className="text-stone-400">{invariantReport.totalChecks} آزمون کل</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {invariantReport.checks.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded bg-stone-950/70 border border-stone-800/80 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200">{c.name}</span>
                    <Badge tone={c.status === 'passed' ? 'success' : 'danger'}>
                      {c.status === 'passed' ? 'انطباق ۱۰۰٪' : 'مغایرت'}
                    </Badge>
                  </div>
                  <p className="text-stone-400 leading-relaxed">{c.message}</p>
                  {c.details && (
                    <pre className="dir-ltr text-[11px] font-mono text-stone-400 bg-stone-900/90 p-2 rounded border border-stone-800/50 overflow-x-auto">
                      {JSON.stringify(c.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

