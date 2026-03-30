'use client';

import {
  Info, Image as ImageIcon, CheckCircle,
  Wifi, Tag, BookOpen, MapPin, Coffee, Utensils, Clock, Plus,
} from 'lucide-react';

export function VenueGeneralInfo() {
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
              defaultValue="The Daily Grind Coffee House"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Venue Type</label>
            <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50">
              <option value="cafe">Cafe / Coffee Shop</option>
              <option value="restaurant">Restaurant</option>
              <option value="study">Study Space / Library</option>
              <option value="coworking">Coworking Space</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
              <input
                type="text"
                defaultValue="123 Artisan Blvd, Portland, OR 97205"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50/50"
              />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              rows={4}
              defaultValue="A cozy, artisan coffee house perfect for focused work and quiet study. We serve locally roasted beans and house-made pastries in a warm, welcoming environment."
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 group relative">
              {/* <img> kept for external picsum URLs — use next/image when URLs are from owned domains */}
              <img
                src={`https://picsum.photos/seed/venue-${i}/400`}
                alt="Venue"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">
                  Remove
                </button>
              </div>
            </div>
          ))}
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
            {[
              { name: 'High-speed Wi-Fi', icon: Wifi,     checked: true  },
              { name: 'Power Outlets',    icon: Tag,      checked: true  },
              { name: 'Quiet Zone',       icon: BookOpen, checked: true  },
              { name: 'Outdoor Seating',  icon: MapPin,   checked: false },
              { name: 'Pet Friendly',     icon: Coffee,   checked: true  },
              { name: 'Vegan Options',    icon: Utensils, checked: false },
            ].map((amenity) => (
              <label
                key={amenity.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  defaultChecked={amenity.checked}
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
            {[
              { day: 'Monday - Friday', time: '07:00 AM - 08:00 PM' },
              { day: 'Saturday',        time: '08:00 AM - 09:00 PM' },
              { day: 'Sunday',          time: '09:00 AM - 06:00 PM' },
            ].map((schedule) => (
              <div
                key={schedule.day}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100"
              >
                <span className="text-sm font-bold text-slate-700">{schedule.day}</span>
                <span className="text-sm font-medium text-primary">{schedule.time}</span>
              </div>
            ))}
            <button className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
              Edit Full Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-4 pt-4">
        <button className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5">
          Save Changes
        </button>
      </div>
    </div>
  );
}
