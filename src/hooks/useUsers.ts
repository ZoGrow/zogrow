import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function useUsers() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const response = await supabase.functions.invoke("list-users", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.error && response.data?.users) {
          setUsers(response.data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [session?.access_token]);

  return { users, loading };
}
