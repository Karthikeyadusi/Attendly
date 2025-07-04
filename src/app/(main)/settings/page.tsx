

"use client";

import { useRef, useState, useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { BackupData } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { THEMES, useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/components/ThemeProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BACKUP_VERSION = 1;

const themeColors: Record<Theme, string> = {
  Navy: 'hsl(207 44% 49%)',
  Forest: 'hsl(142 76% 36%)',
  Rose: 'hsl(347 77% 50%)',
  Zinc: 'hsl(240 6% 10%)'
}

export default function SettingsPage() {
  const { getBackupData, restoreFromBackup, isLoaded, userName, setUserName } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<BackupData | null>(null);
  const [name, setName] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isLoaded) {
      setName(userName || '');
    }
  }, [isLoaded, userName]);

  const handleNameSave = () => {
    setUserName(name);
    toast({
      title: "Profile Updated",
      description: "Your name has been saved.",
    });
  };

  const handleExport = () => {
    if (!isLoaded) return;
    const backupData = getBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `attendly-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Your data has been saved to your downloads folder.",
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not readable");
        const parsedData = JSON.parse(text);

        // Basic validation
        if (
          parsedData.version !== BACKUP_VERSION ||
          !Array.isArray(parsedData.subjects) ||
          !Array.isArray(parsedData.timetable) ||
          !Array.isArray(parsedData.attendance)
        ) {
          throw new Error("Invalid backup file format.");
        }

        setBackupToRestore(parsedData);
        setIsImportConfirmOpen(true);

      } catch (error) {
        console.error("Import failed:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error instanceof Error ? error.message : "The selected file is not a valid backup.",
        });
      } finally {
        // Reset file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (backupToRestore) {
      restoreFromBackup(backupToRestore);
      toast({
        title: "Import Successful",
        description: "Your data has been restored from the backup file.",
      });
    }
    setIsImportConfirmOpen(false);
    setBackupToRestore(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            This name will be used to personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-grow space-y-2">
              <Label htmlFor="name-input">Your Name</Label>
              <Input
                id="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name or nickname"
              />
            </div>
            <Button onClick={handleNameSave} disabled={!isLoaded || name === (userName || '') || !name.trim()}>Save</Button>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Select a theme for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((themeName) => (
                  <SelectItem key={themeName} value={themeName}>
                     <div className="flex items-center gap-2">
                        <div className="mr-2 h-4 w-4 rounded-full border" style={{ backgroundColor: themeColors[themeName] }} />
                        <span>{themeName}</span>
                     </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Restore</CardTitle>
          <CardDescription>
            Export your data to a file to keep it safe or move it to another device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="application/json"
          />
           <p className="text-xs text-center text-muted-foreground pt-2">
            Importing data will overwrite all current subjects, timetable, and attendance records.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently overwrite all your current data with the contents of the backup file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBackupToRestore(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Yes, Overwrite and Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
