'use client';

import { X, Camera } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function AddMenuItemModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-primary/10">
          <h2 className="text-xl font-bold text-slate-900">Add New Menu Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-primary transition-colors">
            <X className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Item Name</label>
                <input
                  className="w-full rounded-lg border border-primary/20 focus:border-primary focus:ring-primary bg-slate-50 p-3 text-sm outline-none"
                  placeholder="e.g. Belgian Waffles"
                  type="text"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Price</label>
                  <input
                    className="w-full rounded-lg border border-primary/20 focus:border-primary focus:ring-primary bg-slate-50 p-3 text-sm outline-none"
                    placeholder="0.00"
                    type="number"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select className="w-full rounded-lg border border-primary/20 focus:border-primary focus:ring-primary bg-slate-50 p-3 text-sm outline-none">
                    <option value="coffee">Coffee</option>
                    <option value="brunch">Brunch</option>
                    <option value="desserts">Desserts</option>
                    <option value="drinks">Drinks</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  className="w-full rounded-lg border border-primary/20 focus:border-primary focus:ring-primary bg-slate-50 p-3 text-sm resize-none outline-none"
                  placeholder="Briefly describe..."
                  rows={4}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Item Image</label>
              <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer min-h-[280px]">
                <Camera className="size-12 text-primary mb-2" />
                <p className="text-sm font-bold text-slate-900">Click to upload</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-primary/10 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button className="px-8 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
