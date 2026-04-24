import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, ArrowUpRight, Building2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";

interface Client {
  id: string;
  client_name: string;
  market: string;
  state: string;
  niche: string;
  status: string;
  user_id: string | null;
}

export default function Clients() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const { users } = useUsers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state for new client
  const [newClientName, setNewClientName] = useState("");
  const [newMarket, setNewMarket] = useState("");
  const [newState, setNewState] = useState("");
  const [newNiche, setNewNiche] = useState("FTHB");
  const [newUserId, setNewUserId] = useState<string>("");

  // Build a map of user_id to user info for display
  const userMap = useMemo(() => {
    const map = new Map<string, { email: string; fullName: string }>();
    users.forEach(u => map.set(u.id, { email: u.email, fullName: u.fullName }));
    return map;
  }, [users]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("client_name");
    
    if (error) {
      toast.error("Failed to load clients");
      console.error(error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to delete client");
      console.error(error);
    } else {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      toast.success(`${clientName} has been deleted`);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newMarket.trim() || !newState.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        client_name: newClientName.trim(),
        market: newMarket.trim(),
        state: newState.trim(),
        niche: newNiche,
        status: "active",
        user_id: isAdmin && newUserId ? newUserId : user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add client");
      console.error(error);
    } else if (data) {
      setClients((prev) => [...prev, data]);
      toast.success(`${newClientName} has been added`);
      setNewClientName("");
      setNewMarket("");
      setNewState("");
      setNewNiche("FTHB");
      setNewUserId("");
      setIsAddDialogOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleAssignUser = async (clientId: string, userId: string | null) => {
    const { error } = await supabase
      .from("clients")
      .update({ user_id: userId })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to assign user");
      console.error(error);
    } else {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, user_id: userId } : c))
      );
      toast.success("Client assigned successfully");
    }
  };

  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("clients")
      .update({ status: newStatus })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to update status");
      console.error(error);
    } else {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      toast.success(`Client set to ${newStatus}`);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.client_name.toLowerCase().includes(search.toLowerCase()) ||
        client.market.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesNiche = nicheFilter === "all" || client.niche === nicheFilter;
      return matchesSearch && matchesStatus && matchesNiche;
    });
  }, [clients, search, statusFilter, nicheFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
              {clients.filter((c) => c.status === "active").length} active
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage and view all client accounts" : "View your assigned clients"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Enter the details for the new client account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Input
                  id="market"
                  placeholder="e.g., Dallas, Houston"
                  value={newMarket}
                  onChange={(e) => setNewMarket(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="e.g., TX, CA"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche">Niche</Label>
                <Select value={newNiche} onValueChange={setNewNiche}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FTHB">First-Time Homebuyer</SelectItem>
                    <SelectItem value="Downsizer">Downsizer</SelectItem>
                    <SelectItem value="New Construction">New Construction</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="assignUser">Assign to User</Label>
                  <Select value={newUserId} onValueChange={setNewUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleAddClient} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-secondary border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Niche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Niches</SelectItem>
            <SelectItem value="FTHB">First-Time Homebuyer</SelectItem>
            <SelectItem value="Downsizer">Downsizer</SelectItem>
            <SelectItem value="New Construction">New Construction</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {client.client_name}
                    </h3>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {client.market}, {client.state}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Badge 
                    variant={client.status === 'active' ? 'default' : 'secondary'}
                    className={`cursor-pointer ${client.status === 'active' 
                      ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(client.id, client.status);
                    }}
                  >
                    {client.status}
                  </Badge>
                ) : (
                  <Badge 
                    variant={client.status === 'active' ? 'default' : 'secondary'}
                    className={client.status === 'active' 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-muted text-muted-foreground'
                    }
                  >
                    {client.status}
                  </Badge>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {client.client_name}? This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDeleteClient(client.id, client.client_name)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="outline" className="text-xs border-border">
                {client.niche}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No clients found</h3>
          <p className="text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
