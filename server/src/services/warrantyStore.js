/**
 * Warranty Tracking Store & Lifecycle Service
 * DocTrack AI — Iteration 10: Warranty Tracking Engine
 */

const calculateWarrantyStatus = (expiryDateStr) => {
  if (!expiryDateStr) {
    return { status: 'ACTIVE', daysRemaining: 365 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status = 'ACTIVE';
  if (daysRemaining < 0) {
    status = 'EXPIRED';
  } else if (daysRemaining <= 30) {
    status = 'EXPIRING_SOON';
  } else {
    status = 'ACTIVE';
  }

  return { status, daysRemaining };
};

const calculateExpiryDate = (purchaseDateStr, durationMonths) => {
  const purchase = new Date(purchaseDateStr || new Date());
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + parseInt(durationMonths, 10));
  return expiry.toISOString().split('T')[0];
};

// Compute dynamic relative dates so demo records always showcase all states
const now = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];

const dateMinusMonths = (m) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - m);
  return formatDate(d);
};

const datePlusDays = (days) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const dateMinusDays = (days) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return formatDate(d);
};

const initialWarranties = [
  {
    id: 'war-macbook-01',
    userId: 'demo-user-zaid-001',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    productName: 'Apple MacBook Pro 16" (M3 Max / 36GB / 1TB)',
    category: 'Computing & Accessories',
    brand: 'Apple',
    modelNumber: 'MUW63HN/A',
    serialNumber: 'C02G89A2MD6R',
    purchaseDate: dateMinusMonths(10),
    durationMonths: 24,
    expiryDate: datePlusDays(425),
    invoiceNumber: 'APL-IN-2025-9941',
    seller: 'Apple Store India Online',
    amount: 249900,
    currency: 'INR',
    coverageType: 'Comprehensive',
    claimContact: '000800 100 9009 (AppleCare)',
    claimPortal: 'https://support.apple.com/en-in',
    serviceNotes: 'Includes AppleCare+ with unlimited accidental damage protection and 24/7 priority tech support.',
    hasDocument: true,
    documentFileUrl: '/uploads/apple_macbook_invoice.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'war-sony-tv-02',
    userId: 'demo-user-zaid-001',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    productName: 'Sony Bravia 55" 4K HDR OLED Google TV',
    category: 'Home Appliances',
    brand: 'Sony',
    modelNumber: 'KD-55A80L',
    serialNumber: 'SN-882910-TV',
    purchaseDate: dateMinusMonths(14),
    durationMonths: 24,
    expiryDate: datePlusDays(304),
    invoiceNumber: 'SNY-INV-49102',
    seller: 'Reliance Digital Megastore',
    amount: 149999,
    currency: 'INR',
    coverageType: 'Manufacturer Standard',
    claimContact: '1800 103 7799 (Sony Toll Free)',
    claimPortal: 'https://www.sony.co.in/electronics/support',
    serviceNotes: '2-Year comprehensive panel and motherboard warranty. In-home technician service included.',
    hasDocument: true,
    documentFileUrl: '/uploads/sony_bravia_invoice_warranty.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'war-lg-washer-03',
    userId: 'demo-user-zaid-001',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    productName: 'LG Direct Drive 9Kg Front Load AI Washing Machine',
    category: 'Home Appliances',
    brand: 'LG',
    modelNumber: 'FHP1409Z9P',
    serialNumber: 'LG-WM-990142',
    purchaseDate: dateMinusMonths(23),
    durationMonths: 24,
    expiryDate: datePlusDays(18), // Expiring in 18 days!
    invoiceNumber: 'CROMA-BLR-84912',
    seller: 'Croma Electronics Bengaluru',
    amount: 48500,
    currency: 'INR',
    coverageType: 'Extended Warranty (AMC)',
    claimContact: '1800 315 9999 (LG India Care)',
    claimPortal: 'https://www.lg.com/in/support',
    serviceNotes: 'Comprehensive product warranty expiring soon. Motor has 10-year separate warranty. AMC extension available for ₹3,200.',
    hasDocument: false,
    documentFileUrl: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'war-galaxy-s24-04',
    userId: 'demo-user-zaid-001',
    profileId: 'son',
    profileName: 'Rahul (Son)',
    productName: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray / 512GB)',
    category: 'Mobile & Gadgets',
    brand: 'Samsung',
    modelNumber: 'SM-S928B',
    serialNumber: 'R5CW3079Q2T',
    purchaseDate: dateMinusMonths(11),
    durationMonths: 12,
    expiryDate: datePlusDays(6), // Expiring in 6 days!
    invoiceNumber: 'SAM-IND-771829',
    seller: 'Samsung Experience Store',
    amount: 129999,
    currency: 'INR',
    coverageType: 'Accidental Damage Protection',
    claimContact: '1800 5 7267864 (Samsung Support)',
    claimPortal: 'https://www.samsung.com/in/support',
    serviceNotes: 'Samsung Care+ 1-Year Screen & Liquid Protection. Urgent: 6 days remaining before policy window closes.',
    hasDocument: true,
    documentFileUrl: '/uploads/samsung_s24_invoice.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'war-dyson-v11-05',
    userId: 'demo-user-zaid-001',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    productName: 'Dyson V11 Absolute Cord-Free Vacuum Cleaner',
    category: 'Home Appliances',
    brand: 'Dyson',
    modelNumber: 'SV14-ABS-IN',
    serialNumber: 'DY-881920-IND',
    purchaseDate: dateMinusMonths(26),
    durationMonths: 24,
    expiryDate: dateMinusDays(45), // Expired 45 days ago!
    invoiceNumber: 'AMZ-IN-8829103',
    seller: 'Amazon India (Cloudtail)',
    amount: 52900,
    currency: 'INR',
    coverageType: 'Manufacturer Standard',
    claimContact: '1800 258 6688 (Dyson India)',
    claimPortal: 'https://www.dyson.in/support',
    serviceNotes: 'Standard 2-Year Manufacturer warranty has expired. Out-of-warranty paid maintenance and battery replacement available.',
    hasDocument: false,
    documentFileUrl: '',
    createdAt: new Date().toISOString()
  }
];

