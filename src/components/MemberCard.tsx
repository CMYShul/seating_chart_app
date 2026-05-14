"use client";

import { useDraggable } from "@dnd-kit/core";
import { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MemberCardProps {
    member: Member;
    isDragging?: boolean;
}

export function MemberCard({ member, isDragging }: MemberCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `member-${member.id}`,
        data: member,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 1000,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "p-3 mb-2 rounded-lg cursor-grab active:cursor-grabbing transition-all",
                "bg-white border border-slate-200 shadow-sm hover:shadow-md",
                isDragging && "opacity-50 grayscale",
                "flex flex-col gap-1 items-start"
            )}
        >
            <span className="font-semibold text-slate-800 w-full text-right" dir="rtl">
                {member.displayName}
            </span>
            <span className="text-xs text-slate-500">
                {member.firstName} {member.lastName}
            </span>
        </div>
    );
}
