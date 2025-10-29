"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeviceDTO } from "@/lib/types";
import { devicesApi } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, User, RefreshCw, SortAsc, SortDesc, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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
  // 位置选项（从数据库分页获取）
  const [locItems, setLocItems] = useState<string[]>([]);
  const [locTotal, setLocTotal] = useState(0);
  const [locHasNull, setLocHasNull] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // pull-to-refresh states
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const [pull, setPull] = useState(0); // pixels
  const PULL_THRESHOLD = 60;
  const loadingRef = useRef(false);
  const lastKeyRef = useRef<string>("");

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  // 直接展示服务端返回的集合
  const displayed = sorted;

  const reload = useCallback(async () => {
    const key = `${sort}|${asc}|${missingFilter}|${locationFilter}|${page}`;
    if (loadingRef.current) return;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    loadingRef.current = true;
    setRefreshing(true);
    const params: any = { sort: (sort + ':' + (asc ? 'asc' : 'desc')), offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
    if (missingFilter !== 'all') params.missing = String(missingFilter === 'missing');
    if (locationFilter && locationFilter !== 'ALL') params.location = locationFilter;
    try {
      const { items, total } = await devicesApi.list(params);
      setSource(items);
      setTotal(total);
      setRefreshing(false);
    } catch (e) {
      setRefreshing(false);
      toast.error("加载失败");
    } finally {
      loadingRef.current = false;
    }
  }, [sort, asc, missingFilter, locationFilter, page]);

  // 移除 loadMore（使用分页）

  async function toggleMissing(id: number) {
    toast.promise(
      devicesApi.patch(id, { missing: true }).then((updated) => {
        setSource((prev) => prev.map((d) => (d.id === id ? updated : d)));
        return updated;
      }),
      { loading: "更新中…", success: "已设为缺失", error: "更新失败" }
    );
  }

  async function removeOne(id: number) {
    try {
      const ok = window.confirm('确定删除该设备？此操作不可撤销。');
      if (!ok) return;
    } catch {}
    toast.promise(
      devicesApi.remove(id).then(() => {
        setSource((prev) => prev.filter((d) => d.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      }),
      { loading: '删除中…', success: '已删除', error: '删除失败' }
    );
  }

  function openRestore(dev: DeviceDTO) {
    setRestoreDevice(dev);
    setRestoreLocation(dev.location ?? "");
    setRestoreOpen(true);
  }

  async function submitRestore() {
    if (!restoreDevice) return;
    toast.promise(
      devicesApi.patch(restoreDevice.id, { missing: false, location: restoreLocation || null }).then((updated) => {
        setSource((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setRestoreOpen(false);
        setRestoreDevice(null);
        return updated;
      }),
      { loading: "更新中…", success: "已设为非缺失", error: "更新失败" }
    );
  }

  // 不再使用下滑加载
  function onScroll(_e: React.UIEvent<HTMLDivElement>) {}

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
      // 初次打开时加载位置选项
      if (locItems.length === 0 && !locLoading) {
        (async () => {
          setLocLoading(true);
          const { items, total, hasNull } = await devicesApi.locations({ offset: 0, limit: 30 });
          setLocItems(items);
          setLocTotal(total);
          setLocHasNull(hasNull);
          setLocLoading(false);
        })();
      }
    }
  }, [drawerOpen]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 移除 IntersectionObserver 逻辑（统一使用分页）

  return (
    <div className="mx-auto max-w-xl px-0 min-h-[100dvh] flex flex-col">
      <PageHeader title={"\u8BBE\u5907\u53F0\u8D26"} className="shrink-0 pb-1" />
      <div className="px-4 -mt-1 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          <SlidersHorizontal size={16} />
          <span className="ml-1">{"\u6392\u5E8F\u4E0E\u7B5B\u9009"}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw size={16} className={cn(refreshing && "animate-spin")} /> {"\u5237\u65B0"}
        </Button>
      </div>
      {/* 顶部抽屉：仅在客户端且打开时渲染，避免 SSR/CSR 数据不一致导致的 hydration 报错 */}
      {mounted && drawerOpen && (
        <div className={cn('fixed inset-x-0 top-0 z-50')}>
          {/* 遮罩层（位于面板之下） */}
          <div className='fixed inset-0 bg-black/30 z-40' onClick={() => setDrawerOpen(false)} />
          {/* 抽屉面板（确保在遮罩之上） */}
          <div className='relative z-50 mx-auto max-w-xl rounded-b-2xl border-b bg-white shadow-lg'>
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
              <Select value={draftLocation} onValueChange={setDraftLocation}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="选择位置" />
                </SelectTrigger>
                <SelectContent onViewportScroll={async (e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
                  const loaded = locItems.length;
                  if (nearBottom && !locLoading && loaded < locTotal) {
                    setLocLoading(true);
                    const { items } = await devicesApi.locations({ offset: loaded, limit: 30 });
                    setLocItems((prev) => [...prev, ...items.filter((it) => !prev.includes(it))]);
                    setLocLoading(false);
                  }
                }}>
                  <SelectItem value="ALL">全部</SelectItem>
                  {locHasNull && <SelectItem value="__NULL__">未知</SelectItem>}
                  {locItems.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                  {locLoading && <div className="px-2 py-1 text-xs text-neutral-500">加载中…</div>}
                  {locItems.length >= locTotal && <div className="px-2 py-1 text-xs text-neutral-400">没有更多了</div>}
                </SelectContent>
              </Select>
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
                onDelete={(id) => removeOne(id)}
              />
            ))}
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

      {/* 底部分页浮层（位于 TabBar 之上） */}
      <div className="fixed left-0 right-0 z-40" style={{ bottom: '72px' }}>
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-full border bg-white/95 backdrop-blur shadow px-3 py-2 flex items-center justify-between text-xs text-neutral-700">
            <span>共 {total} 条 · 第 {page} / {pageCount} 页</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >上一页</Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >下一页</Button>
            </div>
          </div>
        </div>
      </div>
      {/* 新增设备浮动按钮 */}
      <div className="fixed right-4 z-50" style={{ bottom: '128px' }}>
        <a href="/devices/new">
          <Button size="lg" className="rounded-full h-12 w-12 p-0 text-xl">+</Button>
        </a>
      </div>
    </div>
  );
}

function DeviceCard({ d, onRestore, onMarkMissing, onDelete }: { d: DeviceDTO; onRestore: (dev: DeviceDTO) => void; onMarkMissing: (id: number) => void; onDelete: (id: number) => void }) {
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
        <div className="mt-3 flex items-center">
          <div className="text-sm text-neutral-600 flex items-center gap-1">
            <AlertTriangle size={16} className={cn(d.missing ? 'text-red-500' : 'text-neutral-400')} />
            {"\u7F3A\u5931"}: {d.missing ? "\u662F" : "\u5426"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); d.missing ? onRestore(d) : onMarkMissing(d.id); }}
            >
              {d.missing ? "\u590D\u539F" : "\u7F3A\u5931"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
            >
              {"\u5220\u9664"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




