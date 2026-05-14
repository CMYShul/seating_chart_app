"use client";

import { useDraggable } from "@dnd-kit/core";
import { Table } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Move, Trash2 } from "lucide-react";

interface TableComponentProps {
    table: Table;
    onDelete: () => void;
    selected?: boolean;
    onSelect?: (multi: boolean) => void;
}

export function TableComponent({ table, onDelete, selected, onSelect }: TableComponentProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useDraggable({
        id: `table-${table.id}`,
        data: table,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                if (e.target === e.currentTarget) onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
            }}
            style={{
                left: `${table.x - 12}px`, // Slight offset to wrap seats
                top: `${table.y}px`,
                width: `${table.seatIds.length * 100 + 24}px`,
                height: "144px",
                ...style
            }}
            className={cn(
                "absolute rounded-3xl border-2 transition-all",
                isDragging
                    ? "border-blue-500 bg-blue-50/20 shadow-2xl scale-[1.02] z-50 ring-4 ring-blue-500/10"
                    : "border-slate-200 bg-white/30 hover:border-slate-300",
                selected && "ring-4 ring-blue-500 ring-offset-2 bg-blue-50/20 border-blue-400 z-40"
            )}
        >
            <div className="absolute -top-4 left-6 flex items-center gap-1 group pointer-events-auto">
                <div
                    {...listeners}
                    {...attributes}
                    className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full cursor-grab active:cursor-grabbing hover:bg-slate-50 shadow-sm"
                >
                    <Move className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 uppercase tracking-widest">{table.label}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 bg-white border border-slate-200 rounded-full text-slate-300 hover:text-red-500 shadow-sm transition-colors"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export default TableComponent;
