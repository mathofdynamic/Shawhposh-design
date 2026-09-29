import React, { useState, useMemo } from 'react';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Reply,
  AlertCircle,
  Search,
  Filter,
  Check,
  Send,
  History,
  ShoppingBag,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { CustomerProductReview } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const CustomerReviewsPage: React.FC = () => {
  const { state, getCustomerReviews, moderateReview, replyToReview } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active reply modal
  const [replyModalReview, setReplyModalReview] = useState<
    (CustomerProductReview & { customerName: string; customerId: string }) | null
  >(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Active reject modal
  const [rejectModalReview, setRejectModalReview] = useState<
    (CustomerProductReview & { customerName: string; customerId: string }) | null
  >(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Fetch reviews with verified purchase detection
  const reviews = getCustomerReviews({
    status: selectedStatus,
    search: searchQuery,
  });

  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (selectedRating !== 'all') {
      const rNum = parseInt(selectedRating, 10);
      list = list.filter((r) => r.rating === rNum);
    }
    return list;
  }, [reviews, selectedRating]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const all = getCustomerReviews();
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
      verifiedBuyers: all.filter((r) => r.hasVerifiedPurchase).length,
    };
  }, [state.customers, state.orders]);

  const handleApprove = (reviewId: string) => {
    const res = moderateReview(reviewId, 'approved', 'داور محتوای شاه‌پوش');
    if (res.success) {
      addToast({
        title: 'دیدگاه تایید شد',
        description: 'این نظر برای نمایش در ویترین فروشگاه فعال گردید.',
        type: 'success',
      });
    }
  };

  const handleConfirmReject = () => {
    if (!rejectModalReview) return;
    const res = moderateReview(
      rejectModalReview.id,
      'rejected',
      'داور محتوای شاه‌پوش',
      rejectReasonInput || 'عدم رعایت مقررات ثبت بازخورد'
    );
    if (res.success) {
      setRejectModalReview(null);
      setRejectReasonInput('');
      addToast({
        title: 'دیدگاه رد شد',
        description: 'این نظر از ویترین عمومی حذف و رد شد.',
        type: 'critical',
      });
    }
  };

  const handleConfirmReply = () => {
    if (!replyModalReview || !replyInputText.trim()) return;
    const res = replyToReview(
      replyModalReview.id,
      replyInputText.trim(),
      'پشتیبانی رسمی شاه‌پوش'
    );
    if (res.success) {
      setReplyModalReview(null);
      setReplyInputText('');
      addToast({
        title: 'پاسخ رسمی ثبت شد',
        description: 'پاسخ فروشگاه در کنار دیدگاه خریدار درج گردید.',
        type: 'success',
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-600'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="داوری نظرات، امتیازها و بازخوردها"
        description="بررسی دیدگاه‌های خریداران، اعتبارسنجی خرید قطعی، تایید بازخوردها برای نمایش در ویترین فروشگاه و ثبت پاسخ رسمی پشتیبانی."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کل نظرات ثبت‌شده</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(metrics.total)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">در تمام صفحات محصولات</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">در انتظار داوری</span>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(metrics.pending)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">نیاز به بازبینی داور</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تاییدشده در ویترین</span>
          <div className="text-xl font-black text-emerald-400 mt-1 font-fanum">
            {toFaDigits(metrics.approved)}
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">نمایش عمومی</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">نظرات رد شده</span>
          <div className="text-xl font-black text-rose-400 mt-1 font-fanum">
            {toFaDigits(metrics.rejected)}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">مغایر با استانداردها</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">خریداران قطعی (Verified)</span>
          <div className="text-xl font-black text-[#eed29d] mt-1 font-fanum">
            {toFaDigits(metrics.verifiedBuyers)}
          </div>
          <span className="text-[10px] text-[#eed29d]/80 mt-1 block">سفارش تاییدشده دارند</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-black/40 p-1 rounded-xl border border-white/10">
            <span className="text-stone-400 px-2">وضعیت:</span>
            {[
              { id: 'all', label: 'همه' },
              { id: 'pending', label: 'در انتظار' },
              { id: 'approved', label: 'تاییدشده' },
              { id: 'rejected', label: 'ردشده' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatus === st.id
                    ? 'bg-[#eed29d] text-black font-bold shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
          >
            <option value="all">همه امتیازها</option>
            <option value="5">۵ ستاره (عالی)</option>
            <option value="4">۴ ستاره (خیلی خوب)</option>
            <option value="3">۳ ستاره (متوسط)</option>
            <option value="2">۲ ستاره (ضعیف)</option>
            <option value="1">۱ ستاره (ناراضی)</option>
          </select>
        </div>

        <div className="relative">
          <Search size={14} className="absolute right-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی متن نظر، نام کالا یا خریدار..."
            className="pr-9 pl-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs w-64 focus:outline-none focus:border-[#eed29d]"
          />
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400 bg-[#131211] border border-white/10 rounded-2xl">
            هیچ دیدگاهی مطابق با فیلترهای انتخابی یافت نشد.
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-[#131211] border border-white/10 rounded-2xl space-y-4 transition-all hover:border-white/20"
            >
              {/* Top row: Customer, verified badge, product, rating, status */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`#/admin/customers/profiles/${rev.customerId}`}
                      className="text-xs font-bold text-white hover:text-[#eed29d] hover:underline"
                    >
                      {rev.customerName}
                    </a>

                    {/* INVARIANT: Show purchased status ONLY when a verified corresponding order exists */}
                    {rev.hasVerifiedPurchase ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                        <ShieldCheck size={12} />
                        <span>خریدار تاییدشده این کالا ✓</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 bg-stone-800/60 px-2 py-0.5 rounded-md">
                        <span>فاقد سفارش تاییدشده ثبت‌شده</span>
                      </span>
                    )}

                    {rev.verifiedOrderId && (
                      <a
                        href={`#/admin/sales/orders/${rev.verifiedOrderId}`}
                        className="font-mono text-[10px] text-stone-400 hover:text-[#eed29d] hover:underline inline-flex items-center gap-0.5"
                      >
                        <ShoppingBag size={10} />
                        <span>{rev.verifiedOrderId}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span>محصول: <strong className="text-stone-300">{rev.productName}</strong></span>
                    <span>•</span>
                    <span className="font-fanum">
                      {new Date(rev.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {renderStars(rev.rating)}
                  {rev.status === 'approved' ? (
                    <Badge label="تاییدشده در ویترین" variant="success" size="sm" />
                  ) : rev.status === 'rejected' ? (
                    <Badge label="رد شده" variant="critical" size="sm" />
                  ) : (
                    <Badge label="در انتظار داوری" variant="warning" size="sm" />
                  )}
                </div>
              </div>

              {/* Review Comment Text */}
              <p className="text-xs text-stone-200 leading-relaxed font-sans">{rev.comment}</p>

              {/* Admin Reply Box if present */}
              {rev.adminReply && (
                <div className="p-3 bg-[#eed29d]/5 border border-[#eed29d]/20 rounded-xl space-y-1 text-xs text-stone-300 mr-4">
                  <div className="flex items-center justify-between text-[#eed29d] font-bold text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Reply size={12} />
                      <span>پاسخ رسمی پشتیبانی شاه‌پوش:</span>
                    </div>
                    {rev.adminRepliedAt && (
                      <span className="text-[10px] text-stone-500 font-fanum">
                        {new Date(rev.adminRepliedAt).toLocaleDateString('fa-IR')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-stone-200">{rev.adminReply}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                {/* Audit trail summary */}
                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <History size={12} />
                  <span>
                    {rev.auditTrail && rev.auditTrail.length > 0
                      ? `آخرین رخداد: ${rev.auditTrail[0].action} توسط ${rev.auditTrail[0].actorName}`
                      : 'سوابق داوری ثبت در پایگاه داده'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyModalReview(rev);
                      setReplyInputText(rev.adminReply || '');
                    }}
                    className="text-xs gap-1.5 text-stone-300 hover:text-white"
                  >
                    <Reply size={14} />
                    <span>{rev.adminReply ? 'ویرایش پاسخ' : 'پاسخ به نظر'}</span>
                  </Button>

                  {rev.status !== 'approved' && (
                    <Button
                      variant="brass"
                      size="sm"
                      onClick={() => handleApprove(rev.id)}
                      className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Check size={14} />
                      <span>تایید و انتشار</span>
                    </Button>
                  )}

                  {rev.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectModalReview(rev)}
                      className="text-xs gap-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      <XCircle size={14} />
                      <span>رد دیدگاه</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      {replyModalReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Reply size={18} className="text-[#eed29d]" />
              <span>پاسخ رسمی به نظر {replyModalReview.customerName}</span>
            </h3>

            <div className="p-3 bg-stone-900/60 rounded-xl text-xs text-stone-400 border border-white/5 space-y-1">
              <span className="text-[11px] text-stone-500 block">دیدگاه خریدار:</span>
              <p className="text-stone-300 italic">«{replyModalReview.comment}»</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-300">متن پاسخ پشتیبانی:</label>
              <textarea
                rows={3}
                value={replyInputText}
                onChange={(e) => setReplyInputText(e.target.value)}
                placeholder="درود؛ از حسن توجه و ثبت دیدگاه شما متشکریم..."
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setReplyModalReview(null)}>
                انصراف
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={handleConfirmReply}
                disabled={!replyInputText.trim()}
              >
                ثبت و نمایش پاسخ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-rose-400">
              <XCircle size={18} />
              <span>رد نظر کاربر</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs text-stone-300">علت رد دیدگاه:</label>
              <input
                type="text"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="مثال: محتوای تبلیغاتی، کلمات نامناسب یا اطلاعات غیرواقعی..."
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setRejectModalReview(null)}>
                انصراف
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={handleConfirmReject}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                رد دیدگاه
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
