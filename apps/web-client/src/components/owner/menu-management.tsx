'use client';

import { useState } from 'react';
import { Plus, Search, Coffee, Utensils, IceCream, GlassWater, Edit3 } from 'lucide-react';
import { AddMenuItemModal } from '@/components/owner/add-menu-item-modal';

export function MenuManagement() {
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  return (
    <div className="space-y-8">

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input
            className="w-full pl-12 pr-4 py-3 bg-white border border-primary/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
            placeholder="Search items (e.g. Latte, Toast)..."
            type="text"
          />
        </div>
        <button
          onClick={() => setIsAddItemModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md active:scale-95"
        >
          <Plus className="size-5" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Categories */}
      <section className="mb-12">
        <h3 className="text-lg font-bold mb-4 text-slate-900">Categories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Coffee',   icon: Coffee,      active: false },
            { name: 'Brunch',   icon: Utensils,    active: true  },
            { name: 'Desserts', icon: IceCream,    active: false },
            { name: 'Drinks',   icon: GlassWater,  active: false },
          ].map((cat) => (
            <div
              key={cat.name}
              className={`p-4 rounded-xl border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all group ${
                cat.active
                  ? 'bg-primary/5 border-primary'
                  : 'bg-white border-primary/10 hover:border-primary hover:shadow-md'
              }`}
            >
              <div
                className={`size-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                  cat.active
                    ? 'bg-primary text-white'
                    : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                }`}
              >
                <cat.icon className="size-6" />
              </div>
              <span className="font-bold text-sm">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Items List */}
      <section>
        <h3 className="text-lg font-bold mb-6 text-slate-900">Brunch Items (12)</h3>
        <div className="space-y-4">
          {[
            { name: 'Artisan Latte',   price: '$4.50',  desc: 'Double shot espresso, steamed oat milk',         img: 'https://picsum.photos/seed/latte/200'  },
            { name: 'Sourdough Toast', price: '$12.00', desc: 'House-made bread, smashed avocado, chili flakes', img: 'https://picsum.photos/seed/toast/200'  },
          ].map((item) => (
            <div
              key={item.name}
              className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex items-center gap-4 hover:shadow-md transition-all"
            >
              <div className="size-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src={item.img}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-lg">{item.name}</h4>
                <p className="text-slate-500 text-sm">{item.desc}</p>
                <span className="text-primary font-bold mt-1 block">{item.price}</span>
              </div>
              <button className="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors">
                <Edit3 className="size-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {isAddItemModalOpen && (
        <AddMenuItemModal onClose={() => setIsAddItemModalOpen(false)} />
      )}
    </div>
  );
}
