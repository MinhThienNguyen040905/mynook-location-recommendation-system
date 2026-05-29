'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2, MapPin, Check, Building2 } from 'lucide-react';
import {
  adminListCities,
  adminCreateCity,
  adminUpdateCity,
  adminDeleteCity,
  adminListDistricts,
  adminCreateDistrict,
  adminUpdateDistrict,
  adminDeleteDistrict,
  type AdminCityUpsert,
  type AdminDistrictUpsert,
} from '@/lib/api/admin';
import type { City, District } from '@/types/venue';

type Tab = 'cities' | 'districts';

interface CityForm {
  code: string;
  name: string;
  aliasesRaw: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
}

interface DistrictForm {
  city_id: string;
  code: string;
  name: string;
  aliasesRaw: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
}

const EMPTY_CITY: CityForm = {
  code: '', name: '', aliasesRaw: '', latitude: '', longitude: '', is_active: true,
};

const emptyDistrict = (cityId = ''): DistrictForm => ({
  city_id: cityId, code: '', name: '', aliasesRaw: '', latitude: '', longitude: '', is_active: true,
});

function parseAliases(raw: string): string[] {
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
}

function buildCityPayload(s: CityForm): AdminCityUpsert {
  return {
    name: s.name.trim(),
    aliases: parseAliases(s.aliasesRaw),
    latitude: s.latitude ? Number(s.latitude) : undefined,
    longitude: s.longitude ? Number(s.longitude) : undefined,
    is_active: s.is_active,
  };
}

function buildDistrictPayload(s: DistrictForm): AdminDistrictUpsert {
  return {
    name: s.name.trim(),
    aliases: parseAliases(s.aliasesRaw),
    latitude: s.latitude ? Number(s.latitude) : undefined,
    longitude: s.longitude ? Number(s.longitude) : undefined,
    is_active: s.is_active,
  };
}

export default function AdminLocationsPage() {
  const [tab, setTab] = useState<Tab>('cities');
  const [filterCityId, setFilterCityId] = useState<string>('');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-2">
          <MapPin size={26} className="text-nook-olive" /> Quản lý vị trí
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Cities + districts. Aliases giúp Groq map "Q1" / "quan 1" / "district 1" về cùng district_id.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(['cities', 'districts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-nook-olive text-nook-olive'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'cities' ? 'Thành phố' : 'Quận/Huyện'}
          </button>
        ))}
      </div>

      {tab === 'cities' ? (
        <CitiesTab onPickCityForDistricts={(id) => { setFilterCityId(id); setTab('districts'); }} />
      ) : (
        <DistrictsTab filterCityId={filterCityId} onChangeFilter={setFilterCityId} />
      )}
    </div>
  );
}

// ── Cities tab ────────────────────────────────────────────────────────────

function CitiesTab({ onPickCityForDistricts }: { onPickCityForDistricts: (id: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'cities'],
    queryFn: adminListCities,
  });

  const [editing, setEditing] = useState<City | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CityForm>(EMPTY_CITY);
  const [confirmDelete, setConfirmDelete] = useState<City | null>(null);

  const createMut = useMutation({
    mutationFn: adminCreateCity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
      setCreating(false);
      setForm(EMPTY_CITY);
    },
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; body: AdminCityUpsert }) => adminUpdateCity(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
      setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: adminDeleteCity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
      setConfirmDelete(null);
    },
  });

  function openCreate() { setForm(EMPTY_CITY); setCreating(true); setEditing(null); }
  function openEdit(c: City) {
    setForm({
      code: c.code,
      name: c.name,
      aliasesRaw: (c.aliases ?? []).join(', '),
      latitude: '',
      longitude: '',
      is_active: c.is_active,
    });
    setEditing(c);
    setCreating(false);
  }

  function submit() {
    if (creating) {
      createMut.mutate({
        ...buildCityPayload(form),
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
      });
    } else if (editing) {
      updateMut.mutate({ id: editing.id, body: buildCityPayload(form) });
    }
  }

  const dialogOpen = creating || editing !== null;

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-nook-olive text-white text-sm font-bold rounded-xl hover:bg-nook-olive/90"
        >
          <Plus size={16} /> Tạo city
        </button>
      </div>

      {isLoading && <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="inline animate-spin mr-2" /> Đang tải...</div>}
      {error instanceof Error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error.message}</div>}

      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Tên</th>
                <th className="text-left px-4 py-3">Aliases</th>
                <th className="text-center px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{c.code}</code></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {(c.aliases ?? []).slice(0, 5).join(', ')}
                    {(c.aliases ?? []).length > 5 && ` +${c.aliases.length - 5}`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_active ? <Check size={16} className="inline text-emerald-500" /> : <X size={16} className="inline text-slate-300" />}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => onPickCityForDistricts(c.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Xem districts"
                    >
                      <Building2 size={14} />
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-nook-olive hover:bg-nook-olive/10 rounded-lg">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(c)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Chưa có city nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <CityDialog
          form={form}
          setForm={setForm}
          isCreate={creating}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={submit}
          loading={createMut.isPending || updateMut.isPending}
          error={(createMut.error ?? updateMut.error) as Error | null}
          editingName={editing?.name ?? null}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          name={confirmDelete.name}
          loading={deleteMut.isPending}
          error={deleteMut.error as Error | null}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMut.mutate(confirmDelete.id)}
        />
      )}
    </>
  );
}

