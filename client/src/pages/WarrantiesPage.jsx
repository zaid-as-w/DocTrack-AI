import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Globe,
  ExternalLink,
  Calendar,
  Tag,
  Laptop,
  Tv,
  Smartphone,
  Home as HomeIcon,
  Car,
  Edit2,
  Trash2,
  X,
  Sparkles,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import {
  getWarranties,
  getWarrantyStats,
  createWarranty,
  updateWarranty,
  deleteWarranty,
  getWarrantyClaimGuide
} from '../services/api';
import { useProfile } from '../context/ProfileContext';
import Toast from '../components/common/Toast';

// Helper to format currency in Indian numbering format (₹)
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Map category to an appropriate professional icon
const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('computing') || cat.includes('laptop')) return <Laptop size={18} />;
  if (cat.includes('mobile') || cat.includes('gadget') || cat.includes('phone')) return <Smartphone size={18} />;
  if (cat.includes('appliance') || cat.includes('home')) return <HomeIcon size={18} />;
  if (cat.includes('vehicle') || cat.includes('car')) return <Car size={18} />;
  if (cat.includes('tv') || cat.includes('electronic')) return <Tv size={18} />;
  return <Receipt size={18} />;
};

const CATEGORIES = [
  'All',
  'Electronics',
  'Home Appliances',
  'Mobile & Gadgets',
  'Computing & Accessories',
  'Vehicles & Automotive',
  'Fitness & Smart Tech',
  'Other'
];

const DURATION_PRESETS = [
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 }
];

