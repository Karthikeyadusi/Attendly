
"use client";

import { useRef, useState, useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, LogIn, LogOut, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { BackupData } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { firebaseEnabled } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const BACKUP_VERSION = 1;

export default function SettingsPage() {
  const { 
    isLoaded, 
    userName, 
    setUserName,
    user,
    signIn,
    signOutUser,
    getBackupData,
    restoreFromBackup,
    forceCloudSync,
    clearAllData,
  } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<BackupData | null>(null);
  const [name, setName] = useState('');

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
  
  const handleConfirmClear = () => {
    clearAllData();
    setIsClearConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Cloud Sync</CardTitle>
          <CardDescription>
            {firebaseEnabled
              ? "Sign in to automatically back up and sync your data across devices."
              : "Cloud Sync is not configured."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoaded ? (
            <Skeleton className="h-14 w-full" />
          ) : !firebaseEnabled ? (
            <Alert>
              <CloudOff className="h-4 w-4" />
              <AlertTitle>Feature Disabled</AlertTitle>
              <AlertDescription>
                To enable cloud sync, provide your Firebase keys in your environment variables.
              </AlertDescription>
            </Alert>
          ) : user ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'}/>
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button onClick={forceCloudSync} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync
                </Button>
                <Button onClick={signOutUser} variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={signIn} className="w-full h-12 text-base">
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
          )}
        </CardContent>
      </Card>
      
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
          <CardTitle>Manual Backup</CardTitle>
          <CardDescription>
            Manually export your data to a file. This is not needed if you are signed in.
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

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
           <CardDescription>
            This action is irreversible. Please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" className="w-full" onClick={() => setIsClearConfirmOpen(true)}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
             <p className="text-xs text-center text-muted-foreground pt-4">
                This will permanently delete all data from this device and the cloud if you are signed in.
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

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your data, including subjects, timetable, and attendance history. If you are signed in, this data will also be deleted from the cloud. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClear} className="bg-destructive hover:bg-destructive/90">
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
