"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  LayoutDashboard,
  GitBranch,
  Users,
  Database,
  Settings,
  ChevronDown,
  MessageSquare,
  LogOut,
  FileText,
  UserCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Journeys", href: "/journeys", icon: GitBranch },
  { label: "Audience", href: "/audience", icon: Users },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Data", href: "/data", icon: Database },
] as const;

export interface RecentConversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  userEmail: string;
  userName: string;
  role: string;
  recentConversations?: RecentConversation[];
}

export function Sidebar({ userName, role, recentConversations }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const activeConversationId = searchParams.get("id");

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(convId);
    try {
      const res = await fetch(`/api/chat/conversations?id=${convId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // If we deleted the active conversation, navigate to fresh chat
        if (activeConversationId === convId) {
          router.push("/chat");
        }
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const initial = userName.charAt(0).toUpperCase();
  const displayName =
    userName.includes("@") ? userName.split("@")[0] : userName;

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col bg-bg-sidebar border-r border-border transition-all duration-200 ${
        collapsed ? "w-14" : "w-[220px]"
      }`}
    >
      {/* Collapse toggle — sits on the border, vertically centered */}
      <button
        type="button"
        onClick={() => {
          setCollapsed(!collapsed);
          if (menuOpen) setMenuOpen(false);
        }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-sidebar text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
      >
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : "rotate-90"}`}
        />
      </button>

      {/* Logo */}
      <div className="flex h-14 items-center justify-center px-2">
        {!collapsed && (
          <div className="flex items-center gap-1">
            <Image src="/logo.png" alt="Trident" width={22} height={22} />
            <span className="font-headline text-base font-semibold tracking-tight text-text">
              Trident
            </span>
          </div>
        )}
        {collapsed && (
          <Image src="/logo.png" alt="Trident" width={22} height={22} />
        )}
      </div>

      {/* New Chat button */}
      <div className="px-2 pb-2">
        <Link
          href="/chat"
          className={`flex w-full items-center rounded-md border border-border bg-surface py-2 text-sm text-text transition-colors hover:border-accent/40 hover:text-accent ${
            collapsed ? "justify-center px-2" : "justify-center gap-2 px-3"
          }`}
          title={collapsed ? "New Chat" : undefined}
        >
          <Plus size={16} />
          {!collapsed && <span>New Chat</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md py-2 text-sm transition-colors ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${
                active
                  ? "border-l-2 border-accent bg-accent-muted text-accent"
                  : "border-l-2 border-transparent text-text-muted hover:bg-surface hover:text-text"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {!collapsed && (
                <span className={active ? "font-medium" : ""}>{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-2 my-3 border-t border-border" />

      {/* Recent chats — hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden px-2">
          <span className="mb-1.5 px-1 text-xs font-medium text-text-muted">
            Recent
          </span>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {recentConversations && recentConversations.length > 0 ? (
              recentConversations.map((conv) => {
                const isActive =
                  pathname === "/chat" && activeConversationId === conv.id;
                const isDeleting = deletingId === conv.id;
                return (
                  <Link
                    key={conv.id}
                    href={`/chat?id=${conv.id}`}
                    className={`group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-accent-muted text-accent"
                        : "text-text-muted hover:bg-surface hover:text-text"
                    } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Link>
                );
              })
            ) : (
              <p className="px-3 py-1.5 text-xs text-text-muted">
                No conversations yet
              </p>
            )}
          </div>
        </div>
      )}

      {collapsed && <div className="flex-1" />}

      {/* Profile */}
      <div className="relative border-t border-border p-2">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex w-full items-center rounded-md py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
          title={collapsed ? displayName : undefined}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-text">
            {initial}
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden text-left">
                <span className="truncate text-sm text-text">{displayName}</span>
                <span className="truncate text-xs text-text-muted capitalize">
                  {role}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 rounded-md border border-border bg-surface py-1 shadow-lg">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <UserCircle size={14} />
              {!collapsed && "Profile"}
            </Link>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <Settings size={14} />
              {!collapsed && "Settings"}
            </Link>
            <div className="my-1 border-t border-border" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg hover:text-text"
              >
                <LogOut size={14} />
                {!collapsed && "Sign out"}
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
