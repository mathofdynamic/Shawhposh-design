import React, { useState, useMemo } from 'react';
import {
  Factory,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Package,
  Plus,
  Search,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  FileText,
  Star,
  ExternalLink,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { Supplier } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { useAdminRouter } from '../../router';

export const SuppliersPage: React.FC = () => {
  const { state, createSupplier, updateSupplier, deleteSupplier } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unmaskedPhones, setUnmaskedPhones] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form fields state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('پارچه خام پنبه سوپر');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [minOrderQty, setMinOrderQty] = useState('100');
  const [qualityRating, setQualityRating] = useState('درجه یک (A+)');
  const [suppliedMaterialsInput, setSuppliedMaterialsInput] = useState('');

  // Toggle phone masking
  const togglePhoneMask = (supplierId: string) => {
    setUnmaskedPhones((prev) => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }));
  };

  const maskPhoneNumber = (rawPhone: string) => {
    if (!rawPhone || rawPhone.length < 7) return rawPhone;
    return `${rawPhone.slice(0, 4)}***${rawPhone.slice(-3)}`;
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const list = state.suppliers || [];
    return list.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesPerson = s.contactPerson.toLowerCase().includes(q);
        const matchesCity = s.city.toLowerCase().includes(q);
        const matchesMaterials = s.suppliedMaterials.some((m) => m.toLowerCase().includes(q));
        if (!matchesName && !matchesPerson && !matchesCity && !matchesMaterials) return false;
      }
      return true;
    });
  }, [state.suppliers, categoryFilter, searchQuery]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    (state.suppliers || []).forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [state.suppliers]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setName('');
    setCategory('پارچه خام پنبه سوپر');
    setContactPerson('');
    setPhone('۰۹۱۲');
    setEmail('');
    setCity('تهران');
    setAddress('');
    setLeadTimeDays('7');
    setMinOrderQty('50');
    setQualityRating('درجه یک (A+)');
    setSuppliedMaterialsInput('تیشرت پنبه سوپر، پارچه دورس ۳ نخ');
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setCategory(sup.category);
    setContactPerson(sup.contactPerson);
    setPhone(sup.phone);
    setEmail(sup.email || '');
    setCity(sup.city);
    setAddress(sup.address);
    setLeadTimeDays(String(sup.leadTimeDays));
    setMinOrderQty(String(sup.minOrderQty));
    setQualityRating(sup.qualityRating);
    setSuppliedMaterialsInput(sup.suppliedMaterials.join('، '));
  };

  // Submit Create
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ title: 'نام الزامی است', description: 'لطفاً نام شرکت تامین‌کننده را وارد کنید.', type: 'error' });
      return;
    }

    const materials = suppliedMaterialsInput
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = createSupplier({
      name: name.trim(),
      category: category.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      address: address.trim(),
      leadTimeDays: parseInt(leadTimeDays, 10) || 7,
      minOrderQty: parseInt(minOrderQty, 10) || 50,
      qualityRating: qualityRating.trim(),
      suppliedMaterials: materials,
      status: 'active',
      activePurchaseOrdersCount: 0,
    });

    if (res.success) {
      addToast({ title: 'تامین‌کننده ثبت شد', description: `پرونده ${name} با موفقیت در سامانه ایجاد گردید.`, type: 'success' });
      setIsCreateModalOpen(false);
    } else {
      addToast({ title: 'خطا در ثبت', description: res.error || 'خطایی رخ داد.', type: 'error' });
    }
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const materials = suppliedMaterialsInput
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = updateSupplier(editingSupplier.id, {
      name: name.trim(),
      category: category.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      address: address.trim(),
      leadTimeDays: parseInt(leadTimeDays, 10) || 7,
      minOrderQty: parseInt(minOrderQty, 10) || 50,
      qualityRating: qualityRating.trim(),
      suppliedMaterials: materials,
    });

    if (res.success) {
      addToast({ title: 'ویرایش انجام شد', description: `اطلاعات ${name} بروزرسانی گردید.`, type: 'success' });
      setEditingSupplier(null);
    } else {
      addToast({ title: 'خطا', description: res.error || 'خطایی رخ داد.', type: 'error' });
    }
  };

  // Handle Delete
  const handleDelete = (sup: Supplier) => {
    const res = deleteSupplier(sup.id);
    if (res.success) {
      addToast({ title: 'تامین‌کننده حذف شد', description: `${sup.name} از لیست حذف گردید.`, type: 'success' });
    } else {
      addToast({ title: 'عدم امکان حذف', description: res.error || 'خطایی رخ داد.', type: 'error' });
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      key: 'name',
      header: 'نام شرکت / تامین‌کننده',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs flex items-center gap-1.5">
            <span>{row.name}</span>
            <span className="font-mono text-[10px] text-[#eed29d]">({row.id})</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {row.category} • شهر {row.city}
          </div>
        </div>
      ),
    },
    {
      key: 'materials',
      header: 'اقلام و متریال تامین‌شده',
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.suppliedMaterials.map((mat, i) => (
            <span
              key={i}
              className="text-[10px] bg-stone-900 text-stone-300 px-2 py-0.5 rounded border border-white/5 font-sans"
            >
              {mat}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'مسئول فروش و تماس (محافظت‌شده)',
      render: (row) => {
        const isRevealed = unmaskedPhones[row.id];
        return (
          <div className="text-xs space-y-1">
            <div className="text-stone-300 font-medium">{row.contactPerson}</div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-stone-400">
                {isRevealed ? row.phone : maskPhoneNumber(row.phone)}
              </span>
              <button
                type="button"
                onClick={() => togglePhoneMask(row.id)}
                title={isRevealed ? 'مخفی‌سازی شماره' : 'نمایش شماره کامل'}
                className="text-stone-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'leadTime',
      header: 'زمان تحویل و MOQ',
      align: 'center',
      render: (row) => (
        <div className="font-fanum text-xs">
          <div className="text-white font-bold">{toFaDigits(row.leadTimeDays)} روز کاری</div>
          <div className="text-[10px] text-stone-400">حداقل: {toFaDigits(row.minOrderQty)} عدد</div>
        </div>
      ),
    },
    {
      key: 'qualityRating',
      header: 'گواهی کیفیت',
      align: 'center',
      render: (row) => (
        <Badge
          label={row.qualityRating}
          variant="success"
          size="sm"
        />
      ),
    },
    {
      key: 'activePos',
      header: 'سفارشات جاری (PO)',
      align: 'center',
      render: (row) => {
        const count = (state.purchaseOrders || []).filter(
          (p) => p.supplierId === row.id && (p.status === 'ordered' || p.status === 'partially_received')
        ).length;

        return (
          <span
            className={`font-fanum text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
              count > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-stone-900 text-stone-500'
            }`}
          >
            {toFaDigits(count)} سفارش فعال
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            title="ویرایش اطلاعات تامین‌کننده"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            title="حذف تامین‌کننده"
            className="text-stone-500 hover:text-rose-400"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="تامین‌کنندگان پارچه و مواد مصرفی چاپ"
        description="مدیریت کارخانجات نساجی، نمایندگی‌های جوهر برادر، کارگاه‌های جعبه‌سازی و پایش زمان تحویل مواد اولیه."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/catalog/purchase-orders')}
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              سفارشات خرید (PO)
            </Button>
            <Button
              variant="brass"
              size="md"
              onClick={handleOpenCreate}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              ثبت تامین‌کننده جدید
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">تامین‌کنندگان فعال</span>
          <span className="text-2xl font-bold font-fanum text-white block">
            {toFaDigits((state.suppliers || []).length)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">کارخانجات و نمایندگی‌های معتمد</span>
        </div>

        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">میانگین زمان تحویل (Lead Time)</span>
          <span className="text-2xl font-bold font-fanum text-[#eed29d] block">
            {toFaDigits(
              Math.round(
                (state.suppliers || []).reduce((acc, s) => acc + s.leadTimeDays, 0) /
                  Math.max(1, (state.suppliers || []).length)
              )
            )}{' '}
            روز کاری
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">از زمان ثبت سفارش خرید</span>
        </div>

        <div className="p-4 bg-[#141211] border border-amber-500/20 rounded-2xl">
          <span className="text-xs text-amber-300 block mb-1">سفارشات خرید در گردش</span>
          <span className="text-2xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(
              (state.purchaseOrders || []).filter(
                (p) => p.status === 'ordered' || p.status === 'partially_received'
              ).length
            )}
          </span>
          <span className="text-[10px] text-amber-500/80 mt-1 block">محموله‌های در مسیر انبار</span>
        </div>

        <div className="p-4 bg-[#141211] border border-emerald-500/20 rounded-2xl">
          <span className="text-xs text-emerald-300 block mb-1">استاندارد کیفی A+ و بالاتر</span>
          <span className="text-2xl font-bold font-fanum text-emerald-400 block">
            {toFaDigits(
              (state.suppliers || []).filter((s) => s.qualityRating.includes('A') || s.qualityRating.includes('OEKO')).length
            )}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">تاییدیه کنترل کیفیت شاه‌پوش</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام کارخانه، مسئول تماس، شهر یا اقلام تامین‌شده..."
            className="w-full bg-[#181614] border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-[#ba8d3d]"
          />
        </div>

        <div className="w-56">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'همه دسته‌بندی‌ها' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        {(searchQuery || categoryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
            }}
          >
            پاکسازی فیلترها
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          data={filteredSuppliers}
          columns={columns}
          keyExtractor={(s) => s.id}
          emptyMessage="هیچ تامین‌کننده‌ای با این مشخصات یافت نشد."
        />
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans my-8">
            <h3 className="text-sm font-bold text-white mb-1">ثبت تامین‌کننده جدید</h3>
            <p className="text-xs text-stone-400 mb-4">
              مشخصات تماس، مدت زمان تحویل سفارش و اقلام تخصصی همکار را وارد فرمایید.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="نام کارخانه / شرکت" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: نساجی بافندگی دیبا"
                  />
                </FormField>

                <FormField label="زمینه تامین و دسته‌بندی" required>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="مثلاً: پارچه خام پنبه سوپر"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="نام مسئول فروش / مدیر حساب" required>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="مثلاً: مهندس رضایی"
                  />
                </FormField>

                <FormField label="تلفن تماس (محافظت‌شده)" required>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="شهر محل کارخانه">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="اصفهان / تهران"
                  />
                </FormField>

                <FormField label="ایمیل یا وب‌سایت">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@textile.com"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="مدت زمان تحویل (روز)">
                  <Input
                    type="number"
                    min="1"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                  />
                </FormField>

                <FormField label="حداقل سفارش (MOQ)">
                  <Input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                  />
                </FormField>

                <FormField label="درجه کیفی">
                  <Input
                    value={qualityRating}
                    onChange={(e) => setQualityRating(e.target.value)}
                    placeholder="درجه یک (A+)"
                  />
                </FormField>
              </div>

              <FormField label="اقلام و متریال‌های قابل تامین (با کاما جدا کنید)" required>
                <Input
                  value={suppliedMaterialsInput}
                  onChange={(e) => setSuppliedMaterialsInput(e.target.value)}
                  placeholder="تیشرت خام، هودی ۳۸۰ گرم، جوهر سفید، محلول کوتینگ"
                />
              </FormField>

              <FormField label="آدرس سوله / انبار">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="شهرک صنعتی، بلوار صنعت، پلاک ۱۲"
                />
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="brass" size="md">
                  ثبت پرونده تامین‌کننده
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans my-8">
            <h3 className="text-sm font-bold text-white mb-1">
              ویرایش تامین‌کننده: {editingSupplier.name}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              بروزرسانی اطلاعات تماس و قراردادهای نساجی
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="نام کارخانه / شرکت" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>

                <FormField label="زمینه تامین" required>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="مسئول فروش" required>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </FormField>

                <FormField label="تلفن" required>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="مدت تحویل (روز)">
                  <Input
                    type="number"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                  />
                </FormField>

                <FormField label="MOQ">
                  <Input
                    type="number"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                  />
                </FormField>

                <FormField label="درجه کیفی">
                  <Input
                    value={qualityRating}
                    onChange={(e) => setQualityRating(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="اقلام قابل تامین (با کاما)">
                <Input
                  value={suppliedMaterialsInput}
                  onChange={(e) => setSuppliedMaterialsInput(e.target.value)}
                />
              </FormField>

              <FormField label="آدرس">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingSupplier(null)}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="brass" size="md">
                  ذخیره تغییرات
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
