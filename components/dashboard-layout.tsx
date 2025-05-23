"use client";

import { useState, useEffect, useContext } from "react";
import type React from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { LaunchpadImage } from "@/components/ui/basic/image";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/basic/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/layout/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/app/providers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/overlay/popover";
import { format } from "date-fns";

interface DashboardLayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}

/**
 * Renders a responsive dashboard layout featuring a header, sidebar, and main content area.
 *
 * The layout adapts to different screen sizes by toggling a mobile menu and adjusting navbar styling based on scroll position. It includes a dynamic header with navigation controls, notifications, and a user profile section, and updates displayed labels between an admin or student view based on the provided {@link isAdmin} flag.
 *
 * @param children - The content rendered within the main area of the dashboard.
 * @param isAdmin - Determines whether to display admin-specific labels and navigation.
 */
export function DashboardLayout({
  children,
  isAdmin = false,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userName, setUserName] = useState("User");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const router = useRouter();
  
  const { session, loading } = useContext(AuthContext);

  // Protect route based on admin status
  useEffect(() => {
    if (loading) return;
    
    if (!session?.user) {
      router.push('/');
      return;
    }
    
    if (isAdmin && !session.user.isAdmin) {
      router.push("/applicant/dashboard");
      return;
    }

    if (!isAdmin && session.user.isAdmin) {
      router.push("/admin/dashboard");
      return;
    }

    setUserName(`${session.user.firstName || ''} ${session.user.lastName || ''}`);
  }, [session, loading, isAdmin, router]);

  // Check for unread notifications - this is a placeholder for future implementation
  useEffect(() => {
    // This is just a placeholder to use setHasUnreadNotifications
    // In the future, you can implement actual notification checking logic here
    const checkForNotifications = async () => {
      // Example: In the future, you might fetch notifications from an API
      // const response = await fetch('/api/notifications');
      // const data = await response.json();
      // setHasUnreadNotifications(data.hasUnread);
      
      // For now, we'll just set it to false
      setHasUnreadNotifications(false);
    };
    
    if (!isAdmin && session?.user) {
      checkForNotifications();
    }
  }, [isAdmin, session]);

  // Track scroll position to add shadow to navbar when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Navbar with gradient, better transitions, and mobile optimization */}
      <header
        className={cn(
          "fixed top-0 z-40 w-full border-b transition-all duration-200",
          scrolled
            ? "shadow-md border-transparent"
            : "shadow-sm border-gray-200 dark:border-gray-800",
          "bg-white dark:bg-gray-800",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 text-gray-700 hover:bg-gray-100"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 border-r border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Image
                      src="https://149667878.v2.pressablecdn.com/wp-content/uploads/2022/07/01-main-color-launchpad-logo.png"
                      alt="Launchpad Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                      Launchpad
                    </h2>
                  </div>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>
                <div className="flex flex-col h-[calc(100vh-65px)] overflow-y-auto">
                  <DashboardNav isAdmin={isAdmin} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <Image
                  src="https://149667878.v2.pressablecdn.com/wp-content/uploads/2022/07/01-main-color-launchpad-logo.png"
                  alt="Launchpad Logo"
                  width={130}
                  height={52}
                  className="h-8 w-auto hidden md:block"
                />
                <div className="hidden md:block h-8 w-px bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"></div>
                <h1 className="text-xl font-bold hidden md:block text-gray-800 dark:text-gray-100 ml-2">
                  {isAdmin ? "Admin Portal" : "Student Portal"}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell with popup - only show for non-admin users */}
            {!isAdmin && (
              <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full hover:bg-gray-100 text-gray-600 dark:text-gray-300"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                    {hasUnreadNotifications && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white">
                        <span className="absolute inset-0 rounded-full animate-ping bg-orange-500/75 opacity-75"></span>
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="font-medium">Notifications</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification: Notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <p className="text-sm text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <Bell className="h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-sm text-gray-500 text-center">
                          You don&apos;t have any notifications at the moment.
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* User profile section */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 p-0.5 flex items-center justify-center">
                <div className="h-full w-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  <LaunchpadImage
                    imageId="default-profile-picture"
                    alt="User profile picture"
                    width={36}
                    height={36}
                    className="object-cover rounded-full"
                  />
                </div>
              </div>
              <div className="hidden md:block">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {isAdmin ? "Admin" : userName}
                </p>
                <p className="text-sm text-gray-500">
                  {isAdmin ? "Administrator" : "Student"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full pt-16">
        {/* Sidebar - fixed position, visible on medium screens and larger */}
        <aside className="hidden md:block fixed top-16 bottom-0 left-0 w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-30 overflow-y-auto">
          <DashboardNav isAdmin={isAdmin} />
        </aside>

        {/* Main content area - with appropriate margin to account for sidebar */}
        <main className="flex-1 w-full md:ml-64 bg-gray-50 dark:bg-gray-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAdmin ? "admin" : "student"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}