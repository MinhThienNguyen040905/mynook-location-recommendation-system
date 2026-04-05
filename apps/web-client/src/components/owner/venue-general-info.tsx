'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Info, Image as ImageIcon, CheckCircle,
  Wifi, Tag, BookOpen, MapPin, Coffee, Utensils, Clock, Plus, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVenueById, updateVenue } from '@/lib/api/venues';
import { Skeleton } from '@/components/ui/skeleton';
import type { Venue } from '@/types/venue';

const ALL_AMENITIES = [
  { name: 'High-speed Wi-Fi', icon: Wifi },
  { name: 'Power Outlets',    icon: Tag },
  { name: 'Quiet Zone',       icon: BookOpen },
  { name: 'Outdoor Seating',  icon: MapPin },
  { name: 'Pet Friendly',     icon: Coffee },
  { name: 'Vegan Options',    icon: Utensils },
];

export function VenueGeneralInfo() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('id');

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    description: '',
    owner_amenities: [] as string[],
    opening_hours: {} as Record<string, { open: string; close: string }>,
  });

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      return;
    }
    getVenueById(venueId)
      .then((v) => {
        setVenue(v);
        setForm({
          name: v.name ?? '',
          address: v.address ?? '',
          description: v.description ?? '',
          owner_amenities: v.owner_amenities ?? [],
          opening_hours: v.opening_hours ?? {},
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!venueId || !venue) {
    return (
      <div className="py-16 text-center text-gray-400">
        <Info size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Chọn một venue từ dashboard để quản lý</p>
      </div>
    );
  }

  function toggleAmenity(name: string) {
    setForm(prev => ({
      ...prev,
      owner_amenities: prev.owner_amenities.includes(name)
        ? prev.owner_amenities.filter(a => a !== name)
        : [...prev.owner_amenities, name],
    }));
  }

  async function handleSave() {
    if (!venueId) return;
    setSaving(true);
    try {
      const updated = await updateVenue(venueId, {
        name: form.name,
        address: form.address,
        description: form.description,
        owner_amenities: form.owner_amenities,
        opening_hours: form.opening_hours,
      });
      setVenue(updated);
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!venue) return;
    setForm({
      name: venue.name ?? '',
      address: venue.address ?? '',
      description: venue.description ?? '',
      owner_amenities: venue.owner_amenities ?? [],
      opening_hours: venue.opening_hours ?? {},
    });
  }

  const hours = form.opening_hours as Record<string, { open: string; close: string }>;

  return (
    <div className="space-y-8">

      {/* Basic Details */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
          <Info className="text-primary size-5" /> Basic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Venue Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Chi nhánh</label>
            <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-500">
              {venue.branch_name || '—'}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
              />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Photo & Media */}
      <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <ImageIcon className="text-primary size-5" /> Photo & Media
          </h3>
          <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
            <Plus className="size-4" /> Add Media
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {venue.media && venue.media.length > 0 ? (
            venue.media.map((url, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 group relative">
                <img
                  src={url}
                  alt={`Venue media ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : null}
          <button className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
            <Plus className="size-8" />
            <span className="text-xs font-bold">Upload</span>
          </button>
        </div>
      </div>

      {/* Amenities + Open Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Amenities */}
        <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
            <CheckCircle className="text-primary size-5" /> Amenities
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {ALL_AMENITIES.map((amenity) => (
              <label
                key={amenity.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={form.owner_amenities.includes(amenity.name)}
                  onChange={() => toggleAmenity(amenity.name)}
                  className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <amenity.icon className="size-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{amenity.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Open Hours */}
        <div className="p-8 bg-white rounded-3xl border border-primary/10 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
            <Clock className="text-primary size-5" /> Open Hours
          </h3>
          <div className="space-y-3">
            {Object.keys(hours).length > 0 ? (
              Object.entries(hours).map(([day, time]) => (
                <div
                  key={day}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100"
                >
                  <span className="text-sm font-bold text-slate-700 capitalize">{day}</span>
                  <span className="text-sm font-medium text-primary">{time.open} – {time.close}</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">
                Chưa thiết lập giờ mở cửa
              </div>
            )}
            <button className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
              Edit Full Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          onClick={handleCancel}
          className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
