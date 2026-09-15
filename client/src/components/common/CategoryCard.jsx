import React from 'react';
import { ShieldCheck, Car, HeartPulse, GraduationCap, Receipt, Home, FileText, ChevronRight } from 'lucide-react';

const CATEGORY_ICONS = {
  ShieldCheck,
  Car,
  HeartPulse,
  GraduationCap,
  Receipt,
  Home,
  FileText
};

export default function CategoryCard({ category, onClick }) {
  const Icon = CATEGORY_ICONS[category.icon] || FileText;

  return (
    <div className="category-card" onClick={() => onClick && onClick(category.id)}>
      <div className="category-icon" style={{ color: category.color || 'var(--brand-primary)' }}>
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div className="category-info" style={{ flex: 1 }}>
        <h4>{category.name}</h4>
        <p>{category.docCount} {category.docCount === 1 ? 'document' : 'documents'}</p>
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </div>
  );
}