// In-memory collection
let warrantiesStore = [...initialWarranties];

/**
 * Re-evaluate all warranties dynamically against current date
 */
const evaluateWarranty = (warranty) => {
  const { status, daysRemaining } = calculateWarrantyStatus(warranty.expiryDate);
  return {
    ...warranty,
    status,
    daysRemaining
  };
};

const getWarranties = (userId = 'demo-user-zaid-001', filters = {}) => {
  const userWarranties = warrantiesStore.filter(w => w.userId === userId);
  const targetList = (userWarranties.length > 0)
    ? userWarranties
    : (userId === 'demo-user-zaid-001' ? warrantiesStore : []);

  let list = targetList.map(evaluateWarranty);

  if (filters.profileId && filters.profileId !== 'all') {
    list = list.filter(w => w.profileId === filters.profileId);
  }

  if (filters.status && filters.status !== 'ALL') {
    list = list.filter(w => w.status === filters.status);
  }

  if (filters.category && filters.category !== 'ALL') {
    list = list.filter(w => w.category === filters.category);
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.toLowerCase().trim();
    list = list.filter(w =>
      (w.productName && w.productName.toLowerCase().includes(q)) ||
      (w.brand && w.brand.toLowerCase().includes(q)) ||
      (w.seller && w.seller.toLowerCase().includes(q)) ||
      (w.invoiceNumber && w.invoiceNumber.toLowerCase().includes(q)) ||
      (w.serialNumber && w.serialNumber.toLowerCase().includes(q))
    );
  }

  // Sort by urgency: expiring soon first, then active, then expired
  return list.sort((a, b) => {
    if (a.status === 'EXPIRING_SOON' && b.status !== 'EXPIRING_SOON') return -1;
    if (b.status === 'EXPIRING_SOON' && a.status !== 'EXPIRING_SOON') return 1;
    if (a.status === 'ACTIVE' && b.status === 'EXPIRED') return -1;
    if (b.status === 'ACTIVE' && a.status === 'EXPIRED') return 1;
    return a.daysRemaining - b.daysRemaining;
  });
};

const getWarrantyById = (id, userId = 'demo-user-zaid-001') => {
  const item = warrantiesStore.find(w => w.id === id && (!w.userId || w.userId === userId));
  return item ? evaluateWarranty(item) : null;
};

const addWarranty = (warrantyData) => {
  const id = warrantyData.id || `war-${Date.now()}`;
  const expiryDate = warrantyData.expiryDate || calculateExpiryDate(warrantyData.purchaseDate, warrantyData.durationMonths || 12);
  const { status, daysRemaining } = calculateWarrantyStatus(expiryDate);

  const newWarranty = {
    ...warrantyData,
    id,
    expiryDate,
    status,
    daysRemaining,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  warrantiesStore.unshift(newWarranty);
  return evaluateWarranty(newWarranty);
};

const updateWarranty = (id, updates, userId = 'demo-user-zaid-001') => {
  const index = warrantiesStore.findIndex(w => w.id === id && (!w.userId || w.userId === userId));
  if (index === -1) return null;

  const existing = warrantiesStore[index];
  const purchaseDate = updates.purchaseDate || existing.purchaseDate;
  const durationMonths = updates.durationMonths || existing.durationMonths;
  const expiryDate = updates.expiryDate || calculateExpiryDate(purchaseDate, durationMonths);
  const { status, daysRemaining } = calculateWarrantyStatus(expiryDate);

  const updated = {
    ...existing,
    ...updates,
    purchaseDate,
    durationMonths,
    expiryDate,
    status,
    daysRemaining,
    updatedAt: new Date().toISOString()
  };

  warrantiesStore[index] = updated;
  return evaluateWarranty(updated);
};

const deleteWarranty = (id, userId = 'demo-user-zaid-001') => {
  const initialLength = warrantiesStore.length;
  warrantiesStore = warrantiesStore.filter(w => !(w.id === id && (!w.userId || w.userId === userId)));
  return warrantiesStore.length < initialLength;
};

const getWarrantySummary = (userId = 'demo-user-zaid-001') => {
  const all = getWarranties(userId, {});

  const totalCount = all.length;
  const activeCount = all.filter(w => w.status === 'ACTIVE').length;
  const expiringCount = all.filter(w => w.status === 'EXPIRING_SOON').length;
  const expiredCount = all.filter(w => w.status === 'EXPIRED').length;

  const totalValuation = all.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const activeValuation = all
    .filter(w => w.status === 'ACTIVE' || w.status === 'EXPIRING_SOON')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const categoriesSummary = {};
  all.forEach(w => {
    const cat = w.category || 'Other';
    if (!categoriesSummary[cat]) {
      categoriesSummary[cat] = { count: 0, totalAmount: 0 };
    }
    categoriesSummary[cat].count += 1;
    categoriesSummary[cat].totalAmount += Number(w.amount) || 0;
  });

  return {
    totalCount,
    activeCount,
    expiringCount,
    expiredCount,
    totalValuation,
    activeValuation,
    categoriesSummary
  };
};

module.exports = {
  calculateWarrantyStatus,
  calculateExpiryDate,
  getWarranties,
  getWarrantyById,
  addWarranty,
  updateWarranty,
  deleteWarranty,
  getWarrantySummary
};
