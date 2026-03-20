"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, Search, Plus, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileSidebar } from "@/components/dashboard/sidebar";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchModal } from "@/components/dashboard/search-modal";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

async function fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function markAllRead(): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markAllRead: true }),
  });
  if (!res.ok) throw new Error("Failed to mark notifications as read");
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

export function Header({ title, breadcrumbs, showCreateButton = false, onCreateClick }: HeaderProps) {
  const { user, profile } = useUser();
  const queryClient = useQueryClient();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markAllReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const userName = profile?.full_name ?? user?.email ?? "";
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-gray-100 bg-white/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
      {/* Mobile menu trigger */}
      <MobileSidebar />

      {/* Page title & breadcrumbs */}
      <div className="flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-gray-400">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="transition-colors hover:text-taskly-orange"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-taskly-dark">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-taskly-dark font-playfair tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Search Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsSearchOpen(true)}
          className="size-10 rounded-xl text-gray-500 hover:text-taskly-dark hover:bg-gray-100"
        >
          <Search className="size-5" />
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="size-10 rounded-xl text-gray-500 hover:text-taskly-dark hover:bg-gray-100 relative"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-taskly-orange rounded-full"></span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-taskly-dark">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="h-auto p-0 text-xs text-gray-500 hover:text-taskly-orange"
                >
                  <Check className="size-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500">
                  <Bell className="size-8 mb-2 opacity-50" />
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link || "#"}
                      className={cn(
                        "block px-4 py-3 hover:bg-gray-50 transition-colors",
                        !notification.is_read && "bg-orange-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 size-2 rounded-full flex-shrink-0",
                          notification.is_read ? "bg-gray-300" : "bg-taskly-orange"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium text-taskly-dark",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Create Button (if needed) */}
        {showCreateButton && (
          <Button 
            onClick={onCreateClick}
            className="bg-taskly-orange text-white px-4 py-2 rounded-xl font-semibold hover:bg-taskly-orange/90 shadow-md shadow-taskly-orange/20 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        )}

        {/* User Avatar */}
        <div className="flex items-center gap-3 rounded-full border border-gray-100 bg-white px-3 py-1.5 shadow-sm">
          <Avatar size="sm">
            <AvatarImage
              src={user?.user_metadata?.avatar_url}
              alt={userName}
            />
            <AvatarFallback className="bg-taskly-orange text-white text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="max-w-32 truncate text-sm font-semibold text-taskly-dark">{userName}</p>
          </div>
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