// ── Districts tab ─────────────────────────────────────────────────────────

function DistrictsTab({
  filterCityId,
  onChangeFilter,
}: {
  filterCityId: string;
  onChangeFilter: (id: string) => void;
}) {
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminListCities });
  const districts = useQuery({
    queryKey: ['admin', 'districts', filterCityId],
    queryFn: () => adminListDistricts(filterCityId || undefined),
  });

  const [editing, setEditing] = useState<District | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DistrictForm>(emptyDistrict());
  const [confirmDelete, setConfirmDelete] = useState<District | null>(null);

  const createMut = useMutation({
    mutationFn: adminCreateDistrict,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'districts'] });
      setCreating(false);
      setForm(emptyDistrict(filterCityId));
    },
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; body: AdminDistrictUpsert }) => adminUpdateDistrict(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'districts'] });
      setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: adminDeleteDistrict,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'districts'] });
      setConfirmDelete(null);
    },
  });

  function openCreate() {
    setForm(emptyDistrict(filterCityId || cities.data?.[0]?.id || ''));
    setCreating(true);
    setEditing(null);
  }

  function openEdit(d: District) {
    setForm({
      city_id: d.city_id,
      code: d.code,
      name: d.name,
      aliasesRaw: (d.aliases ?? []).join(', '),
      latitude: '',
      longitude: '',
      is_active: d.is_active,
    });
    setEditing(d);
    setCreating(false);
  }

  function submit() {
    if (creating) {
      createMut.mutate({
        ...buildDistrictPayload(form),
        city_id: form.city_id,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
      });
    } else if (editing) {
      updateMut.mutate({ id: editing.id, body: buildDistrictPayload(form) });
    }
  }

  const dialogOpen = creating || editing !== null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Lọc theo city:</label>
          <select
            value={filterCityId}
            onChange={(e) => onChangeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tất cả</option>
            {cities.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreate}
          disabled={!cities.data || cities.data.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-nook-olive text-white text-sm font-bold rounded-xl hover:bg-nook-olive/90 disabled:opacity-50"
        >
          <Plus size={16} /> Tạo district
        </button>
      </div>

      {districts.isLoading && <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="inline animate-spin mr-2" /> Đang tải...</div>}
      {districts.error instanceof Error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{districts.error.message}</div>}

      {districts.data && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Tên</th>
                <th className="text-left px-4 py-3">City</th>
                <th className="text-left px-4 py-3">Aliases</th>
                <th className="text-center px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {districts.data.map((d) => {
                const cityName = cities.data?.find((c) => c.id === d.city_id)?.name ?? '—';
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{d.code}</code></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                    <td className="px-4 py-3 text-slate-600">{cityName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {(d.aliases ?? []).slice(0, 5).join(', ')}
                      {(d.aliases ?? []).length > 5 && ` +${d.aliases.length - 5}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.is_active ? <Check size={16} className="inline text-emerald-500" /> : <X size={16} className="inline text-slate-300" />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-nook-olive hover:bg-nook-olive/10 rounded-lg">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(d)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {districts.data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Chưa có district nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <DistrictDialog
          form={form}
          setForm={setForm}
          isCreate={creating}
          cities={cities.data ?? []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={submit}
          loading={createMut.isPending || updateMut.isPending}
          error={(createMut.error ?? updateMut.error) as Error | null}
          editingName={editing?.name ?? null}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          name={confirmDelete.name}
          loading={deleteMut.isPending}
          error={deleteMut.error as Error | null}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMut.mutate(confirmDelete.id)}
        />
      )}
    </>
  );
}

// ── Shared dialogs ────────────────────────────────────────────────────────

function CityDialog({
  form, setForm, isCreate, onClose, onSubmit, loading, error, editingName,
}: {
  form: CityForm;
  setForm: (f: CityForm) => void;
  isCreate: boolean;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: Error | null;
  editingName: string | null;
}) {
  const submitDisabled = !form.name.trim() || (isCreate && !form.code.trim()) || loading;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{isCreate ? 'Tạo city mới' : `Sửa: ${editingName}`}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Code (UPPERCASE, không đổi sau tạo) *">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!isCreate}
              placeholder="HCM, HN, DN"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
            />
          </Field>
          <Field label="Tên *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hồ Chí Minh" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </Field>
          <Field label="Aliases (cách nhau bởi dấu phẩy)" hint="VD: hcm, tphcm, saigon, sg">
            <textarea rows={2} value={form.aliasesRaw} onChange={(e) => setForm({ ...form, aliasesRaw: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="10.7769" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </Field>
            <Field label="Longitude">
              <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="106.7009" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 rounded text-nook-olive" />
            <span className="text-sm font-medium">Active</span>
          </label>
          {error && <p className="text-sm text-red-500">{error.message}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500">Hủy</button>
          <button onClick={onSubmit} disabled={submitDisabled} className="px-5 py-2 text-sm font-bold text-white bg-nook-olive hover:bg-nook-olive/90 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isCreate ? 'Tạo' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DistrictDialog({
  form, setForm, isCreate, cities, onClose, onSubmit, loading, error, editingName,
}: {
  form: DistrictForm;
  setForm: (f: DistrictForm) => void;
  isCreate: boolean;
  cities: City[];
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: Error | null;
  editingName: string | null;
}) {
  const submitDisabled = !form.name.trim() || (isCreate && (!form.code.trim() || !form.city_id)) || loading;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{isCreate ? 'Tạo district mới' : `Sửa: ${editingName}`}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Thuộc city *">
            <select
              value={form.city_id}
              onChange={(e) => setForm({ ...form, city_id: e.target.value })}
              disabled={!isCreate}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
            >
              <option value="">— Chọn —</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Code (UPPERCASE, unique trong city, không đổi sau tạo) *">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!isCreate}
              placeholder="Q1, TD, HK"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
            />
          </Field>
          <Field label="Tên *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quận 1" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </Field>
          <Field label="Aliases (cách nhau bởi dấu phẩy)" hint="VD: q1, quan 1, district 1, d1">
            <textarea rows={2} value={form.aliasesRaw} onChange={(e) => setForm({ ...form, aliasesRaw: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude (centroid)">
              <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="10.7770" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </Field>
            <Field label="Longitude (centroid)">
              <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="106.7010" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 rounded text-nook-olive" />
            <span className="text-sm font-medium">Active</span>
          </label>
          {error && <p className="text-sm text-red-500">{error.message}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500">Hủy</button>
          <button onClick={onSubmit} disabled={submitDisabled} className="px-5 py-2 text-sm font-bold text-white bg-nook-olive hover:bg-nook-olive/90 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isCreate ? 'Tạo' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  name, loading, error, onCancel, onConfirm,
}: {
  name: string;
  loading: boolean;
  error: Error | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold">Xác nhận xóa?</h3>
        <p className="text-sm text-slate-500">
          Xóa <strong>{name}</strong> sẽ cascade — tất cả venue đang gán sẽ mất link city/district. Cân nhắc soft-deactivate thay vì xóa.
        </p>
        {error && <p className="text-sm text-red-500">{error.message}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-500">Hủy</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