export default function WarrantiesPage() {
  const navigate = useNavigate();
  const { profiles, activeProfile } = useProfile();

  // State
  const [warranties, setWarranties] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    totalValuation: 0,
    activeValuation: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState(null);
  const [selectedClaimGuide, setSelectedClaimGuide] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
    category: 'Electronics',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    durationMonths: 12,
    customExpiryDate: '',
    invoiceNumber: '',
    seller: '',
    amount: '',
    coverageType: 'Manufacturer Standard',
    claimContact: '',
    claimPortal: '',
    serviceNotes: '',
    profileId: 'self'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [wResponse, sResponse] = await Promise.all([
        getWarranties({
          profileId: activeProfile?.id !== 'all' ? activeProfile?.id : undefined
        }),
        getWarrantyStats()
      ]);

      if (wResponse.success) {
        setWarranties(wResponse.warranties || []);
      }
      if (sResponse.success && sResponse.summary) {
        setStats(sResponse.summary);
      }
    } catch (err) {
      console.error('Failed to load warranties:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProfile]);

  // Compute live expiry date for form
  const computedFormExpiry = useMemo(() => {
    if (!formData.purchaseDate) return '';
    const d = new Date(formData.purchaseDate);
    d.setMonth(d.getMonth() + parseInt(formData.durationMonths || 12, 10));
    return d.toISOString().split('T')[0];
  }, [formData.purchaseDate, formData.durationMonths]);

  // Filtered Warranties
  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      // Tab filter
      if (selectedStatusTab !== 'ALL' && w.status !== selectedStatusTab) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'All' && w.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.productName?.toLowerCase().includes(q);
        const matchesBrand = w.brand?.toLowerCase().includes(q);
        const matchesSeller = w.seller?.toLowerCase().includes(q);
        const matchesInvoice = w.invoiceNumber?.toLowerCase().includes(q);
        const matchesSerial = w.serialNumber?.toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesSeller && !matchesInvoice && !matchesSerial) {
          return false;
        }
      }
      return true;
    });
  }, [warranties, selectedStatusTab, selectedCategory, searchQuery]);

  // Keyboard accessibility: ESC key to close open warranty modals
  useEffect(() => {
    if (!isFormModalOpen && !isClaimModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFormModalOpen(false);
        setIsClaimModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFormModalOpen, isClaimModalOpen]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingWarranty(null);
    setFormData({
      productName: '',
      category: 'Electronics',
      brand: '',
      modelNumber: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      durationMonths: 12,
      customExpiryDate: '',
      invoiceNumber: '',
      seller: '',
      amount: '',
      coverageType: 'Manufacturer Standard',
      claimContact: '',
      claimPortal: '',
      serviceNotes: '',
      profileId: activeProfile?.id || 'self'
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (w) => {
    setEditingWarranty(w);
    setFormData({
      productName: w.productName || '',
      category: w.category || 'Electronics',
      brand: w.brand || '',
      modelNumber: w.modelNumber || '',
      serialNumber: w.serialNumber || '',
      purchaseDate: w.purchaseDate || new Date().toISOString().split('T')[0],
      durationMonths: w.durationMonths || 12,
      customExpiryDate: w.expiryDate || '',
      invoiceNumber: w.invoiceNumber || '',
      seller: w.seller || '',
      amount: w.amount || '',
      coverageType: w.coverageType || 'Manufacturer Standard',
      claimContact: w.claimContact || '',
      claimPortal: w.claimPortal || '',
      serviceNotes: w.serviceNotes || '',
      profileId: w.profileId || 'self'
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.purchaseDate) {
      setFormError('Please fill in product name and purchase date.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      ...formData,
      amount: Number(formData.amount) || 0,
      durationMonths: parseInt(formData.durationMonths, 10),
      expiryDate: formData.customExpiryDate || computedFormExpiry
    };

    try {
      if (editingWarranty) {
        await updateWarranty(editingWarranty.id, payload);
      } else {
        await createWarranty(payload);
      }
      setIsFormModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save warranty bill.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove warranty tracking for "${name}"?`)) {
      return;
    }
    try {
      await deleteWarranty(id);
      await fetchData();
      setToast({ message: 'Warranty tracking removed successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to delete warranty: ' + err.message, type: 'error' });
    }
  };

  // Open Claim Guide
  const handleOpenClaimGuide = async (warranty) => {
    setSelectedClaimGuide(null);
    setIsClaimModalOpen(true);
    setClaimLoading(true);
    try {
      const res = await getWarrantyClaimGuide(warranty.id);
      if (res.success && res.claimGuide) {
        setSelectedClaimGuide(res.claimGuide);
      }
    } catch (err) {
      console.error('Failed to load claim guide:', err);
    } finally {
      setClaimLoading(false);
    }
  };

  // Helper for progress bar
  const getProgressPercentage = (w) => {
    const totalDays = (w.durationMonths || 12) * 30.5;
    const elapsed = totalDays - (w.daysRemaining || 0);
    const pct = Math.min(Math.max((elapsed / totalDays) * 100, 0), 100);
    return Math.round(pct);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Warranty & Invoice Vault
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Track electronics guarantees, appliance AMC windows, purchase invoices, and official brand claim hotlines.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Vault</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Warranty Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Total Warranties */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Receipt size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Warranties
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {stats.totalCount || warranties.length}
            </div>
          </div>
        </div>

        {/* Active Protection */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--status-active-bg)',
              color: 'var(--status-active-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Coverage
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-active-text)', marginTop: '2px' }}>
              {stats.activeCount || 0}
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--status-expiring-bg)',
              color: 'var(--status-expiring-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expiring Soon (&lt;30d)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-expiring-text)', marginTop: '2px' }}>
              {stats.expiringCount || 0}
            </div>
          </div>
        </div>

        {/* Expired Warranties */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--status-expired-bg)',
              color: 'var(--status-expired-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <XCircle size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expired Warranties
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-expired-text)', marginTop: '2px' }}>
              {stats.expiredCount || 0}
            </div>
          </div>
        </div>

        {/* Total Valuation */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(16,185,129,0.06) 100%)',
            border: '1px solid rgba(37,99,235,0.2)'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: '#FFFFFF',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={24} strokeWidth={2.3} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Protected Valuation
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(stats.totalValuation || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Status Segmented Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Items', count: warranties.length },
            { key: 'ACTIVE', label: 'Active', count: warranties.filter(w => w.status === 'ACTIVE').length },
            { key: 'EXPIRING_SOON', label: 'Expiring Soon', count: warranties.filter(w => w.status === 'EXPIRING_SOON').length },
            { key: 'EXPIRED', label: 'Expired', count: warranties.filter(w => w.status === 'EXPIRED').length }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatusTab(tab.key)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: selectedStatusTab === tab.key ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                color: selectedStatusTab === tab.key ? '#FFFFFF' : 'var(--text-secondary)'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  marginLeft: '0.4rem',
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: selectedStatusTab === tab.key ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right side: Category Dropdown & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          {/* Search */}
          <div className="search-container" style={{ minWidth: '240px', maxWidth: '320px', padding: '0.45rem 0.75rem' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search product, brand, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Warranties Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Loading protected warranties...</p>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <Receipt size={32} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Warranties Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
            {searchQuery || selectedStatusTab !== 'ALL' || selectedCategory !== 'All'
              ? 'No warranties match your active filters. Try resetting search parameters.'
              : 'Add your first product invoice or warranty bill to monitor coverage windows and claim hotlines.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ margin: '0 auto' }}
          >
            <Plus size={16} />
            <span>Register Warranty Bill</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {filteredWarranties.map((w) => {
            const isExpiringSoon = w.status === 'EXPIRING_SOON';
            const isExpired = w.status === 'EXPIRED';
            const progress = getProgressPercentage(w);

            return (
              <div
                key={w.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  border: isExpiringSoon
                    ? '1.5px solid var(--status-expiring-border)'
                    : isExpired
                    ? '1px solid var(--border-light)'
                    : '1px solid var(--border-light)',
                  boxShadow: isExpiringSoon ? '0 4px 14px rgba(245, 158, 11, 0.12)' : 'var(--shadow-card)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Top Header: Category, Brand Tag & Status Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(37,99,235,0.08)',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getCategoryIcon(w.category)}
                      </div>
                      {w.brand && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {w.brand}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: isExpiringSoon
                          ? 'var(--status-expiring-bg)'
                          : isExpired
                          ? 'var(--status-expired-bg)'
                          : 'var(--status-active-bg)',
                        color: isExpiringSoon
                          ? 'var(--status-expiring-text)'
                          : isExpired
                          ? 'var(--status-expired-text)'
                          : 'var(--status-active-text)',
                        border: `1px solid ${
                          isExpiringSoon
                            ? 'var(--status-expiring-border)'
                            : isExpired
                            ? 'var(--status-expired-border)'
                            : 'var(--status-active-border)'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: isExpiringSoon ? '#f59e0b' : isExpired ? '#ef4444' : '#10b981'
                        }}
                      />
                      <span>
                        {isExpiringSoon
                          ? 'Expiring Soon'
                          : isExpired
                          ? 'Expired'
                          : 'Active Coverage'}
                      </span>
                    </div>
                  </div>

                  {/* Product Title & Model */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                    {w.productName}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {w.modelNumber && <span>Model: {w.modelNumber}</span>}
                    {w.modelNumber && w.serialNumber && <span> • </span>}
                    {w.serialNumber && <span>S/N: {w.serialNumber}</span>}
                  </div>

                  {/* Progress Bar & Days Remaining Badge */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Warranty Lifecycle ({progress}% elapsed)
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isExpiringSoon
                            ? 'var(--status-expiring-text)'
                            : isExpired
                            ? 'var(--status-expired-text)'
                            : 'var(--brand-primary)'
                        }}
                      >
                        {isExpired
                          ? `Expired ${Math.abs(w.daysRemaining)} days ago`
                          : isExpiringSoon
                          ? `⚡ ${w.daysRemaining} days remaining!`
                          : `✅ ${w.daysRemaining} days left`}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          borderRadius: '9999px',
                          backgroundColor: isExpired
                            ? '#ef4444'
                            : isExpiringSoon
                            ? '#f59e0b'
                            : '#10b981',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.9rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.65rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Purchase Date</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.purchaseDate}</span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Warranty Till</span>
                      <span style={{ fontWeight: 700, color: isExpiringSoon ? '#d97706' : isExpired ? '#dc2626' : '#059669' }}>
                        {w.expiryDate}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Retailer / Seller</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.seller || 'Direct Retail'}</span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Invoice Number</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.invoiceNumber || 'N/A'}</span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Protected Value</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(w.amount)}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Vault Profile</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.profileName || 'Zaid (Self)'}</span>
                    </div>
                  </div>

                  {/* Claim Hotline Snapshot */}
                  {w.claimContact && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <Phone size={13} color="var(--brand-primary)" />
                      <span>Support: <strong style={{ color: 'var(--text-primary)' }}>{w.claimContact}</strong></span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div
                  style={{
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenClaimGuide(w)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <ShieldCheck size={15} color="var(--brand-primary)" />
                    <span>Claim Guide</span>
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleOpenEdit(w)}
                    title="Edit Warranty Details"
                    style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Edit2 size={16} color="var(--text-secondary)" />
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleDelete(w.id, w.productName)}
                    title="Delete Warranty"
                    style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Trash2 size={16} color="var(--status-expired-text)" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT WARRANTY */}
      {isFormModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="warranty-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 id="warranty-modal-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {editingWarranty ? 'Edit Warranty Bill' : 'Register New Warranty Bill'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Index product coverage duration, purchase invoice, and claim hotline
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsFormModalOpen(false)}
                aria-label="Close warranty modal"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-expired-bg)',
                  border: '1px solid var(--status-expired-border)',
                  color: 'var(--status-expired-text)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Product Name */}
              <div>
                <label htmlFor="warranty-product-name" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Product Name *
                </label>
                <input
                  id="warranty-product-name"
                  type="text"
                  placeholder="e.g. Sony Bravia 55' OLED TV"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="search-input"
                  style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  required
                />
              </div>

              {/* Category & Brand */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)'
                    }}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sony, Apple, Samsung"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Model Number & Serial Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Model Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KD-55A80L"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-882910-X"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Purchase Date & Duration Presets */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--bg-subtle)'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--bg-subtle)'
                      }}
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>Quick Presets:</span>
                  {DURATION_PRESETS.map(p => (
                    <button
                      key={p.months}
                      type="button"
                      onClick={() => setFormData({ ...formData, durationMonths: p.months })}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: parseInt(formData.durationMonths, 10) === p.months ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)',
                        backgroundColor: parseInt(formData.durationMonths, 10) === p.months ? 'var(--brand-light)' : '#FFFFFF',
                        color: parseInt(formData.durationMonths, 10) === p.months ? 'var(--brand-dark)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Live Computed Expiry Banner */}
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Calculated Expiry Date:</span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>
                    {computedFormExpiry}
                  </span>
                </div>
              </div>

              {/* Seller, Invoice Number & Purchase Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Seller / Store
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reliance Digital, Amazon"
                    value={formData.seller}
                    onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Invoice #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-88291"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Cost (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 49999"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Coverage Type & Profile */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Coverage Type
                  </label>
                  <select
                    value={formData.coverageType}
                    onChange={(e) => setFormData({ ...formData, coverageType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)'
                    }}
                  >
                    <option value="Manufacturer Standard">Manufacturer Standard</option>
                    <option value="Extended Warranty (AMC)">Extended Warranty (AMC)</option>
                    <option value="Accidental Damage Protection">Accidental Damage Protection</option>
                    <option value="Comprehensive">Comprehensive</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Vault Profile
                  </label>
                  <select
                    value={formData.profileId}
                    onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-subtle)'
                    }}
                  >
                    <option value="self">Zaid (Self)</option>
                    {profiles && profiles.filter(p => p.id !== 'self').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Support Hotline & Official Portal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Claim Support Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1800 103 7799"
                    value={formData.claimContact}
                    onChange={(e) => setFormData({ ...formData, claimContact: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Official Support Portal URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://support.brand.com"
                    value={formData.claimPortal}
                    onChange={(e) => setFormData({ ...formData, claimPortal: e.target.value })}
                    className="search-input"
                    style={{ width: '100%', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              {/* Service Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Coverage Notes & Special Terms
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. In-home technician service included. Keep original box for service."
                  value={formData.serviceNotes}
                  onChange={(e) => setFormData({ ...formData, serviceNotes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ minWidth: '130px' }}
                >
                  {formSubmitting ? 'Saving...' : editingWarranty ? 'Update Warranty' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Guide & Brand Service Modal */}
      {isClaimModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-primary)', marginBottom: '0.25rem' }}>
                  <ShieldCheck size={18} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Official Claim Guide
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedClaimGuide?.productName || 'Warranty Service Assistant'}
                </h2>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsClaimModalOpen(false)}
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {claimLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading brand claim protocol...</p>
              </div>
            ) : selectedClaimGuide ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Brand Contact Card */}
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={15} color="var(--brand-primary)" />
                      Brand Helpline:
                    </span>
                    <a
                      href={`tel:${selectedClaimGuide.officialPhone?.replace(/\D/g, '')}`}
                      style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brand-primary)', textDecoration: 'none' }}
                    >
                      {selectedClaimGuide.officialPhone}
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Globe size={15} color="#2563eb" />
                      Support Portal:
                    </span>
                    <a
                      href={selectedClaimGuide.officialPortal}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Visit Service Center</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Required Documents Checklist */}
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Required Documents for Warranty Claim:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedClaimGuide.checklist?.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <CheckCircle2 size={15} color="#10b981" flexShrink={0} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Tips */}
                {selectedClaimGuide.tips && (
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(37,99,235,0.15)',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <strong style={{ color: '#2563eb', display: 'block', marginBottom: '0.2rem' }}>Service Advice:</strong>
                    <span>{selectedClaimGuide.tips}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsClaimModalOpen(false)}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Understood
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
