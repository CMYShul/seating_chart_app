"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { LayoutItem, Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { User, ShieldAlert, X, Edit3 } from "lucide-react";
import { useState } from "react";

interface LayoutItemComponentProps {
    item: LayoutItem;
    occupant?: Member;
    history?: Array<{ year: number; displayName: string }>;
    onUpdateLabel: (id: string, label: string) => void;
    onDeleteItem: (id: string) => void;
    selected?: boolean;
    onSelect?: (multi: boolean) => void;
}

export function LayoutItemComponent({
    item,
    occupant,
    history,
    onUpdateLabel,
    onDeleteItem,
    selected,
    onSelect
}: LayoutItemComponentProps) {
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [tempLabel, setTempLabel] = useState(item.label);

    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `seat-${item.id}`,
        data: item,
        disabled: item.type !== "seat",
    });

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        transform,
        isDragging
    } = useDraggable({
        id: `item-${item.id}`,
        data: item,
    });

    const isSeat = item.type === "seat";

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    const handleLabelSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateLabel(item.id, tempLabel);
        setIsEditingLabel(false);
    };

    return (
        <div
            ref={(node) => {
                setDropRef(node);
                setDragRef(node);
            }}
            onClick={(e) => {
                if (e.detail === 1) onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
            }}
            style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                ...style
            }}
            {...attributes}
            className={cn(
                "absolute w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group",
                isDragging && "opacity-50 grayscale shadow-2xl scale-105 z-50",
                isSeat ? "border-2" : "border-none bg-slate-200 shadow-inner",
                selected && "ring-4 ring-blue-500 ring-offset-2 scale-105 z-40",
                isOver
                    ? "border-blue-500 bg-blue-50/50 scale-105"
                    : occupant
                        ? "border-blue-600 bg-white shadow-md ring-4 ring-blue-500/10"
                        : isSeat
                            ? "border-dashed border-slate-300 bg-white/50 hover:border-slate-400"
                            : "opacity-40",
                !isDragging && "cursor-grab active:cursor-grabbing"
            )}
        >
            {/* Controls Overlay */}
            <div className="absolute -top-3 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsEditingLabel(true); }}
                    className="p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-blue-500 shadow-sm"
                >
                    <Edit3 className="w-3 h-3" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                    className="p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 shadow-sm"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-white text-[10px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap"
                {...listeners}
            >
                {isEditingLabel ? (
                    <form onSubmit={handleLabelSubmit} className="inline-block" onClick={e => e.stopPropagation()}>
                        <input
                            autoFocus
                            className="bg-transparent border-none outline-none text-white p-0 text-[10px] w-16 text-center"
                            value={tempLabel}
                            onChange={e => setTempLabel(e.target.value)}
                            onBlur={() => setIsEditingLabel(false)}
                        />
                    </form>
                ) : (
                    item.label
                )}
            </div>

            {isSeat ? (
                occupant ? (
                    <div className="flex flex-col items-center text-center p-2 w-full" {...listeners}>
                        <User className="w-6 h-6 text-blue-500 mb-1" />
                        <span className="text-sm font-bold text-slate-900 leading-tight" dir="rtl">
                            {occupant.displayName}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full" {...listeners}>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Available</span>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center opacity-60" {...listeners}>
                    <ShieldAlert className="w-5 h-5 text-slate-400" />
                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1">{item.label}</span>
                </div>
            )}

            {/* History Tooltip */}
            {isSeat && history && history.length > 0 && !isDragging && (
                <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col glass p-3 rounded-xl min-w-[150px] z-50 pointer-events-none text-left shadow-xl">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Historical Data</h4>
                    <div className="flex flex-col gap-1.5 w-full">
                        {history.map((h, i) => (
                            <div key={i} className="flex justify-between items-center text-xs gap-4">
                                <span className="text-slate-500 font-mono">{h.year}</span>
                                <span className="font-medium text-slate-800 dir-rtl text-right flex-1" dir="rtl">{h.displayName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
