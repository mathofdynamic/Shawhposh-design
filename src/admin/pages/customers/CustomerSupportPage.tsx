import React, { useState, useMemo } from 'react';
import {
  Headphones,
  MessageSquare,
  Clock,
  CheckCircle2,
  User,
  ExternalLink,
  AlertTriangle,
  Send,
  Lock,
  Search,
  Filter,
  UserCheck,
  FileText,
  Tag,
  Palette,
  ShoppingBag,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { CustomerSupportTicket } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

const SAVED_RESPONSE_TEMPLATES = [
  {
    id: 'TPL-SHIP-ESTIMATE',
    title: 'استعلام زمان تحویل و کد رهگیری پستی',
    text: 'کاربر گرامی شاه‌پوش؛ سفارش شما با موفقیت در خط چاپ آتلیه پردازش شده و در مرحله بسته‌بندی در جعبه مشکی لوکس است. پس از تحویل به ناوگان، کد رهگیری از طریق پیامک برای شما ارسال خواهد شد.',
  },
  {
    id: 'TPL-CARE-GUIDE',
    title: 'نحوه نگهداری و شستشوی چاپ مستقیم DTG',
    text: 'جهت حفظ حداکثر درخشندگی و ماندگاری چاپ کالیگرافی، توصیه می‌شود لباس را پشت‌ورو کرده و با آب سرد (حداکثر ۳۰ درجه) و شوینده‌های فاقد آنزیم و سفیدکننده شستشو دهید. اتوکشی روی بافت چاپ مستقیم مجاز نیست.',
  },
  {
    id: 'TPL-SIZE-EXCHANGE',
    title: 'راهنمای مرجوعی و اصلاح سایز',
    text: 'درود؛ طبق پروتکل ضمانت تن‌پوش شاه‌پوش، در صورتی که ابعاد هودی/تیشرت با جدول سایز مطابقت ندارد، می‌توانید بسته را در بسته‌بندی اصلی و دست‌نخورده به آدرس کارگاه مرکزی ارسال فرمایید تا سایز اصلاحی ارسال گردد.',
  },
  {
    id: 'TPL-ARTWORK-CONFIRM',
    title: 'تایید رزولوشن و آماده‌سازی پرینتر Brother',
    text: 'طرح ارسالی شما توسط داوران فنی آتلیه بررسی گردید و به دلیل رعایت کادر ایمن چاپ و DPI بالای ۳۰۰، جهت نشست روی زیرلایه پنبه ۳۸۰ گرم تایید شد.',
  },
];

export const CustomerSupportPage: React.FC = () => {
  const {
    state,
    getSupportTickets,
    getSupportTicketById,
    addTicketMessage,
    updateTicketStatus,
    assignTicket,
  } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Active chat state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Fetch ticket list
  const tickets = getSupportTickets({
    status: selectedStatus,
    priority: selectedPriority,
    assignedStaffId: selectedAssignee,
    search: searchQuery,
  });

  const activeTicketDetail = activeTicketId ? getSupportTicketById(activeTicketId) : null;

  // Aggregate metrics
  const metrics = useMemo(() => {
    const all = getSupportTickets();
    const nowMs = Date.now();
    return {
      total: all.length,
      open: all.filter((t) => t.status === 'open').length,
      inProgress: all.filter((t) => t.status === 'in_progress').length,
      resolved: all.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
      slaBreached: all.filter((t) => t.isSlaBreached || t.priority === 'high').length,
    };
  }, [state.customers]);

  const handleSendMessage = () => {
    if (!activeTicketId || !replyText.trim()) return;

    const res = addTicketMessage(
      activeTicketId,
      replyText.trim(),
      'agent',
      'پشتیبان کارگاه شاه‌پوش',
      isInternalNote
    );

    if (res.success) {
      setReplyText('');
      addToast({
        title: isInternalNote ? 'یادداشت داخلی ثبت شد' : 'پاسخ ارسال گردید',
        description: isInternalNote
          ? 'این یادداشت صرفاً برای پرسنل کارگاه قابل رویت است.'
          : 'پیام در پرونده تیکت مشتری ثبت شد.',
        type: 'success',
      });
    }
  };

  const handleStatusChange = (status: CustomerSupportTicket['status']) => {
    if (!activeTicketId) return;
    const res = updateTicketStatus(activeTicketId, status, 'کارشناس پشتیبانی');
    if (res.success) {
      addToast({
        title: 'وضعیت تیکت به‌روزرسانی شد',
        description: `وضعیت به ${status} تغییر یافت.`,
        type: 'info',
      });
    }
  };

  const handleAssignChange = (staffId: string) => {
    if (!activeTicketId) return;
    const staff = state.staff.find((s) => s.id === staffId);
    if (!staff) return;
    const res = assignTicket(activeTicketId, staff.id, staff.fullName, 'سرپرست تیم');
    if (res.success) {
      addToast({
        title: 'تیکت ارجاع شد',
        description: `تیکت به ${staff.fullName} تخصیص یافت.`,
        type: 'info',
      });
    }
  };

  const handleApplyTemplate = (tplText: string) => {
    setReplyText(tplText);
  };

  const getPriorityBadge = (priority: CustomerSupportTicket['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge label="فوری (SLA ۲ ساعته)" variant="critical" size="sm" />;
      case 'normal':
        return <Badge label="عادی" variant="brass" size="sm" />;
      case 'low':
      default:
        return <Badge label="کم‌اولویت" variant="neutral" size="sm" />;
    }
  };

  const getStatusBadge = (status: CustomerSupportTicket['status']) => {
    switch (status) {
      case 'open':
        return <Badge label="جدید / باز" variant="critical" size="sm" />;
      case 'in_progress':
        return <Badge label="در حال پاسخگویی" variant="warning" size="sm" />;
      case 'resolved':
        return <Badge label="حل شده ✓" variant="success" size="sm" />;
      case 'closed':
      default:
        return <Badge label="بسته شده" variant="neutral" size="sm" />;
    }
  };

  const columns: ColumnDef<CustomerSupportTicket & { customerName: string; customerId: string }>[] = [
    {
      key: 'id',
      header: 'کد تیکت',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>
      ),
    },
    {
      key: 'subject',
      header: 'موضوع و آخرین پیام',
      render: (row) => (
        <div className="space-y-0.5 max-w-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white block">{row.subject}</span>
            {row.priority === 'high' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                <AlertTriangle size={10} />
                <span>مهلت SLA</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-stone-400 line-clamp-1">{row.lastMessage}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'خریدار / ثبت‌کننده',
      render: (row) => (
        <a
          href={`#/admin/customers/profiles/${row.customerId}`}
          className="text-xs text-white hover:text-[#eed29d] hover:underline block"
        >
          {row.customerName}
        </a>
      ),
    },
    {
      key: 'linkedEntity',
      header: 'سفارش / طرح متناظر',
      render: (row) => (
        <div className="space-y-1">
          {row.linkedOrderId && (
            <a
              href={`#/admin/sales/orders/${row.linkedOrderId}`}
              className="font-mono text-[11px] text-[#eed29d] hover:underline flex items-center gap-1"
            >
              <ShoppingBag size={12} />
              <span>{row.linkedOrderId}</span>
            </a>
          )}
          {row.linkedDesignId && (
            <a
              href={`#/admin/custom-studio/designs/${row.linkedDesignId}`}
              className="text-[10px] text-purple-300 hover:underline flex items-center gap-1"
            >
              <Palette size={12} />
              <span>طرح آتلیه</span>
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'اولویت',
      render: (row) => getPriorityBadge(row.priority),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'میز گفتگو',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTicketId(row.id)}
          className="text-xs gap-1.5 text-[#eed29d] border-[#eed29d]/30 hover:bg-[#eed29d]/10"
        >
          <MessageSquare size={14} />
          <span>پاسخگویی</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="میز کارتابل پشتیبانی و تیکت‌ها"
        description="ساماندهی استعلام‌های زمان تحویل، هماهنگی اصلاح طرح‌های آتلیه، کنترل مهلت‌های پاسخگویی (SLA) و تاریخچه مکاتبات با خریداران."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کل تیکت‌ها</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(metrics.total)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">سراسر سیستم</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تیکت‌های جدید (باز)</span>
          <div className="text-xl font-black text-rose-400 mt-1 font-fanum">
            {toFaDigits(metrics.open)}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">در انتظار پاسخ اولیه</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">درحال بررسی و پیگیری</span>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(metrics.inProgress)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">مکاتبه فعال با خریدار</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">هشدار فرجه پاسخ (SLA)</span>
          <div className="text-xl font-black text-amber-300 mt-1 font-fanum">
            {toFaDigits(metrics.slaBreached)}
          </div>
          <span className="text-[10px] text-amber-300/80 mt-1 block">اولویت فوری</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">حل و فصل شده</span>
          <div className="text-xl font-black text-emerald-400 mt-1 font-fanum">
            {toFaDigits(metrics.resolved)}
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">رضایت خریدار ثبت شد</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs bg-black/40 p-1 rounded-xl border border-white/10">
            <span className="text-stone-400 px-2">وضعیت:</span>
            {[
              { id: 'all', label: 'همه' },
              { id: 'open', label: 'جدید' },
              { id: 'in_progress', label: 'درحال پاسخ' },
              { id: 'resolved', label: 'حل‌شده' },
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
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="high">فوری (SLA بالا)</option>
            <option value="normal">عادی</option>
            <option value="low">کم‌اولویت</option>
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
          >
            <option value="all">همه کارشناسان</option>
            {state.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.role})
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search size={14} className="absolute right-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی موضوع، سفارش یا نام خریدار..."
            className="pr-9 pl-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs w-64 focus:outline-none focus:border-[#eed29d]"
          />
        </div>
      </div>

      {/* Main Table */}
      <Table
        data={tickets}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="تیکتی مطابق با فیلترها یافت نشد."
        onRowClick={(row) => setActiveTicketId(row.id)}
      />

      {/* Active Conversation Drawer / Modal */}
      {activeTicketDetail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#eed29d]">
                    {activeTicketDetail.ticket.id}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {activeTicketDetail.ticket.subject}
                  </h3>
                  {getStatusBadge(activeTicketDetail.ticket.status)}
                  {getPriorityBadge(activeTicketDetail.ticket.priority)}
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span>
                    خریدار:{' '}
                    <strong className="text-white">{activeTicketDetail.customer.fullName}</strong>
                  </span>
                  {activeTicketDetail.ticket.linkedOrderId && (
                    <a
                      href={`#/admin/sales/orders/${activeTicketDetail.ticket.linkedOrderId}`}
                      className="text-[#eed29d] hover:underline font-mono inline-flex items-center gap-1"
                    >
                      <span>سفارش: {activeTicketDetail.ticket.linkedOrderId}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {activeTicketDetail.ticket.linkedDesignId && (
                    <a
                      href={`#/admin/custom-studio/designs/${activeTicketDetail.ticket.linkedDesignId}`}
                      className="text-purple-300 hover:underline inline-flex items-center gap-1"
                    >
                      <span>طرح آتلیه: {activeTicketDetail.ticket.linkedDesignId}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Assignment selector */}
              <div className="flex items-center gap-2">
                <select
                  value={activeTicketDetail.ticket.assignedStaffId || ''}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="px-2.5 py-1 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
                >
                  <option value="">ارجاع نشده</option>
                  {state.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTicketId(null)}
                  className="text-stone-400 hover:text-white"
                >
                  بستن
                </Button>
              </div>
            </div>

            {/* Conversation Timeline Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-black/20 rounded-2xl border border-white/5 max-h-[380px]">
              {/* Default first customer message if timeline empty */}
              {(!activeTicketDetail.ticket.conversationTimeline ||
                activeTicketDetail.ticket.conversationTimeline.length === 0) && (
                <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      {activeTicketDetail.customer.fullName} (خریدار)
                    </span>
                    <span className="text-[10px] text-stone-500 font-fanum">
                      {new Date(activeTicketDetail.ticket.createdAt).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {activeTicketDetail.ticket.lastMessage || 'درخواست پشتیبانی ثبت شد.'}
                  </p>
                </div>
              )}

              {(activeTicketDetail.ticket.conversationTimeline || []).map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`p-3 rounded-2xl text-xs space-y-1 border ${
                    msg.isInternalNote
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : msg.sender === 'agent'
                      ? 'bg-[#eed29d]/10 border-[#eed29d]/20 text-stone-200 ml-8'
                      : 'bg-stone-900/80 border-white/10 text-stone-200 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {msg.senderName || (msg.sender === 'agent' ? 'پشتیبان شاه‌پوش' : 'خریدار')}
                      </span>
                      {msg.isInternalNote && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                          <Lock size={10} />
                          <span>یادداشت داخلی (محرمانه پرسنل)</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-fanum">
                      {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="leading-relaxed text-xs">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Quick response templates chip bar */}
            <div className="space-y-1">
              <span className="text-[11px] text-stone-400 block">قالب‌های پاسخ آماده کارگاه:</span>
              <div className="flex flex-wrap gap-1.5">
                {SAVED_RESPONSE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.text)}
                    className="text-[11px] px-2.5 py-1 bg-stone-900 border border-white/10 rounded-lg text-stone-300 hover:text-white hover:border-[#eed29d] transition-all"
                  >
                    + {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Compose Reply Box */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      !isInternalNote
                        ? 'bg-[#eed29d] text-black font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    پاسخ به خریدار
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      isInternalNote
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Lock size={12} />
                    <span>یادداشت داخلی</span>
                  </button>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('resolved')}
                    className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    حل و فصل شد ✓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('closed')}
                    className="text-xs text-stone-400"
                  >
                    بستن تیکت
                  </Button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'یادداشت داخلی محرمانه برای همکاران کارگاه (غیرقابل مشاهده توسط خریدار)...'
                      : 'متن پاسخ رسمی برای خریدار محترم شاه‌پوش...'
                  }
                  className={`w-full p-3 bg-black/40 border rounded-2xl text-white text-xs focus:outline-none ${
                    isInternalNote
                      ? 'border-amber-500/40 focus:border-amber-400'
                      : 'border-white/10 focus:border-[#eed29d]'
                  }`}
                />
                <Button
                  variant="brass"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!replyText.trim()}
                  className={`absolute left-2.5 bottom-2.5 gap-1.5 text-xs ${
                    isInternalNote ? 'bg-amber-500 text-black hover:bg-amber-400' : ''
                  }`}
                >
                  <Send size={14} />
                  <span>{isInternalNote ? 'ثبت یادداشت' : 'ارسال پاسخ'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
