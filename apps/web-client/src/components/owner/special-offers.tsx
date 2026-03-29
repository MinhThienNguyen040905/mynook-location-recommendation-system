'use client';

import { useState } from 'react';
import { Plus, Calendar, Edit3, Trash2 } from 'lucide-react';
import { AddSpecialOfferModal } from '@/components/owner/add-special-offer-modal';

export function SpecialOffers() {
  const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);

  const offers = [
    {
      title: 'Coffee & Cake Happy Hour',
      tag: 'Happy Hour',
      desc: 'Get 20% off all specialty coffee and handmade cakes every weekday from 2PM to 4PM.',
      valid: 'Oct 1 - Dec 31, 2024',
      img: 'https://picsum.photos/seed/coffee/400/300',
    },
    {
      title: 'Weekend Family Brunch',
      tag: 'Weekend',
      desc: 'Families of 4 or more get a free round of fresh orange juices with any brunch order.',
      valid: 'Ongoing: Weekends Only',
      img: 'https://picsum.photos/seed/brunch/400/300',
    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div>
          <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight">
            Special Offers
          </h1>
          <p className="text-slate-500 text-sm">Manage promotions and seasonal deals for your venue.</p>
        </div>
        <button
          onClick={() => setIsAddOfferModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="size-5" />
          <span>Add New Offer</span>
        </button>
      </div>

      {/* Offer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div
            key={offer.title}
            className="bg-white rounded-xl overflow-hidden border border-primary/10 shadow-sm hover:shadow-md transition-all"
          >
            <div
              className="relative h-48 w-full bg-cover bg-center"
              style={{ backgroundImage: `url('${offer.img}')` }}
            >
              <div className="absolute top-3 right-3">
                <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  {offer.tag}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2">{offer.title}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{offer.desc}</p>
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
                <Calendar className="size-4" />
                <span>Valid: {offer.valid}</span>
              </div>
              <div className="flex border-t border-primary/5 pt-4 justify-between items-center">
                <button className="text-primary hover:text-primary/80 font-bold text-sm flex items-center gap-1">
                  <Edit3 className="size-4" /> Edit
                </button>
                <button className="text-slate-400 hover:text-red-500 font-bold text-sm flex items-center gap-1">
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isAddOfferModalOpen && (
        <AddSpecialOfferModal onClose={() => setIsAddOfferModalOpen(false)} />
      )}
    </div>
  );
}
