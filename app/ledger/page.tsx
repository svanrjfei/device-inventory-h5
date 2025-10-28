"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeviceDTO } from "@/lib/types";
import { devicesApi } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, User, RefreshCw, SortAsc, SortDesc, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/header";

type SortKey = "updatedAt" | "name" | "status" | "missing";

const PAGE_SIZE = 10;

export default function LedgerPage() {
  const [sort, setSort] = useState<SortKey>("updatedAt");
  const [asc, setAsc] = useState(false);
  const [source, setSource] = useState<DeviceDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [missingFilter, setMissingFilter] = useState<'all'|'missing'|'not'>('all');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // restore missing dialog
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreDevice, setRestoreDevice] = useState<DeviceDTO | null>(null);
  const [restoreLocation, setRestoreLocation] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);
  // draft values for drawer (apply-on-confirm)
  const [draftSort, setDraftSort] = useState<SortKey>("updatedAt");
  const [draftAsc, setDraftAsc] = useState(false);
  const [draftLocation, setDraftLocation] = useState<string>('ALL');
  const [draftMissing, setDraftMissing] = useState<'all'|'missing'|'not'>('all');

  // pull-to-refresh states
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const [pull, setPull] = useState(0); // pixels
  const PULL_THRESHOLD = 60;

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const d of source) set.add(d.location ?? '__NULL__');
    return Array.from(set);
  }, [source]);

  const filtered = useMemo(() => {
    let arr = [...source];
    if (locationFilter !== 'ALL') {
      const key = locationFilter === '__NULL__' ? null : locationFilter;
      arr = arr.filter((d) => (key === null ? d.location == null : d.location === key));
    }
    if (missingFilter !== 'all') {
      const want = missingFilter === 'missing';
      arr = arr.filter((d) => d.missing === want);
    }
    return arr;
  }, [source, locationFilter, missingFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: any = (a as any)[sort];
      let vb: any = (b as any)[sort];
      if (sort === "updatedAt") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      }
      if (va === vb) return 0;
      return va > vb ? (asc ? 1 : -1) : asc ? -1 : 1;
    });
    return arr;
  }, [filtered, sort, asc]);

  const displayed = useMemo(() => {
    return sorted.slice(0, page * PAGE_SIZE);
  }, [sorted, page]);

  const canLoadMore = displayed.length < sorted.length;

  const reload = useCallback(async () => {
    setRefreshing(true);
    const params: any = { sort: (sort + ':' + (asc ? 'asc' : 'desc')), offset: 0, limit: PAGE_SIZE };
    if (missingFilter !== 'all') params.missing = String(missingFilter === 'missing');
    const { items, total } = await devicesApi.list(params);
    setSource(items);
    setTotal(total);
    setPage(1);
    setRefreshing(false);
  }, [sort, asc, missingFilter]);

  const loadMore = useCallback(async () => {
    if (!canLoadMore || loadingMore) return;
    setLoadingMore(true);
    const params: any = { sort: (sort + ':' + (asc ? 'asc' : 'desc')), offset: source.length, limit: PAGE_SIZE };
    if (missingFilter !== 'all') params.missing = String(missingFilter === 'missing');
    const { items } = await devicesApi.list(params);
    setSource((prev) => [...prev, ...items]);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [canLoadMore, loadingMore, source.length, sort, asc, missingFilter]);

  async function toggleMissing(id: number) {
    const updated = await devicesApi.patch(id, { missing: true });
    setSource((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  function openRestore(dev: DeviceDTO) {
    setRestoreDevice(dev);
    setRestoreLocation(dev.location ?? "");
    setRestoreOpen(true);
  }

  async function submitRestore() {
    if (!restoreDevice) return;
    const updated = await devicesApi.patch(restoreDevice.id, { missing: false, location: restoreLocation || null });
    setSource((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setRestoreOpen(false);
    setRestoreDevice(null);
  }

  // Infinite scroll handler
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMore();
    }
  }

  // Pull to refresh handlers
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    startY.current = e.touches[0].clientY;
    startScrollTop.current = el.scrollTop;
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const dy = e.touches[0].clientY - startY.current;
    const atTop = el.scrollTop <= 0 && startScrollTop.current <= 0;
    if (dy > 0 && atTop && !refreshing) {
      e.preventDefault();
      const dist = Math.min(120, dy * 0.6);
      setPull(dist);
    }
  }
  function onTouchEnd() {
    if (pull >= PULL_THRESHOLD) {
      setPull(0);
      reload();
    } else {
      setPull(0);
    }
  }

  // When opening drawer, sync drafts from current values
  useEffect(() => {
    if (drawerOpen) {
      setDraftSort(sort);
      setDraftAsc(asc);
      setDraftLocation(locationFilter);
      setDraftMissing(missingFilter);
    }
  }, [drawerOpen]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-xl px-0 min-h-[100dvh] flex flex-col">
      <PageHeader
        title="设备台账"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal size={16} />
              <span className="ml-1">排序与筛选</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={reload}>
              <RefreshCw size={16} className={cn(refreshing && "animate-spin")} /> 刷新
            </Button>
          </>
        }
        className="shrink-0"
      />

      {/* 顶部抽屉：仅在客户端且打开时渲染，避免 SSR/CSR 数据不一致导致的 hydration 报错 */}
      {mounted && drawerOpen && (
        <div className={cn('fixed inset-x-0 top-0 z-40')}>
          {/* 遮罩层 */}
          <div className='fixed inset-0 bg-black/30' onClick={() => setDrawerOpen(false)} />
          {/* 抽屉面板 */}
          <div className='mx-auto max-w-xl rounded-b-2xl border-b bg-white shadow-lg'>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-medium">排序与筛选</div>
              <button className="rounded-md p-1 hover:bg-neutral-100" onClick={() => setDrawerOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* 排序 */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-xs text-neutral-600">排序字段</span>
                <select
                  value={draftSort}
                  onChange={(e) => setDraftSort(e.target.value as SortKey)}
                  className="h-9 w-56 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="updatedAt">最近更新</option>
                  <option value="name">名称</option>
                  <option value="status">状态</option>
                  <option value="missing">是否缺失</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setDraftAsc((v) => !v)} aria-label="切换升降序">
                  {draftAsc ? <SortAsc size={16} /> : <SortDesc size={16} />}
                </Button>
              </div>

              {/* 位置筛选 */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-xs text-neutral-600">存放位置</span>
                <select
                  value={draftLocation}
                  onChange={(e) => setDraftLocation(e.target.value)}
                  className="h-9 w-56 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="ALL">全部</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === '__NULL__' ? '未知' : loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* 缺失筛选 */}
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-xs text-neutral-600">缺失</span>
                <select
                  value={draftMissing}
                  onChange={(e) => setDraftMissing(e.target.value as any)}
                  className="h-9 w-56 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="all">全部</option>
                  <option value="missing">是</option>
                  <option value="not">否</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDraftSort('updatedAt'); setDraftAsc(false); setDraftLocation('ALL'); setDraftMissing('all'); }}
                >重置</Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSort(draftSort);
                    setAsc(draftAsc);
                    setLocationFilter(draftLocation);
                    setMissingFilter(draftMissing);
                    setPage(1);
                    setDrawerOpen(false);
                  }}
                >应用</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Container with Pull-to-Refresh: 仅在客户端挂载后渲染，避免 SSR 与 localStorage 差异引起的 hydration */}
      {mounted ? (
        <div
          ref={scrollRef}
          className="mt-3 flex-1 overflow-y-auto px-4 pb-28"
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}
        >
          {/* Pull indicator */}
          <div
            className="flex items-center justify-center text-xs text-neutral-500"
            style={{ height: pull, transition: pull === 0 ? 'height 150ms ease-out' : undefined }}
          >
            {pull >= PULL_THRESHOLD ? '释放刷新' : pull > 0 ? '下拉刷新' : null}
          </div>

          <div className="space-y-3" style={{ transform: `translateY(${pull}px)`, transition: pull === 0 ? 'transform 150ms ease-out' : undefined }}>
            {displayed.map((d) => (
              <DeviceCard
                key={d.id}
                d={d}
                onRestore={openRestore}
                onMarkMissing={(id) => toggleMissing(id)}
              />
            ))}
            {loadingMore && (
              <div className="py-4 text-center text-xs text-neutral-500">加载中…</div>
            )}
            {!canLoadMore && (
              <div className="py-4 text-center text-xs text-neutral-400">没有更多了</div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 text-xs text-neutral-400">加载中…</div>
      )}

      {/* 恢复为非缺失时的位置信息弹窗 */}
      {restoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setRestoreOpen(false)} />
          {/* panel */}
          <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg p-4 mx-auto">
            <div className="mb-2 text-base font-medium">更新存放位置</div>
            <div className="text-xs text-neutral-500 mb-3">
              {restoreDevice?.name} <span className="text-neutral-400">({restoreDevice?.code})</span>
            </div>
            <label className="block text-sm text-neutral-700 mb-1">存放位置</label>
            <input
              value={restoreLocation}
              onChange={(e) => setRestoreLocation(e.target.value)}
              placeholder="请输入设备当前的存放位置"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRestoreOpen(false)}>取消</Button>
              <Button size="sm" onClick={submitRestore}>提交</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceCard({ d, onRestore, onMarkMissing }: { d: DeviceDTO; onRestore: (dev: DeviceDTO) => void; onMarkMissing: (id: number) => void }) {
  return (
    <Card
      className="overflow-hidden cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        window.location.href = `/devices/${d.id}`;
      }}
    >
      <CardHeader className="bg-gradient-to-r from-neutral-50 to-white">
        <div className="flex items-center justify-between">
          <div className="text-base font-medium hover:underline">
            {d.name}
            <span className="ml-2 text-xs text-neutral-500">{d.code}</span>
          </div>
          <span className={cn(
            "text-[11px] rounded-full px-2 py-0.5 border",
            d.status === '在用' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
            d.status === '闲置' ? 'border-amber-300 text-amber-700 bg-amber-50' :
            'border-neutral-300 text-neutral-700 bg-neutral-50'
          )}>{d.status}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-1 flex items-center text-sm text-neutral-700">
          <MapPin size={16} className="mr-1.5 text-neutral-400" />
          <span className="truncate">{d.location ?? '—'}</span>
        </div>
        <div className="mt-1 flex items-center text-sm text-neutral-700">
          <User size={16} className="mr-1.5 text-neutral-400" />
          <span>{d.keeper ?? '—'}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-neutral-600 flex items-center gap-1">
            <AlertTriangle size={16} className={cn(d.missing ? 'text-red-500' : 'text-neutral-400')} />
            缺失：{d.missing ? '是' : '否'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); d.missing ? onRestore(d) : onMarkMissing(d.id); }}
          >
            {d.missing ? '非缺失' : '缺失'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
