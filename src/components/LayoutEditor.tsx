"use client";

import { LayoutItem, Member, HistoryMap, Table } from "@/lib/types";
import { LayoutItemComponent } from "./LayoutItemComponent";
import { TableComponent } from "./TableComponent";
import { useDroppable } from "@dnd-kit/core";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface LayoutEditorProps {
    items: LayoutItem[];
    tables: Table[];
    members: Member[];
    historyMap: HistoryMap;
    onUpdateLabel: (id: string, label: string) => void;
    onDeleteItem: (id: string) => void;
    onDeleteTable: (id: string) => void;
    onUpdateColumnSeats: (columnId: string, seats: number) => void;
    selectedIds: Set<string>;
    onToggleSelect: (id: string, multi: boolean) => void;
    onMoveRow: (rowY: number, deltaY: number) => void;
    onMoveColumn: (columnId: string, deltaX: number) => void;
}

export function LayoutEditor({
    items,
    tables,
    members,
    historyMap,
    selectedIds,
    onToggleSelect,
    onUpdateLabel,
    onDeleteItem,
    onDeleteTable,
    onUpdateColumnSeats,
    onMoveRow,
    onMoveColumn
}: LayoutEditorProps) {
    const { setNodeRef } = useDroppable({
        id: "layout-editor",
    });

    const rows = Array.from(new Set(tables.map(t => t.y))).sort((a, b) => a - b);
    const cols = Array.from(new Set(tables.map(t => t.columnId))).sort();

    return (
        <div
            ref={setNodeRef}
            id="layout-editor-viewport"
            className="flex-1 relative overflow-auto bg-[#f8fafc] p-24 min-h-[1000px] border-l border-slate-200"
        >
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

            <div className="relative">
                {/* Row Movement Handles */}
                {rows.map(y => (
                    <div
                        key={y}
                        className="absolute -left-16 flex items-center gap-1 group pointer-events-auto"
                        style={{ top: `${y + 60}px` }}
                    >
                        <button
                            onClick={() => onMoveRow(y, -24)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 group-hover:text-slate-900"
                        ><ArrowUp className="w-3 h-3" /></button>
                        <button
                            onClick={() => onMoveRow(y, 24)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 group-hover:text-slate-900"
                        ><ArrowDown className="w-3 h-3" /></button>
                    </div>
                ))}

                {/* Column Movement Handles */}
                {tables.filter((t, i, self) => self.findIndex(tx => tx.columnId === t.columnId) === i).map(col => (
                    <div
                        key={col.columnId}
                        className="absolute flex items-center gap-1 group pointer-events-auto"
                        style={{ left: `${col.x + 20}px`, top: `-64px` }}
                    >
                        <button
                            onClick={() => onMoveColumn(col.columnId, -24)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 group-hover:text-slate-900"
                        ><ArrowLeft className="w-3 h-3" /></button>
                        <button
                            onClick={() => onMoveColumn(col.columnId, 24)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 group-hover:text-slate-900"
                        ><ArrowRight className="w-3 h-3" /></button>
                    </div>
                ))}

                {/* Render Tables */}
                {tables.map((table) => (
                    <TableComponent
                        key={table.id}
                        table={table}
                        selected={selectedIds.has(table.id)}
                        onSelect={(multi: boolean) => onToggleSelect(table.id, multi)}
                        onDelete={() => onDeleteTable(table.id)}
                    />
                ))}

                {/* Render Items (Seats and Objects) */}
                {items.map((item) => {
                    const occupant = members.find((m) => m.id === item.memberId);
                    return (
                        <LayoutItemComponent
                            key={item.id}
                            item={item}
                            occupant={occupant}
                            history={historyMap[item.id]}
                            selected={selectedIds.has(item.id)}
                            onSelect={(multi: boolean) => onToggleSelect(item.id, multi)}
                            onUpdateLabel={onUpdateLabel}
                            onDeleteItem={onDeleteItem}
                        />
                    );
                })}
            </div>

            {items.length === 0 && tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-slate-400">
                    <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-sm text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                            <Grid3X3 className="w-8 h-8 text-blue-500 opacity-40" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">Workspace is ready!</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Start by adding a row to create your grid. You can also import a previous year's layout from a PDF.
                        </p>
                        <div className="mt-6 flex flex-col gap-2 w-full">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quick Start</div>
                            <div className="flex gap-2 justify-center">
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">1. Add Row</span>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">2. Drag Members</span>
                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">3. Save</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icon helper since lucide-react might not be imported in sub-components easily
function Grid3X3({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
    );
}
