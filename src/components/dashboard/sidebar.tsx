"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Search,
  Hammer,
  TrendingUp,
  ListTodo,
  Settings,
  CreditCard,
  Moon,
  Sun,
  LogOut,
  Menu,
  Puzzle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import TaskLyneLogo from "@/components/TaskLyneLogo";

const mainNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Research Agent",
    href: "/dashboard/research",
    icon: Search,
  },
  {
    label: "Build Agent",
    href: "/dashboard/build",
    icon: Hammer,
  },
  {
    label: "Growth Agent",
    href: "/dashboard/growth",
    icon: TrendingUp,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: ListTodo,
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: Users,
  },
] as const;

const bottomNavItems = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: Puzzle,
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
  pathname: string;
  onClick?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-taskly-orange text-white shadow-md"
          : "text-sidebar-foreground/80 hover:bg-taskly-orange/10 hover:text-taskly-orange"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          active ? "bg-white/20 text-white" : "bg-transparent text-sidebar-foreground/70"
        )}
      >
        <Icon className="size-5 shrink-0" />
      </div>
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, profile } = useUser();
  const [mounted] = useState(() => {
    if (typeof window !== "undefined") {
      return true;
    }
    return false;
  });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const userEmail = user?.email ?? "";
  const userName = profile?.full_name ?? userEmail;
  const userInitials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-taskly-light">
      {/* Logo Section - TaskLyne Brand */}
      <div className="flex h-20 items-center px-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <TaskLyneLogo size={36} />
        </Link>
      </div>

      {/* Workspace Info */}
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400 font-medium">
            Workspace
          </p>
          <p className="mt-1.5 text-sm font-medium text-taskly-dark">
            Strategy, build, and growth in one place
          </p>
        </div>
      </div>

      <Separator className="bg-gray-100 mx-4" />

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="space-y-1 px-3 pb-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onNavigate}
          />
        ))}
      </div>

      <Separator className="bg-gray-100 mx-4" />

      {/* Theme toggle */}
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-11 w-full justify-start gap-3 rounded-xl text-sidebar-foreground hover:bg-gray-100 hover:text-taskly-dark transition-colors"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? (
            <Sun className="size-5 shrink-0" />
          ) : (
            <Moon className="size-5 shrink-0" />
          )}
          <span className="text-sm font-medium">
            {mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Toggle Theme"}
          </span>
        </Button>
      </div>

      <Separator className="bg-gray-100 mx-4" />

      {/* User section */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 text-left shadow-sm transition-all hover:shadow-md hover:border-gray-200">
              <Avatar size="sm">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url}
                  alt={userName}
                />
                <AvatarFallback className="bg-taskly-orange text-white text-sm font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  {userName}
                </p>
                {userEmail && userName !== userEmail && (
                  <p className="truncate text-xs text-gray-400">
                    {userEmail}
                  </p>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="size-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
              <CreditCard className="size-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Desktop sidebar - fixed left panel */
export function Sidebar() {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-gray-100 bg-sidebar md:block shadow-xl">
      <SidebarContent />
    </aside>
  );
}

/** Mobile sidebar trigger + Sheet */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
