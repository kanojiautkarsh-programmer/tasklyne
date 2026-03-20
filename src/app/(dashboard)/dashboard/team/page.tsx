"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  MoreHorizontal,
  Trash2,
  Loader2,
  Copy,
  UserPlus,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: { id: string; full_name: string | null };
  team_members?: { count: number }[];
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  invited_by: string | null;
  joined_at: string;
  user?: { id: string; full_name: string | null };
}

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  inviter?: { id: string; full_name: string | null };
}

interface TeamDetails {
  team: Team;
  members: TeamMember[];
  invitations: TeamInvitation[];
  userRole: string;
}

async function fetchTeams() {
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Failed to fetch teams");
  const data = await res.json();
  return data.teams as Team[];
}

async function fetchTeamDetails(teamId: string) {
  const res = await fetch(`/api/teams/${teamId}`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json() as Promise<TeamDetails>;
}

async function createTeam(name: string) {
  const res = await fetch("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create team");
  }
  return res.json();
}

async function deleteTeam(teamId: string) {
  const res = await fetch(`/api/teams/${teamId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete team");
  }
  return res.json();
}

async function removeMember(teamId: string, memberId: string) {
  const res = await fetch(`/api/teams/${teamId}/members`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to remove member");
  }
  return res.json();
}

async function updateMemberRole(teamId: string, memberId: string, role: string) {
  const res = await fetch(`/api/teams/${teamId}/members`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update member role");
  }
  return res.json();
}

async function createInvitation(teamId: string, email: string, role: string) {
  const res = await fetch(`/api/teams/${teamId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to send invitation");
  }
  return res.json();
}

async function deleteInvitation(teamId: string, invitationId: string) {
  const res = await fetch(`/api/teams/${teamId}/invitations`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitationId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete invitation");
  }
  return res.json();
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-800",
  admin: "bg-purple-100 text-purple-800",
  member: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [showInviteLinkDialog, setShowInviteLinkDialog] = useState(false);

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const { data: teamDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["team", selectedTeam],
    queryFn: () => fetchTeamDetails(selectedTeam!),
    enabled: !!selectedTeam,
  });

  const createMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: (data) => {
      toast.success("Team created successfully");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowCreateDialog(false);
      setNewTeamName("");
      setSelectedTeam(data.team.id);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      toast.success("Team deleted");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowDeleteDialog(false);
      setSelectedTeam(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      removeMember(teamId, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ teamId, memberId, role }: { teamId: string; memberId: string; role: string }) =>
      updateMemberRole(teamId, memberId, role),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: ({ teamId, email, role }: { teamId: string; email: string; role: string }) =>
      createInvitation(teamId, email, role),
    onSuccess: (data) => {
      toast.success("Invitation sent");
      setInviteLink(`${window.location.origin}/join?token=${data.invitation.token}`);
      setShowInviteDialog(false);
      setShowInviteLinkDialog(true);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: ({ teamId, invitationId }: { teamId: string; invitationId: string }) =>
      deleteInvitation(teamId, invitationId),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied to clipboard");
  };

  const isAdmin = teamDetails?.userRole === "owner" || teamDetails?.userRole === "admin";

  return (
    <>
      <Header
        title="Team"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Team" },
        ]}
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Team Management"
          description="Create teams, invite members, and collaborate together."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Teams List */}
          <div className="lg:col-span-1">
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="size-5" />
                    Your Teams
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    className="rounded-xl"
                  >
                    <Plus className="size-4 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingTeams ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="size-12 mx-auto text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No teams yet
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="size-4 mr-1" />
                      Create Team
                    </Button>
                  </div>
                ) : (
                  teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedTeam === team.id
                          ? "bg-taskly-orange text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className={`text-xs ${
                            selectedTeam === team.id ? "text-white/70" : "text-muted-foreground"
                          }`}>
                            {team.team_members?.[0]?.count ?? 0} members
                          </p>
                        </div>
                        {team.owner_id === "current_user" && (
                          <Crown className="size-4 text-yellow-500" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              loadingDetails ? (
                <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
                  <CardContent className="p-6">
                    <div className="h-64 rounded-xl bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ) : teamDetails ? (
                <div className="space-y-6">
                  {/* Team Header */}
                  <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl">{teamDetails.team.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Created {new Date(teamDetails.team.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowInviteDialog(true)}
                              className="rounded-xl"
                            >
                              <UserPlus className="size-4 mr-1" />
                              Invite
                            </Button>
                          )}
                          {teamDetails.userRole === "owner" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setShowDeleteDialog(true)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete Team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Members */}
                  <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="size-5" />
                        Members ({teamDetails.members?.length ?? 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamDetails.members?.map((member) => {
                          const RoleIcon = roleIcons[member.role] || User;
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-taskly-orange/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-taskly-orange">
                                    {member.user?.full_name?.[0]?.toUpperCase() || "?"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.user?.full_name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Joined {new Date(member.joined_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={roleColors[member.role]}>
                                  <RoleIcon className="size-3 mr-1" />
                                  {member.role}
                                </Badge>
                                {isAdmin && member.role !== "owner" && member.user_id !== "current_user" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="size-8">
                                        <MoreHorizontal className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateRoleMutation.mutate({
                                            teamId: selectedTeam,
                                            memberId: member.id,
                                            role: "admin",
                                          })
                                        }
                                        disabled={updateRoleMutation.isPending}
                                      >
                                        <Shield className="size-4 mr-2" />
                                        Make Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateRoleMutation.mutate({
                                            teamId: selectedTeam,
                                            memberId: member.id,
                                            role: "member",
                                          })
                                        }
                                        disabled={updateRoleMutation.isPending}
                                      >
                                        <User className="size-4 mr-2" />
                                        Make Member
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateRoleMutation.mutate({
                                            teamId: selectedTeam,
                                            memberId: member.id,
                                            role: "viewer",
                                          })
                                        }
                                        disabled={updateRoleMutation.isPending}
                                      >
                                        <Eye className="size-4 mr-2" />
                                        Make Viewer
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          removeMemberMutation.mutate({
                                            teamId: selectedTeam,
                                            memberId: member.id,
                                          })
                                        }
                                        disabled={removeMemberMutation.isPending}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="size-4 mr-2" />
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pending Invitations */}
                  {isAdmin && teamDetails.invitations && teamDetails.invitations.length > 0 && (
                    <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Mail className="size-5" />
                          Pending Invitations ({teamDetails.invitations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {teamDetails.invitations?.map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div>
                                <p className="font-medium">{invite.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Invited by {invite.inviter?.full_name || "Unknown"} •{" "}
                                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{invite.role}</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive"
                                  onClick={() =>
                                    deleteInviteMutation.mutate({
                                      teamId: selectedTeam,
                                      invitationId: invite.id,
                                    })
                                  }
                                  disabled={deleteInviteMutation.isPending}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null
            ) : (
              <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="size-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium">Select a team</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a team from the list or create a new one
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="size-4 mr-1" />
                    Create Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Teams help you collaborate with others on research, building, and growth projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="Engineering, Marketing, etc."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newTeamName)}
              disabled={createMutation.isPending || !newTeamName.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4 mr-1" />
              )}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member to {teamDetails?.team.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
              >
                <option value="member">Member - Can create and edit</option>
                <option value="admin">Admin - Can manage team</option>
                <option value="viewer">Viewer - Can only view</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createInviteMutation.mutate({
                  teamId: selectedTeam!,
                  email: inviteEmail,
                  role: inviteRole,
                })
              }
              disabled={createInviteMutation.isPending || !inviteEmail.includes("@")}
            >
              {createInviteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4 mr-1" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={showInviteLinkDialog} onOpenChange={setShowInviteLinkDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Invitation Link Created</DialogTitle>
            <DialogDescription>
              Share this link with your team member. The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="rounded-xl font-mono text-sm"
              />
              <Button onClick={copyInviteLink} variant="outline" className="rounded-xl">
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteLinkDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{teamDetails?.team.name}</strong>? This action cannot be undone and all team data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedTeam!)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-1" />
              )}
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
