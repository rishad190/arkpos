"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button.jsx";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet.jsx";
import {
  Menu as MenuIcon,
  Settings,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Users,
  Package,
  Receipt,
  GitMerge,
  BarChart3,
} from "lucide-react";

export function MobileNav({ handleLogout, router, pathname, navItems }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
