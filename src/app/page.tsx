"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { Sidebar } from "@/components/Sidebar";
import { LayoutEditor } from "@/components/LayoutEditor";
import { MemberCard } from "@/components/MemberCard";
import { Member, LayoutItem, HistoryMap, ColumnConfig, Table } from "@/lib/types";
import { ROOMS } from "@/lib/mock-data";
import { Users, Settings, Plus, LayoutGrid, FileText, Grid3X3, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PdfUploader } from "@/components/PdfUploader";
import { cn } from "@/lib/utils";


const GRID_SIZE = 24;
// snap must be defined at module level (or before getNextX) so it can be used in getNextX
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

export default function Home() {
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("main");
  const [currentYear, setCurrentYear] = useState<number>(2025);

  const [items, setItems] = useState<LayoutItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [historyMap, setHistoryMap] = useState<HistoryMap>({});

  // Refs to always have fresh state for async save callbacks
  const itemsRef = useRef<LayoutItem[]>([]);
  const tablesRef = useRef<Table[]>([]);
  const columnConfigsRef = useRef<ColumnConfig[]>([]);
  const currentYearRef = useRef<number>(2025);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { columnConfigsRef.current = columnConfigs; }, [columnConfigs]);
  useEffect(() => { currentYearRef.current = currentYear; }, [currentYear]);

  // Helper to calculate next column start
  const getNextX = (configs: ColumnConfig[]) => {
    if (configs.length === 0) return 100;
    const last = configs[configs.length - 1];
    return snap(last.xOffset + (last.seatsPerTable * 100) + 184);
  };

  const loadLayout = async () => {
    try {
      const res = await fetch(`/api/layout?year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTables(data.tables || []);
        setColumnConfigs(data.columns.length > 0 ? data.columns : [
          { id: "col1", seatsPerTable: 2, xOffset: 100 },
          { id: "col2", seatsPerTable: 3, xOffset: 484 }
        ]);
      }
    } catch (e) { console.error("Failed to load layout:", e); }
  };

  // saveLayout reads from refs to avoid stale closure — always saves the latest state
  const saveLayout = async () => {
    try {
      await fetch("/api/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: currentYearRef.current,
          items: itemsRef.current,
          tables: tablesRef.current,
          columns: columnConfigsRef.current
        })
      });
    } catch (e) { console.error("Failed to save layout:", e); }
  };

  // Load members from API
  const loadMembers = async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) setMembers(await res.json());
    } catch (e) { console.error(e); }
  };

  // Load history map from API
  const loadHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data: Array<{ year: number, seatId: string, seatLabel: string, displayName: string }> = await res.json();
        const map: HistoryMap = {};
        data.forEach(h => {
          // Key by seatId (unique per seat) — never by label which can be shared across rows
          if (!map[h.seatId]) map[h.seatId] = [];
          map[h.seatId].push({ year: h.year, displayName: h.displayName });
        });
        setHistoryMap(map);
      }
    } catch (e) { console.error(e); }
  };

  // Track year so we skip persisting once when year changes (until loadLayout state is applied)
  const previousYearRef = useRef<number | null>(null);

  useEffect(() => {
    loadMembers();
    loadLayout();
    loadHistory();
  }, [currentYear]);

  // Persist layout to server when items/tables/columnConfigs change (skip first run after year change)
  useEffect(() => {
    if (previousYearRef.current !== currentYear) {
      previousYearRef.current = currentYear;
      return;
    }
    const timer = setTimeout(saveLayout, 1000); // Debounce save
    return () => clearTimeout(timer);
  }, [currentYear, items, tables, columnConfigs]);




  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));


  // snap is defined at module level above

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMember(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    if (!activeData) return;

    if (over.id === "sidebar-dropzone") {
      if ("memberId" in activeData) {
        const item = activeData as unknown as LayoutItem;
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, memberId: undefined } : it));
      }
      return;
    }

    if (over.id.toString().startsWith("seat-")) {
      const targetId = over.id.toString().replace("seat-", "");
      if ("displayName" in activeData) {
        const member = activeData as unknown as Member;
        setItems(prev => prev.map(it => it.id === targetId ? { ...it, memberId: member.id } : (it.memberId === member.id ? { ...it, memberId: undefined } : it)));
      } else if ("memberId" in activeData) {
        const sourceItem = activeData as unknown as LayoutItem;
        if (!sourceItem.memberId) return;
        setItems(prev => {
          const target = prev.find(i => i.id === targetId);
          return prev.map(it => it.id === targetId ? { ...it, memberId: sourceItem.memberId } : (it.id === sourceItem.id ? { ...it, memberId: target?.memberId } : it));
        });
      }
    }

    if (over.id === "layout-editor") {
      const { x, y } = event.delta;
      const dX = snap(x);
      const dY = snap(y);

      if ("seatIds" in activeData) {
        const table = activeData as unknown as Table;
        // If the table is selected, move ALL selected tables
        const targets = selectedIds.has(table.id) ? tables.filter(t => selectedIds.has(t.id)) : [table];
        const targetIds = targets.map(t => t.id);
        const seatIds = targets.flatMap(t => t.seatIds);

        setTables(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, x: t.x + dX, y: t.y + dY } : t));
        setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, x: it.x + dX, y: it.y + dY } : it));
      } else if ("id" in activeData) {
        const item = activeData as unknown as LayoutItem;
        const targets = selectedIds.has(item.id) ? items.filter(i => selectedIds.has(i.id)) : [item];
        const targetIds = targets.map(i => i.id);
        setItems(prev => prev.map(i => targetIds.includes(i.id) ? { ...i, x: i.x + dX, y: i.y + dY } : i));
      }
    }
  };

  const addRow = () => {
    // Table container height is 144px (hardcoded in TableComponent).
    // Use tableY + 168 (144 table height + 24px gap) so rows have breathing room.
    const lY = tables.length > 0
      ? Math.max(...tables.map(t => t.y))
      : (items.length > 0 ? Math.max(...items.map(i => i.y)) - 44 : 0);
    const nY = snap(lY + 168);

    // Robust row number: find the max existing Row X and add 1
    const existingRowNums = tables.map(t => {
      const match = t.label.match(/Row (\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const rowNum = existingRowNums.length > 0 ? Math.max(...existingRowNums) + 1 : 1;

    const nTs: Table[] = [];
    const nSs: LayoutItem[] = [];

    columnConfigs.forEach((col) => {
      const tId = crypto.randomUUID();
      const sIds: string[] = [];
      const tX = snap(col.xOffset);
      const tSs: LayoutItem[] = Array.from({ length: col.seatsPerTable }).map((_, si) => {
        const sId = crypto.randomUUID();
        sIds.push(sId);
        return {
          id: sId,
          type: "seat" as const,
          label: `R${rowNum} ${col.id.toUpperCase()} S${si + 1}`,
          x: tX + (si * 100),
          y: nY + 44,
          roomId: activeRoomId,
          tableId: tId,
          columnId: col.id
        };
      });
      nTs.push({
        id: tId,
        label: `Row ${rowNum} - ${col.id.toUpperCase()}`,
        x: tX,
        y: nY,
        roomId: activeRoomId,
        columnId: col.id,
        seatIds: sIds
      });
      nSs.push(...tSs);
    });
    setTables(prev => [...prev, ...nTs]);
    setItems(prev => [...prev, ...nSs]);
  };

  const addColumn = () => {
    const cCount = prompt("Seats per table for this column?", "2") || "2";
    const seats = parseInt(cCount);
    if (isNaN(seats) || seats < 1) return;

    // Use max existing col number +1 so stale DB configs don't skew the counter
    const maxColNum = columnConfigs.reduce((max, c) => {
      const n = parseInt(c.id.replace("col", ""));
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newColId = `col${maxColNum + 1}`;
    const newXOffset = getNextX(columnConfigs);
    const newCol: ColumnConfig = { id: newColId, seatsPerTable: seats, xOffset: newXOffset };

    // If there are no existing rows, just register the column config.
    // Future "Add Row" calls will include this column automatically.
    if (tables.length === 0) {
      setColumnConfigs(prev => [...prev, newCol]);
      return;
    }

    setColumnConfigs(prev => [...prev, newCol]);

    // Retroactively add a table for this column at each existing row y-position
    const existingTableYs = Array.from(new Set(tables.map(t => t.y))).sort((a, b) => a - b);
    const nTs: Table[] = [];
    const nSs: LayoutItem[] = [];
    const now = Date.now();

    existingTableYs.forEach((tableY) => {
      // Find row number for this Y
      const rowTable = tables.find(t => Math.abs(t.y - tableY) < 10);
      const rowNumMatch = rowTable?.label.match(/Row (\d+)/);
      const rowNum = rowNumMatch ? rowNumMatch[1] : "?";

      const tableId = crypto.randomUUID();
      const sIds: string[] = [];

      const tableSeats: LayoutItem[] = Array.from({ length: seats }).map((_, si) => {
        const sId = crypto.randomUUID();
        sIds.push(sId);
        return {
          id: sId,
          type: "seat" as const,
          label: `R${rowNum} ${newColId.toUpperCase()} S${si + 1}`,
          x: newXOffset + (si * 100),
          y: tableY + 44,
          roomId: activeRoomId,
          tableId: tableId,
          columnId: newColId
        };
      });

      nTs.push({
        id: tableId,
        label: `Row ${rowNum} - ${newColId.toUpperCase()}`,
        x: newXOffset,
        y: tableY,
        roomId: activeRoomId,
        columnId: newColId,
        seatIds: sIds
      });

      nSs.push(...tableSeats);
    });

    setTables(prev => [...prev, ...nTs]);
    setItems(prev => [...prev, ...nSs]);
  };

  const addObj = () => setItems([...items, { id: `obj-${Date.now()}`, type: "object", label: "Object", x: snap(50), y: snap(50), roomId: activeRoomId }]);

  const moveRow = (rowY: number, deltaY: number) => {
    const rowTables = tables.filter(t => Math.abs(t.y - rowY) < 10);
    const seatIds = rowTables.flatMap(t => t.seatIds);

    setTables(prev => prev.map(t => Math.abs(t.y - rowY) < 10 ? { ...t, y: snap(t.y + deltaY) } : t));
    setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, y: snap(it.y + deltaY) } : it));
  };

  const moveColumn = (columnId: string, deltaX: number) => {
    const colTables = tables.filter(t => t.columnId === columnId);
    const seatIds = colTables.flatMap(t => t.seatIds);

    // Update the config too so future rows follow
    setColumnConfigs(prev => prev.map(c => c.id === columnId ? { ...c, xOffset: snap(c.xOffset + deltaX) } : c));

    setTables(prev => prev.map(t => t.columnId === columnId ? { ...t, x: snap(t.x + deltaX) } : t));
    setItems(prev => prev.map(it => seatIds.includes(it.id) ? { ...it, x: snap(it.x + deltaX) } : it));
  };

  const clear = async () => {
    if (confirm("Clear layout for this year?")) {
      setItems([]);
      setTables([]);
      setColumnConfigs([]);

      try {
        await fetch("/api/layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: currentYear,
            items: [],
            tables: [],
            columns: []
          })
        });
      } catch (e) { console.error("Failed to clear layout on server:", e); }
    }
  };

  const updateItemLabel = (id: string, label: string) => setItems(prev => prev.map(it => it.id === id ? { ...it, label } : it));
  const deleteItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const handleAssignPdfResults = (lines: string[]) => {
    // PDF lines are in "Name | Name | Name" format from our spatial parser
    // We try to match them to the current grid (Row X, Col Y)
    const newItems = [...items];

    // Sort tables by Y then X to get a grid order
    const gridTables = [...tables].sort((a, b) => a.y - b.y || a.x - b.x);

    // Group into rows
    const tableRows: Table[][] = [];
    gridTables.forEach(t => {
      const row = tableRows.find(r => Math.abs(r[0].y - t.y) < 20);
      if (row) row.push(t);
      else tableRows.push([t]);
    });

    tableRows.forEach((row, ri) => {
      if (ri >= lines.length) return;
      const pdfCells = lines[ri].split("|").map(s => s.trim());
      row.sort((a, b) => a.x - b.x).forEach((table, ci) => {
        if (ci >= pdfCells.length) return;
        const cellText = pdfCells[ci];

        // Some cells might contain multiple names separated by common delimiters
        const names = cellText.split(/[,&]|\s{2,}/).map(n => n.trim()).filter(Boolean);

        names.forEach((name, ni) => {
          if (ni >= table.seatIds.length) return;

          const member = members.find(m =>
            m.displayName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(m.displayName.toLowerCase())
          );

          if (member) {
            const sId = table.seatIds[ni];
            const idx = newItems.findIndex(it => it.id === sId);
            if (idx !== -1) newItems[idx].memberId = member.id;
          }
        });
      });
    });

    setItems(newItems);
    setShowPdfUploader(false);
  };

  const deleteTable = (tableId: string) => {
    if (confirm("Delete this table and its seats?")) {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;
      setTables(prev => prev.filter(t => t.id !== tableId));
      setItems(prev => prev.filter(it => !table.seatIds.includes(it.id)));
    }
  };

  const updateColumnSeats = (columnId: string, seats: number) => {
    const targetIdx = columnConfigs.findIndex(c => c.id === columnId);
    if (targetIdx === -1) return;

    const newConfigs = [...columnConfigs];
    newConfigs[targetIdx] = { ...newConfigs[targetIdx], seatsPerTable: seats };

    for (let i = targetIdx + 1; i < newConfigs.length; i++) {
      const prevCol = newConfigs[i - 1];
      newConfigs[i] = { ...newConfigs[i], xOffset: snap(prevCol.xOffset + (prevCol.seatsPerTable * 100) + 184) };
    }

    const newTables: Table[] = [];
    const itemsToRemove = new Set<string>();
    const newSeats: LayoutItem[] = [];
    const tableDx = new Map<string, number>();

    tables.forEach(table => {
      const config = newConfigs.find(c => c.id === table.columnId);
      if (!config) {
        newTables.push(table);
        return;
      }
      const tableX = config.xOffset;
      const dX = tableX - table.x;
      if (dX !== 0) tableDx.set(table.id, dX);

      if (table.columnId === columnId) {
        const oldSeatIds = table.seatIds;
        const oldSeats = items.filter(it => oldSeatIds.includes(it.id));
        const newSeatIds = Array.from({ length: seats }).map((_, i) => i < oldSeatIds.length ? oldSeatIds[i] : crypto.randomUUID());

        // Mark seats to remove only if they are beyond the new count
        oldSeatIds.slice(seats).forEach(id => itemsToRemove.add(id));

        newSeatIds.forEach((sId, si) => {
          const existingSeat = oldSeats.find(s => s.id === sId);
          newSeats.push({
            id: sId,
            type: "seat",
            label: existingSeat?.label || `${columnId.toUpperCase()} - S${si + 1}`,
            x: tableX + (si * 100),
            y: table.y + 44,
            roomId: activeRoomId,
            tableId: table.id,
            columnId: columnId,
            memberId: existingSeat?.memberId
          });
        });
        newTables.push({ ...table, x: tableX, seatIds: newSeatIds });
      } else {
        newTables.push({ ...table, x: tableX });
      }
    });

    setColumnConfigs(newConfigs);
    setTables(newTables);
    setItems(prev => {
      const filtered = prev.filter(it => !itemsToRemove.has(it.id));
      const withNewSeats = [...filtered, ...newSeats];
      return withNewSeats.map(it => {
        const dX = it.tableId ? tableDx.get(it.tableId) : undefined;
        if (dX !== undefined) return { ...it, x: it.x + dX };
        return it;
      });
    });
  };

  const seatedIds = useMemo(() => new Set(items.map(i => i.memberId).filter(Boolean)), [items]);
  const unseated = members.filter(m => !seatedIds.has(m.id));
  const rItems = items.filter(it => it.roomId === activeRoomId);
  const rTables = tables.filter(t => t.roomId === activeRoomId);

  return (
    <DndContext sensors={sensors} onDragStart={e => {
      if (e.active.data.current && "displayName" in e.active.data.current) {
        setActiveMember(e.active.data.current as unknown as Member);
      }
    }} onDragEnd={handleDragEnd}>
      <main className="flex h-screen bg-[#f1f5f9] overflow-hidden text-slate-800">
        <nav className="w-16 h-full bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400">
          <Link href="/" className="p-2 transition-colors text-white ring-2 ring-blue-500 rounded-xl"><LayoutGrid className="w-6 h-6" /></Link>
          <Link href="/members" className="p-2 hover:text-white transition-colors"><Users className="w-6 h-6" /></Link>
          <div className="mt-auto p-2 text-slate-600 hover:text-white transition-colors cursor-pointer group relative">
            <Settings className="w-6 h-6" />
          </div>
        </nav>
        <Sidebar
          members={unseated}
          rooms={ROOMS}
          selectedRoomId={activeRoomId}
          onRoomChange={setActiveRoomId}
          columnConfigs={columnConfigs}
          onUpdateColumnSeats={updateColumnSeats}
        />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-sm z-10 transition-all">
            <div className="flex flex-col">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Seating Dashboard</h1>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                  <span className="px-3 py-1 text-xs font-bold text-slate-700 w-12 text-center">{currentYear}</span>
                  <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Room: {ROOMS.find(r => r.id === activeRoomId)?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addObj} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">+ Object</button>
              <button onClick={addColumn} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"><Grid3X3 className="w-4 h-4" />+ Column</button>
              <button onClick={addRow} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2"><Plus className="w-4 h-4" />Add Row</button>
              <div className="w-[1px] h-8 bg-slate-200 mx-2" />
              <button onClick={() => setShowPdfUploader(!showPdfUploader)} className={cn("p-2.5 border rounded-xl shadow-sm", showPdfUploader ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200")} title="Import PDF"><FileText className="w-5 h-5" /></button>
              <button onClick={clear} className="p-2.5 border border-red-100 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm" title="Clear Layout"><Trash2 className="w-5 h-5" /></button>
            </div>
          </header>
          {showPdfUploader && <div className="px-8 pt-8 shrink-0 bg-[#f1f5f9]"><PdfUploader onAssign={handleAssignPdfResults} /></div>}
          <LayoutEditor
            items={rItems}
            tables={rTables}
            members={members}
            historyMap={historyMap}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onUpdateLabel={updateItemLabel}
            onDeleteItem={deleteItem}
            onDeleteTable={deleteTable}
            onUpdateColumnSeats={updateColumnSeats}
            onMoveRow={moveRow}
            onMoveColumn={moveColumn}
          />
        </div>
        <DragOverlay>{activeMember && <div className="w-64 rotate-3 scale-110 pointer-events-none drop-shadow-2xl"><MemberCard member={activeMember} isDragging /></div>}</DragOverlay>
      </main>
    </DndContext>
  );
}
