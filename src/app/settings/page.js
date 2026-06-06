"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/settings-context";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Bell,
  Lock,
  Palette,
  Save,
  RefreshCw,
  ArrowLeft,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [storeSettings, setStoreSettings] = useState({
    storeName: "",
    address: "",
    phone: "",
    email: "",
    currency: "৳",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    lowStockAlert: true,
    duePaymentAlert: true,
    newOrderAlert: true,
    emailNotifications: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    compactMode: false,
    showImages: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    requirePassword: false,
    sessionTimeout: 30,
    backupEnabled: true,
  });

  const [permissionsSettings, setPermissionsSettings] = useState({
    dashboard: true,
    customers: true,
    cashbook: false,
    inventory: true,
    cashmemo: true,
    suppliers: false,
    inventoryProfit: false,
    partners: false,
    loans: false,
    products: false,
    expenseReport: false,
    settings: false,
  });

  useEffect(() => {
    if (settings) {
      setStoreSettings(settings.store || {
        storeName: "",
        address: "",
        phone: "",
        email: "",
        currency: "৳",
      });
      setNotificationSettings(settings.notifications || {
        lowStockAlert: true,
        duePaymentAlert: true,
        newOrderAlert: true,
        emailNotifications: false,
      });
      setAppearanceSettings(settings.appearance || {
        theme: "light",
        compactMode: false,
        showImages: true,
      });
      setSecuritySettings(settings.security || {
        requirePassword: false,
        sessionTimeout: 30,
        backupEnabled: true,
      });
      setPermissionsSettings(settings.permissions || {
        dashboard: true,
        customers: true,
        cashbook: false,
        inventory: true,
        cashmemo: true,
        suppliers: false,
        inventoryProfit: false,
        partners: false,
        loans: false,
        products: false,
        expenseReport: false,
        settings: false,
      });
      setLoading(false);
    } else {
      // If no settings from context, stop loading after a delay
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        store: storeSettings,
        notifications: notificationSettings,
        appearance: appearanceSettings,
        security: securitySettings,
        permissions: permissionsSettings,
      });
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <Skeleton className="h-7 sm:h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-none shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your application settings and preferences
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Cancel</span>
            <span className="sm:hidden">Cancel</span>
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving} className="flex-1 sm:flex-none">
            <Save className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className={`grid w-full h-auto ${user?.role === "admin" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
          <TabsTrigger value="general" className="text-xs sm:text-sm py-2">
            <Store className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">General</span>
            <span className="sm:hidden">Store</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2">
            <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm py-2">
            <Palette className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm py-2">
            <Lock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Security
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="permissions" className="text-xs sm:text-sm py-2">
              <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Store Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Update your store details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeSettings.storeName}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        storeName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={storeSettings.phone}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={storeSettings.email}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency Symbol</Label>
                  <Input
                    id="currency"
                    value={storeSettings.currency}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        currency: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Store Address</Label>
                <Input
                  id="address"
                  value={storeSettings.address}
                  onChange={(e) =>
                    setStoreSettings({
                      ...storeSettings,
                      address: e.target.value,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Low Stock Alerts</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get notified when items are running low on stock
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.lowStockAlert}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      lowStockAlert: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Due Payment Alerts</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Receive notifications for pending payments
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.duePaymentAlert}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      duePaymentAlert: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">New Order Alerts</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get notified when new orders are placed
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.newOrderAlert}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      newOrderAlert: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Email Notifications</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Appearance Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Dark Mode</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={appearanceSettings.theme === "dark"}
                  onCheckedChange={(checked) =>
                    setAppearanceSettings({
                      ...appearanceSettings,
                      theme: checked ? "dark" : "light",
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Compact Mode</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Reduce spacing for a more compact view
                  </p>
                </div>
                <Switch
                  checked={appearanceSettings.compactMode}
                  onCheckedChange={(checked) =>
                    setAppearanceSettings({
                      ...appearanceSettings,
                      compactMode: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Show Images</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Display product images in lists
                  </p>
                </div>
                <Switch
                  checked={appearanceSettings.showImages}
                  onCheckedChange={(checked) =>
                    setAppearanceSettings({
                      ...appearanceSettings,
                      showImages: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Security Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage your application security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Password Protection</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Require password for sensitive actions
                  </p>
                </div>
                <Switch
                  checked={securitySettings.requirePassword}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({
                      ...securitySettings,
                      requirePassword: checked,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">
                  Session Timeout (minutes)
                </Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm sm:text-base">Automatic Backup</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Enable automatic data backup
                  </p>
                </div>
                <Switch
                  checked={securitySettings.backupEnabled}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({
                      ...securitySettings,
                      backupEnabled: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {user?.role === "admin" && (
          <TabsContent value="permissions" className="space-y-4">
            <Card className="border-none shadow-md bg-card/65 backdrop-blur-md">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Staff Permissions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure which pages and options are accessible to Staff users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Dashboard */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Dashboard</Label>
                      <p className="text-xs text-muted-foreground">
                        Staff access to the main dashboard summary.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.dashboard}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          dashboard: checked,
                        })
                      }
                    />
                  </div>

                  {/* Customers */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Customers</Label>
                      <p className="text-xs text-muted-foreground">
                        Manage customer ledger profiles and transactions.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.customers}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          customers: checked,
                        })
                      }
                    />
                  </div>

                  {/* Cash Book */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Cash Book</Label>
                      <p className="text-xs text-muted-foreground">
                        View and update cash/bank transaction records.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.cashbook}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          cashbook: checked,
                        })
                      }
                    />
                  </div>

                  {/* Inventory */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Inventory</Label>
                      <p className="text-xs text-muted-foreground">
                        Manage stocks, updates, and Bengali scanner feature.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.inventory}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          inventory: checked,
                        })
                      }
                    />
                  </div>

                  {/* Cash Memo */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Cash Memo</Label>
                      <p className="text-xs text-muted-foreground">
                        Create invoices and process POS checkout.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.cashmemo}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          cashmemo: checked,
                        })
                      }
                    />
                  </div>

                  {/* Suppliers */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Suppliers</Label>
                      <p className="text-xs text-muted-foreground">
                        Manage suppliers lists and balance ledgers.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.suppliers}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          suppliers: checked,
                        })
                      }
                    />
                  </div>

                  {/* Inventory Profit */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Inventory Profit</Label>
                      <p className="text-xs text-muted-foreground">
                        Analyze stock profit margins and valuation reports.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.inventoryProfit}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          inventoryProfit: checked,
                        })
                      }
                    />
                  </div>

                  {/* Partners */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Partners</Label>
                      <p className="text-xs text-muted-foreground">
                        View business partner investment details.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.partners}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          partners: checked,
                        })
                      }
                    />
                  </div>

                  {/* Loans */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Loans</Label>
                      <p className="text-xs text-muted-foreground">
                        Track business loans and installment logs.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.loans}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          loans: checked,
                        })
                      }
                    />
                  </div>

                  {/* Products */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Products</Label>
                      <p className="text-xs text-muted-foreground">
                        Add and edit product inventory listings.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.products}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          products: checked,
                        })
                      }
                    />
                  </div>

                  {/* Expense Report */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Expense Report</Label>
                      <p className="text-xs text-muted-foreground">
                        Access and export detailed expense breakdown reports.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.expenseReport}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          expenseReport: checked,
                        })
                      }
                    />
                  </div>

                  {/* Settings */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm font-semibold">Settings Access</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow staff to open settings pages.
                      </p>
                    </div>
                    <Switch
                      checked={permissionsSettings.settings}
                      onCheckedChange={(checked) =>
                        setPermissionsSettings({
                          ...permissionsSettings,
                          settings: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
