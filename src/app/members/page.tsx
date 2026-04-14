"use client";

import { useState, useMemo, useEffect } from "react";
import { Member, MemberHistory } from "@/lib/types";
import { ROOMS } from "@/lib/mock-data";
import { CsvUploader } from "@/components/CsvUploader";
import { cn } from "@/lib/utils";
import { Plus, LayoutGrid, Users, Search, Trash2, Edit2, X, Check } from "lucide-react";
import Link from "next/link";

import { STORAGE_KEYS } from "@/lib/storage-utils";

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Member | null>(null);

    // Load form API
    const loadMembers = async () => {
        try {
            const res = await fetch("/api/members");
            if (res.ok) setMembers(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadMembers();
        loadHistory();
    }, []);

    // We don't need a separate effect to save to localStorage anymore
    // Updates are handled by specific handlers

    const [historyMap, setHistoryMap] = useState<Record<string, Array<{ year: number; seatLabel: string }>>>({});

    const loadHistory = async () => {
        try {
            const res = await fetch("/api/history");
            if (res.ok) {
                const data: Array<{ year: number, seatLabel: string, memberId: string }> = await res.json();
                const map: Record<string, Array<{ year: number; seatLabel: string }>> = {};

                data.forEach(h => {
                    if (!map[h.memberId]) map[h.memberId] = [];
                    map[h.memberId].push({ year: h.year, seatLabel: h.seatLabel });
                });

                setHistoryMap(map);
            }
        } catch (e) { console.error("Failed to load history:", e); }
    };

    const handleAddCsvMembers = async (newMembers: Omit<Member, "id">[]) => {
        const membersWithId = newMembers.map(m => ({
            ...m,
            id: crypto.randomUUID(),
        }));

        try {
            const res = await fetch("/api/members", {
                method: "POST",
                body: JSON.stringify(membersWithId)
            });

            if (res.ok) {
                setMembers(prev => [...prev, ...membersWithId]);
            }
        } catch (e) {
            console.error("Failed to import members", e);
            alert("Failed to import members");
        }
    };

    const deleteMember = async (id: string) => {
        if (confirm("Are you sure you want to delete this member?")) {
            try {
                const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
                if (res.ok) {
                    setMembers(prev => prev.filter(m => m.id !== id));
                }
            } catch (e) {
                console.error("Failed to delete member", e);
                alert("Failed to delete member");
            }
        }
    };

    const startEditing = (member: Member) => {
        setEditingId(member.id);
        setEditForm({ ...member });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const saveEdit = async () => {
        if (!editForm) return;

        try {
            const res = await fetch("/api/members", {
                method: "PUT",
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                setMembers(prev => prev.map(m => m.id === editForm.id ? editForm : m));
                setEditingId(null);
                setEditForm(null);
            }
        } catch (e) {
            console.error("Failed to update member", e);
            alert("Failed to update member");
        }
    };

    const addNewMember = async () => {
        const newMember: Member = {
            id: crypto.randomUUID(),
            firstName: "New",
            lastName: "Member",
            displayName: "חבר חדש",
            roomId: "main"
        };

        try {
            const res = await fetch("/api/members", {
                method: "POST",
                body: JSON.stringify(newMember)
            });

            if (res.ok) {
                setMembers(prev => [newMember, ...prev]);
                startEditing(newMember);
            }
        } catch (e) {
            console.error("Failed to add member", e);
            alert("Failed to save new member");
        }
    };

    const filteredMembers = members.filter(
        (m) =>
            m.displayName.includes(search) ||
            m.firstName.toLowerCase().includes(search.toLowerCase()) ||
            m.lastName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <main className="flex h-screen bg-[#f8fafc] overflow-hidden">
            <nav className="w-16 h-full bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400">
                <Link href="/" className="p-2 hover:text-white transition-colors">
                    <LayoutGrid className="w-6 h-6" />
                </Link>
                <Link href="/members" className="p-2 text-white ring-2 ring-blue-500 rounded-xl transition-colors">
                    <Users className="w-6 h-6" />
                </Link>
            </nav>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-sm">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Member Management</h1>
                        <p className="text-xs text-slate-500 mt-1">Manage member data and view seating history</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <CsvUploader onMembersAdded={handleAddCsvMembers} />
                        <button
                            onClick={addNewMember}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md"
                        >
                            <Plus className="w-4 h-4" />
                            Add Member
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-auto text-left">
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left">
                            <div className="relative w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    className="w-full bg-slate-100/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                Found {filteredMembers.length} members
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-left-text text-left">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <th className="px-6 py-4 text-left">Display Name (Hebrew)</th>
                                        <th className="px-6 py-4 text-left">First Name</th>
                                        <th className="px-6 py-4 text-left">Last Name</th>
                                        <th className="px-6 py-4 text-left">Room</th>
                                        <th className="px-6 py-4 text-left">Seating History</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMembers.map((member) => (
                                        <tr key={member.id} className={cn("hover:bg-blue-50/20 transition-colors group", editingId === member.id && "bg-blue-50/50")}>
                                            <td className="px-6 py-4">
                                                {editingId === member.id ? (
                                                    <input
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-right dir-rtl"
                                                        dir="rtl"
                                                        value={editForm?.displayName}
                                                        onChange={e => setEditForm(f => f ? { ...f, displayName: e.target.value } : null)}
                                                    />
                                                ) : (
                                                    <span className="font-bold text-slate-900 dir-rtl text-right inline-block w-full" dir="rtl">{member.displayName}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === member.id ? (
                                                    <input
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1"
                                                        value={editForm?.firstName}
                                                        onChange={e => setEditForm(f => f ? { ...f, firstName: e.target.value } : null)}
                                                    />
                                                ) : (
                                                    <span className="text-slate-600 font-medium">{member.firstName}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === member.id ? (
                                                    <input
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1"
                                                        value={editForm?.lastName}
                                                        onChange={e => setEditForm(f => f ? { ...f, lastName: e.target.value } : null)}
                                                    />
                                                ) : (
                                                    <span className="text-slate-600 font-medium">{member.lastName}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingId === member.id ? (
                                                    <select
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                                                        value={editForm?.roomId}
                                                        onChange={e => setEditForm(f => f ? { ...f, roomId: e.target.value } : null)}
                                                    >
                                                        {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                                                        {ROOMS.find(r => r.id === member.roomId)?.name || member.roomId}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 flex-wrap">
                                                    {historyMap[member.id]?.map((h, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] border border-blue-100 shadow-sm">
                                                            <span className="font-bold opacity-70">{h.year}:</span>
                                                            <span className="font-semibold">{h.seatLabel}</span>
                                                        </div>
                                                    )) || <span className="text-slate-300 italic text-[10px]">No history found</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto">
                                                    {editingId === member.id ? (
                                                        <>
                                                            <button onClick={saveEdit} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={cancelEditing} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEditing(member)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteMember(member.id)}
                                                                className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
