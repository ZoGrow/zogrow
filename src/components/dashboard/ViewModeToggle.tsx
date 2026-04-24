import { Eye, EyeOff, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useViewMode } from "@/contexts/ViewModeContext";
import { cn } from "@/lib/utils";

export function ViewModeToggle() {
  const { viewMode, setViewMode, hideAgencyAvg, setHideAgencyAvg } = useViewMode();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "gap-2",
            viewMode === 'client' && "bg-primary/10 border-primary/30 text-primary"
          )}
        >
          {viewMode === 'admin' ? (
            <>
              <Users className="h-4 w-4" />
              Admin View
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              Client View
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">View Mode</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'admin' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setViewMode('admin')}
              >
                <Users className="h-4 w-4 mr-1" />
                Admin
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'client' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setViewMode('client')}
              >
                <User className="h-4 w-4 mr-1" />
                Client
              </Button>
            </div>
          </div>
          
          {viewMode === 'client' && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Label htmlFor="hide-avg" className="text-sm text-muted-foreground">
                Hide agency averages
              </Label>
              <Switch
                id="hide-avg"
                checked={hideAgencyAvg}
                onCheckedChange={setHideAgencyAvg}
              />
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {viewMode === 'admin' 
              ? 'Full access to all clients and agency data.'
              : 'Client view hides other clients and internal notes.'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
