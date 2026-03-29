'use client';

import { X, Upload } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function AddSpecialOfferModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-primary/10 overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary/10 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Add New Special Offer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-primary transition-colors">
            <X className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Offer Name</label>
            <input
              className="w-full rounded-lg border border-primary/20 bg-slate-50 focus:ring-primary focus:border-primary px-4 py-2.5 outline-none"
              placeholder="e.g., Winter Weekend Brunch"
              type="text"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Start Date</label>
              <input
                className="w-full rounded-lg border border-primary/20 bg-slate-50 focus:ring-primary focus:border-primary px-4 py-2.5 outline-none"
                type="date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">End Date</label>
              <input
                className="w-full rounded-lg border border-primary/20 bg-slate-50 focus:ring-primary focus:border-primary px-4 py-2.5 outline-none"
                type="date"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              className="w-full rounded-lg border border-primary/20 bg-slate-50 focus:ring-primary focus:border-primary px-4 py-2.5 resize-none outline-none"
              placeholder="Describe the offer..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Promotional Image</label>
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <Upload className="size-10 text-primary mb-2" />
              <p className="text-sm text-slate-600 font-medium">Click to upload</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-primary/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-primary/10 transition-colors"
          >
            Cancel
          </button>
          <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
            Create Offer
          </button>
        </div>
      </div>
    </div>
  );
}
