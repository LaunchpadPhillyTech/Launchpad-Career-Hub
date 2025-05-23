"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/form/input";
import { Switch } from "@/components/ui/basic/switch";
import { Badge } from "@/components/ui/basic/badge";
import { Avatar, AvatarFallback } from "@/components/ui/basic/avatar";
import { Card, CardContent } from "@/components/ui/basic/card";
import { Shield, Search, UserPlus, KeyRound, Tag, Archive } from "lucide-react";
import { extendedPalette } from "@/lib/colors";
import { toast } from "@/components/ui/feedback/use-toast";
import { User, UserAccessSettingsProps } from "./types";
import { ApplicantWithDetails, JobApplication } from "../Applicants/types";
import { Button } from "@/components/ui/basic/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlay/dialog";
import { Label } from "@/components/ui/basic/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs";
import { ApplicantProfileModal } from "@/components/Admin/Applicants/ApplicantProfileModal";

export function UserAccessManager({ 
  users, 
  currentUserId, 
  isLoading,
  onUserUpdate 
}: UserAccessSettingsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "Changeme",
    program: "ONE_ZERO_ONE"
  });
  const [viewProfileModalOpen, setViewProfileModalOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<ApplicantWithDetails | null>(null);
  const [applicantJobs, setApplicantJobs] = useState<JobApplication[]>([]);
  const [loadingApplicantJobs, setLoadingApplicantJobs] = useState(false);

  // Update local users when props change
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Function to refresh the user list
  const refreshUserList = useCallback(async () => {
    try {
      const response = await fetch('/api/users?includeApplications=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLocalUsers(data.users);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error refreshing users:', error);
      toast({
        title: "Error",
        description: "Failed to refresh user list. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  // Filter users by search query and tab
  const filteredUsers = localUsers.filter((user) => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    // Always exclude archived users unless we're in the archived tab
    if (activeTab === "archived") {
      return matchesSearch && user.isArchived;
    }
    
    // For all other tabs, exclude archived users
    if (user.isArchived) {
      return false;
    }
    
    // Then apply the specific tab filter
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "admins") return matchesSearch && user.isAdmin;
    if (activeTab === "applicants") return matchesSearch && !user.isAdmin;
    
    return matchesSearch;
  });

  const showToast = useCallback((title: string, description: string, variant: "default" | "destructive" = "default") => {
    toast({
      title,
      description,
      variant,
    });
  }, []);

  // Toggle admin status for a user
  const handleToggleAdmin = async (userId: number, currentAdminStatus: boolean) => {
    setIsUpdating(userId);
    
    try {
      const response = await fetch('/api/users/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isAdmin: !currentAdminStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update admin status');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const updatedUsers = localUsers.map(user => 
          user.id === userId 
            ? {...user, isAdmin: !currentAdminStatus} 
            : user
        );
        
        setLocalUsers(updatedUsers);
        
        // Notify parent component if callback exists
        if (onUserUpdate && data.user) {
          onUserUpdate(data.user);
        }
        
        showToast("Success", `Admin status updated successfully`);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch {
      showToast("Error", "Failed to update admin status. Please try again.", "destructive");
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle creating a new user
  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      showToast("Error", "Please fill out all required fields.", "destructive");
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }
      
      const data = await response.json();
      
      // Add the new user to the local state
      if (data.user) {
        setLocalUsers(prev => [...prev, data.user]);
        if (onUserUpdate) {
          onUserUpdate(data.user);
        }
      }
      
      // Reset form and close dialog
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        password: "Changeme",
        program: "ONE_ZERO_ONE"
      });
      setCreateUserDialogOpen(false);
      
      showToast("Success", "User created successfully");
    } catch {
      showToast("Error", "Failed to create user. Please try again.", "destructive");
    }
  };

  // Open reset password dialog
  const openResetPasswordDialog = (userId: number) => {
    setSelectedUserId(userId);
    setNewPassword("Changeme");
    setResetPasswordDialogOpen(true);
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!selectedUserId || !newPassword) {
      showToast("Error", "Please provide a new password.", "destructive");
      return;
    }

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword: newPassword,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResetPasswordDialogOpen(false);
        setSelectedUserId(null);
        setNewPassword("");
        
        showToast("Success", "Password reset successfully");
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch {
      showToast("Error", "Failed to reset password. Please try again.", "destructive");
    }
  };

  const convertToApplicantWithDetails = (user: User): ApplicantWithDetails => {
    // Calculate application status counts from user's applications
    const applicationStatusCount = {
      interested: user.applications?.filter(app => app.status === 'INTERESTED').length || 0,
      applied: user.applications?.filter(app => app.status === 'APPLIED').length || 0,
      phoneScreening: user.applications?.filter(app => app.status === 'PHONE_SCREENING').length || 0,
      interviewStage: user.applications?.filter(app => app.status === 'INTERVIEW_STAGE').length || 0,
      finalInterview: user.applications?.filter(app => app.status === 'FINAL_INTERVIEW_STAGE').length || 0,
      offerExtended: user.applications?.filter(app => app.status === 'OFFER_EXTENDED').length || 0,
      negotiation: user.applications?.filter(app => app.status === 'NEGOTIATION').length || 0,
      offerAccepted: user.applications?.filter(app => app.status === 'OFFER_ACCEPTED').length || 0,
      rejected: user.applications?.filter(app => app.status === 'REJECTED').length || 0
    };

    return {
      id: user.id,
      userId: user.id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.isAdmin ? 'admin' : 'applicant',
      applications: user.applications?.length || 0,
      program: user.program || 'ONE_ZERO_ONE',
      isArchived: user.isArchived,
      applicationStatusCount
    };
  };

  const openProfileModal = async (user: User) => {
    const applicantDetails = convertToApplicantWithDetails(user);
    setSelectedUserForProfile(applicantDetails);
    setViewProfileModalOpen(true);
    await loadApplicantJobs(user.id);
  };

  const loadApplicantJobs = async (applicantId: number) => {
    try {
      setLoadingApplicantJobs(true);
      const response = await fetch(`/api/applicants?id=${applicantId}&applications=true`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch applicant jobs');
      }
      
      const data = await response.json();
      setApplicantJobs(data.applications || []);
    } catch (error) {
      console.error("Error loading applicant jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load applicant's job applications. Please try again.",
        variant: "destructive",
      });
      setApplicantJobs([]);
    } finally {
      setLoadingApplicantJobs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium mb-1">User Management</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create and manage users in the system.
          </p>
        </div>
        
        <Button 
          className="bg-[#8eb651] hover:bg-[#658639] text-white transition-colors"
          onClick={() => setCreateUserDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create New User
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white/80 dark:bg-gray-800/80">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative max-w-md">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" 
                  style={{ color: extendedPalette.darkGray }}
                />
                <Input
                  placeholder="Search users..."
                  className="pl-9 border-gray-200 dark:border-gray-700 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    borderColor: extendedPalette.lightBlue,
                    backgroundColor: extendedPalette.offWhite
                  }}
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                  <TabsTrigger value="all">All Users</TabsTrigger>
                  <TabsTrigger value="admins">Admins</TabsTrigger>
                  <TabsTrigger value="applicants">Applicants</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="overflow-hidden rounded-lg border shadow-sm" style={{ borderColor: extendedPalette.lightBlue }}>
              <table className="w-full">
                <thead style={{ backgroundColor: extendedPalette.lightBlue }}>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">Role</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">Admin Access</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                            <div className="ml-3 h-4 w-24 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-5 w-20 mx-auto bg-gray-200 rounded"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-5 w-10 mx-auto bg-gray-200 rounded"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-8 w-8 mx-auto bg-gray-200 rounded"></div>
                        </td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      // Generate initials for avatar
                      const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
                      const isCurrentUser = user.id === currentUserId;

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            user.isArchived ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 shadow-sm" style={{ backgroundColor: extendedPalette.lightBlue }}>
                                <AvatarFallback style={{ color: extendedPalette.primaryBlue }}>{initials}</AvatarFallback>
                              </Avatar>
                              <span className="ml-3 font-medium text-gray-700 dark:text-gray-200">
                                {user.firstName} {user.lastName}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-gray-500">(You)</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant={user.isAdmin ? "default" : "outline"}
                                className="text-xs shadow-sm"
                                style={{
                                  backgroundColor: user.isAdmin ? extendedPalette.primaryBlue : 'transparent',
                                  borderColor: user.isAdmin ? extendedPalette.primaryBlue : extendedPalette.darkGray,
                                  color: user.isAdmin ? 'white' : extendedPalette.darkGray
                                }}
                              >
                                {user.isAdmin ? (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin
                                  </>
                                ) : (
                                  <>
                                    <Tag className="h-3 w-3 mr-1" />
                                    Applicant
                                  </>
                                )}
                              </Badge>
                              {user.isArchived && (
                                <Badge
                                  variant="outline"
                                  className="text-xs shadow-sm bg-red-50 text-red-600 border-red-200"
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  Archived
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Switch
                              checked={user.isAdmin}
                              onCheckedChange={() => handleToggleAdmin(user.id, user.isAdmin)}
                              disabled={isUpdating === user.id || isCurrentUser}
                              className="shadow-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {user.isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openResetPasswordDialog(user.id)}
                                  className="p-2"
                                  title="Reset Password"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              )}
                              { !user.isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openProfileModal(user)}
                                  className="shrink-0 border-[#0faec9] text-[#0faec9] hover:bg-[#c3ebf1]"
                                  title="View Profile"
                                >
                                  View Profile
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="mb-1">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="mb-1">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="mb-1">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="mb-1">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Create a password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default password is &quot;Changeme&quot;
              </p>
            </div>
            <div>
              <Label htmlFor="program" className="mb-1">Program</Label>
              <Select
                value={newUser.program}
                onValueChange={(value) => setNewUser({...newUser, program: value})}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOUNDATIONS">Foundations</SelectItem>
                  <SelectItem value="ONE_ZERO_ONE">101</SelectItem>
                  <SelectItem value="LIFTOFF">Liftoff</SelectItem>
                  <SelectItem value="ALUMNI">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="new-password" className="mb-1">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUserForProfile && (
        <ApplicantProfileModal
          open={viewProfileModalOpen}
          onOpenChange={setViewProfileModalOpen}
          applicant={selectedUserForProfile}
          jobApplications={applicantJobs}
          loadingApplications={loadingApplicantJobs}
          onRefresh={refreshUserList}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
} 