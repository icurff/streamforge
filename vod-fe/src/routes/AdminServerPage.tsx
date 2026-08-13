import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Server as ServerIcon,
  Activity,
  HardDrive,
  Cpu,
} from "lucide-react";
import { useListServers } from "@/hooks/Server/useListServers";
import { useCreateServerMutation } from "@/hooks/Server/useCreateServer";
import { useUpdateServerMutation } from "@/hooks/Server/useUpdateServer";
import { useDeleteServerMutation } from "@/hooks/Server/useDeleteServer";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function AdminServerPage() {
  const { data, isLoading, isError } = useListServers();
  const { mutateAsync: createServer, isPending: isCreating } = useCreateServerMutation();
  const { mutateAsync: updateServer, isPending: isUpdating } = useUpdateServerMutation();
  const { mutateAsync: deleteServer, isPending: isDeleting } = useDeleteServerMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isMutating = useMemo(() => isCreating || isUpdating || isDeleting, [isCreating, isUpdating, isDeleting]);

  function openAddDialog() {
    setName("");
    setIp("");
    setAddOpen(true);
  }

  function openEditDialog(server: { id: string; name: string; location: string }) {
    setEditingId(server.id);
    setName(server.name ?? "");
    setIp(server.location ?? "");
    setEditOpen(true);
  }

  async function handleSubmitAdd() {
    await createServer({ name, ip });
    setAddOpen(false);
  }

  async function handleSubmitEdit() {
    if (!editingId) return;
    await updateServer({ serverId: editingId, name, ip });
    setEditOpen(false);
    setEditingId(null);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    await deleteServer(confirmDeleteId);
    setConfirmDeleteId(null);
  }
  const servers = data?.rows ?? [];
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Servers</h1>
            <p className="text-muted-foreground">
             
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Server</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="server-name">Name</Label>
                  <Input id="server-name" placeholder="My Server" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="server-ip">IP</Label>
                  <Input id="server-ip" placeholder="192.168.1.10" value={ip} onChange={(e) => setIp(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={isMutating}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitAdd} disabled={!name || !ip || isMutating}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading servers...</div>
        )}
        {isError && (
          <div className="text-sm text-red-500">Failed to load servers.</div>
        )}
        {!isLoading && !isError && servers.length > 0 && (
          <>
            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* CPU Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-blue-500" />
                    CPU Usage by Server
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={servers.map((s) => ({
                        name: s.name,
                        usage: parseFloat(s.cpu.toFixed(1)),
                        cores: s.cpuCores,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${value}%${props.payload.cores > 0 ? ` (${props.payload.cores} cores)` : ""}`,
                          "CPU Usage",
                        ]}
                      />
                      <Bar dataKey="usage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Memory Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Memory (RAM) Usage by Server
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={servers.map((s) => ({
                        name: s.name,
                        usage: parseFloat(s.memory.toFixed(1)),
                        total: s.ramTotal,
                        used: s.ramTotal > 0 ? (s.ramTotal * s.memory / 100).toFixed(1) : 0,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${value}%${props.payload.total > 0 ? ` (${props.payload.used} GB / ${props.payload.total} GB)` : ""}`,
                          "Memory Usage",
                        ]}
                      />
                      <Bar dataKey="usage" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Disk Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-purple-500" />
                    Disk Usage by Server
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={servers.map((s) => ({
                        name: s.name,
                        usage: parseFloat(s.disk.toFixed(1)),
                        total: s.diskTotal,
                        used: s.diskTotal > 0 ? (s.diskTotal * s.disk / 100).toFixed(1) : 0,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${value}%${props.payload.total > 0 ? ` (${props.payload.used} GB / ${props.payload.total} GB)` : ""}`,
                          "Disk Usage",
                        ]}
                      />
                      <Bar dataKey="usage" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Combined Resource Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServerIcon className="h-5 w-5 text-orange-500" />
                    Combined Resource Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={servers.map((s) => ({
                        name: s.name,
                        CPU: parseFloat(s.cpu.toFixed(1)),
                        Memory: parseFloat(s.memory.toFixed(1)),
                        Disk: parseFloat(s.disk.toFixed(1)),
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis domain={[0, 100]} label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="CPU" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="Memory" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="Disk" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Server Management Table */}
            <Card>
              <CardHeader>
                <CardTitle>Server Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Server Name</th>
                        <th className="text-left p-2">IP Address</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">CPU</th>
                        <th className="text-left p-2">Memory</th>
                        <th className="text-left p-2">Disk</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servers.map((server) => (
                        <tr key={server.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{server.name}</td>
                          <td className="p-2 text-muted-foreground">{server.location}</td>
                          <td className="p-2">
                            <Badge
                              variant={
                                server.status?.toUpperCase() === "UP" || server.status?.toUpperCase() === "ONLINE"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {server.status}
                            </Badge>
                          </td>
                          <td className="p-2">{server.cpu.toFixed(1)}%</td>
                          <td className="p-2">{server.memory.toFixed(1)}%</td>
                          <td className="p-2">{server.disk.toFixed(1)}%</td>
                          <td className="p-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">Actions</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(server)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDeleteId(server.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {!isLoading && !isError && servers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No servers found. Add a server to get started.</p>
            </CardContent>
          </Card>
        )}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Server</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-server-name">Name</Label>
                <Input id="edit-server-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-server-ip">IP</Label>
                <Input id="edit-server-ip" value={ip} onChange={(e) => setIp(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={isMutating}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={!name || !ip || isMutating}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete server?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isMutating} onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete} disabled={isMutating}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
