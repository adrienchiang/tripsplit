'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2, ChevronRight, Globe, Users, MapPin } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import Link from 'next/link';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const trip = useTripStore((s) => s.getTripById(tripId));
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const updateTrip = useTripStore((s) => s.updateTrip);

  const [name, setName] = useState(trip?.name ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [saved, setSaved] = useState(false);

  if (!trip) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    updateTrip(tripId, { name: name.trim(), destination: destination.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleDelete = () => {
    if (confirm('確定刪除此旅行？所有支出記錄將一併刪除，此操作不可撤銷。')) {
      deleteTrip(tripId);
      router.push('/');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="旅行設定" back backHref={`/trip/${tripId}`} />

      <div className="space-y-4">
        {/* Basic info */}
        <div className="card p-4 space-y-4">
          <p className="section-title">基本資料</p>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">旅行名稱</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-charcoal-400 mb-1.5 block">目的地</label>
            <input
              className="input-field"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            className="btn-primary w-full py-3"
          >
            {saved ? '已儲存 ✓' : '儲存更改'}
          </button>
        </div>

        {/* Quick links */}
        <div className="card divide-y divide-charcoal-800">
          <Link
            href={`/trip/${tripId}/currency`}
            className="flex items-center gap-3 p-4 hover:bg-charcoal-800 transition-colors rounded-t-xl"
          >
            <Globe className="w-5 h-5 text-charcoal-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">匯率設定</p>
              <p className="text-xs text-charcoal-500">管理外幣換算匯率</p>
            </div>
            <ChevronRight className="w-4 h-4 text-charcoal-600" />
          </Link>
          <div className="flex items-center gap-3 p-4">
            <Users className="w-5 h-5 text-charcoal-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">成員</p>
              <p className="text-xs text-charcoal-500">{trip.members.length} 位成員</p>
            </div>
            <span className="text-xs text-charcoal-600">
              {trip.members.map((m) => m.name).join('、')}
            </span>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-b-xl">
            <MapPin className="w-5 h-5 text-charcoal-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">旅行數據</p>
              <p className="text-xs text-charcoal-500">{trip.expenses.length} 筆支出記錄</p>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="card p-4">
          <p className="section-title mb-3">關於</p>
          <div className="space-y-1 text-xs text-charcoal-500">
            <p>TripSplit 旅費分賬 v0.1.0</p>
            <p>資料儲存於本機 localStorage</p>
            <p>計算邏輯：最少交易次數演算法</p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card p-4 border border-red-900/50">
          <p className="section-title text-red-500 mb-3">危險操作</p>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full py-3 px-4 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-xl text-red-400 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            刪除此旅行
          </button>
          <p className="text-xs text-charcoal-600 mt-2">刪除後無法復原，所有支出記錄將一併刪除</p>
        </div>
      </div>
    </div>
  );
}
