"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { MobileNav } from "@/components/layout/MobileNav";
import { UserNav } from "@/components/layout/UserNav";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Package,
  Receipt,
  Settings,
  LogOut,
  Bell,
  User,
  BarChart3,
  GitMerge,
  DollarSign,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSettings } from "@/contexts/settings-context";
import { ConnectionIndicator } from "@/components/layout/ConnectionIndicator";


export function Navbar() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return null;
  }

  const permissions = settings?.permissions || {};
  const showSettings = user?.role === "admin" || permissions.settings !== false;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
    { href: "/customers", label: "Customers", icon: User, key: "customers" },
    { href: "/cashbook", label: "Cash Book", icon: BookOpen, key: "cashbook" },
    { href: "/cashmemo", label: "Cash Memo", icon: Receipt, key: "cashmemo" },
    { href: "/suppliers", label: "Suppliers", icon: Users, key: "suppliers" },
    { href: "/inventory-profit", label: "Inventory Profit", icon: BarChart3, key: "inventoryProfit" },
    { href: "/partners", label: "Partners", icon: GitMerge, key: "partners" },
    { href: "/loans", label: "Loans", icon: DollarSign, key: "loans" },
    { href: "/products", label: "Products", icon: Package, key: "products" },
    { href: "/reports/expense", label: "Expense Report", icon: BarChart3, key: "expenseReport" },
  ];

  const visibleNavItems = user?.role === "admin"
    ? navItems
    : navItems.filter((item) => permissions[item.key] !== false);

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/download.png"
                alt="ARK Enterprise Logo"
                width={40}
                height={40}
                className="rounded-md"
              />
              <span className="ml-2 text-xl md:text-2xl font-semibold text-foreground">
                ARK Enterprise
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {visibleNavItems.slice(0, 5).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground animate-pulse-subtle"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
            {visibleNavItems.length > 5 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  >
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {visibleNavItems.slice(5).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex items-center ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <ConnectionIndicator />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <UserNav handleLogout={handleLogout} router={router} showSettings={showSettings} />

            <div className="block md:hidden">
              <MobileNav
                handleLogout={handleLogout}
                router={router}
                pathname={pathname}
                navItems={visibleNavItems}
                showSettings={showSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
