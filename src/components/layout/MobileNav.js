"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu as MenuIcon, Settings, LogOut } from "lucide-react";

export function MobileNav({ handleLogout, router, pathname, navItems, user }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open mobile menu"
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        {/* ADDED HEADER AND TITLE FOR ACCESSIBILITY */}
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        {/* Removed mt-4 from nav to use header margin */}
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
