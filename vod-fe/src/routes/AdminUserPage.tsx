import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useListUsers } from "@/hooks/User/useListUsers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateUserMutation } from "@/hooks/User/useCreateUser";
import { useUpdateUserRolesMutation } from "@/hooks/User/useUpdateUserRoles";
import { useDeleteUserMutation } from "@/hooks/User/useDeleteUser";

// Data is loaded via React Query hook

export default function AdminUserPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const { data: paged, isLoading, isFetching } = useListUsers(page - 1, pageSize);
  // Add User dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const createUser = useCreateUserMutation();

  // Edit Roles dialog state
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleAdmin, setRoleAdmin] = useState(false);
  const updateRoles = useUpdateUserRolesMutation();
  const deleteUser = useDeleteUserMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUserName, setDeleteUserName] = useState("");

  const filteredUsers = useMemo(() => {
    const rows = paged?.rows ?? [];
    return rows.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [paged, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalPages = paged?.totalPages ?? 1;
  const totalElements = paged?.totalElements ?? 0;
  const pageUsers = filteredUsers;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-foreground">Users</h2>
            
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>Create a new user account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-add-username">Username</Label>
                  <Input id="admin-add-username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-add-email">Email</Label>
                  <Input id="admin-add-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-add-password">Password</Label>
                  <Input id="admin-add-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="admin-add-isAdmin" checked={newIsAdmin} onCheckedChange={(v) => setNewIsAdmin(!!v)} />
                  <Label htmlFor="admin-add-isAdmin">Grant Admin role</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      await createUser.mutateAsync({ username: newUsername, email: newEmail, password: newPassword, isAdmin: newIsAdmin });
                      setAddOpen(false);
                      setNewUsername("");
                      setNewEmail("");
                      setNewPassword("");
                      setNewIsAdmin(false);
                    }}
                    disabled={createUser.isPending || !newUsername || !newEmail || !newPassword}
                  >
                    {createUser.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle></CardTitle>
              <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading users...</div>
            ) : (
            <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "Admin" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.joinDate}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>View</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedUserId(user.id);
                              setRoleAdmin(user.role === "Admin");
                              setRolesOpen(true);
                            }}
                          >
                            Edit roles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedUserId(user.id);
                              setDeleteUserName(user.name);
                              setDeleteOpen(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {Math.min(page, totalPages)} of {totalPages} — {totalElements} users {isFetching ? "(updating...)" : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Edit Roles Dialog */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roles</DialogTitle>
            <DialogDescription>Grant or revoke admin privileges for this user.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox id="roles-admin" checked={roleAdmin} onCheckedChange={(v) => setRoleAdmin(!!v)} />
            <Label htmlFor="roles-admin">ROLE_ADMIN</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRolesOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedUserId) return;
                const roles: ("ROLE_USER" | "ROLE_ADMIN")[] = roleAdmin ? ["ROLE_USER", "ROLE_ADMIN"] : ["ROLE_USER"];
                await updateRoles.mutateAsync({ userId: selectedUserId, roles });
                setRolesOpen(false);
              }}
              disabled={updateRoles.isPending}
            >
              {updateRoles.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{deleteUserName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedUserId) return;
                await deleteUser.mutateAsync(selectedUserId);
                setDeleteOpen(false);
              }}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
