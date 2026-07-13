"use client";

import { Cloud, RefreshCw, CloudOff, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SyncStatus } from "@/types";

const config: Record<SyncStatus, { icon: React.ElementType; color: string; label: string }> = {
  idle:    { icon: Cloud,        color: "text-muted-foreground",        label: "Sync Idle"   },
  syncing: { icon: RefreshCw,    color: "text-blue-500 animate-spin",   label: "Syncing..."  },
  synced:  { icon: Cloud,        color: "text-green-500",               label: "Up to Date"  },
  offline: { icon: CloudOff,     color: "text-muted-foreground",        label: "Offline"     },
  error:   { icon: AlertCircle,  color: "text-destructive",             label: "Sync Error"  },
};

export default function SyncIndicator({ status }: { status: SyncStatus }) {
  const { icon: Icon, color, label } = config[status];
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`h-5 w-5 ${color}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
