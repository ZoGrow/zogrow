import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "ceo" | "admin" | "moderator" | "isa" | "user";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
      setLoading(false);
    }

    fetchRole();
  }, [user]);

  // CEO has full control over everything
  const isCeo = role === "ceo";
  // Admin has full access (CEO or admin)
  const isAdmin = role === "ceo" || role === "admin";
  // Moderator access (CEO, admin, or moderator)
  const isModerator = role === "ceo" || role === "admin" || role === "moderator";
  // ISA can manage all clients but can't see Frontend Sales
  const isIsa = role === "isa";
  // Can manage all clients (CEO, admin, ISA)
  const canManageAllClients = role === "ceo" || role === "admin" || role === "isa";
  // Can view Frontend Sales (everyone except ISA and regular users)
  const canViewSales = role === "ceo" || role === "admin" || role === "moderator";

  return { role, isCeo, isAdmin, isModerator, isIsa, canManageAllClients, canViewSales, loading };
}
