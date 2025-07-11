
"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractQuestions, type ExtractQuestionsOutput } from "@/ai/flows/extract-questions-flow";
import { Loader2, Upload, Sparkles, FileText, ClipboardCopy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Question = ExtractQuestionsOutput["questions"][0];

export default function SolverPage() {
  const { toast } = useToast();
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a file smaller than 4MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setDocumentPreview(URL.createObjectURL(file));
        setDocumentData(dataUrl);
        setExtractedQuestions([]); // Clear previous results
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!documentData) return;
    setIsLoading(true);
    setExtractedQuestions([]);
    try {
      const result = await extractQuestions({ documentDataUri: documentData });
      if (result && result.questions.length > 0) {
        setExtractedQuestions(result.questions);
        toast({
            title: "Analysis Complete",
            description: `Successfully extracted ${result.questions.length} questions.`,
        });
      } else {
        toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "Could not extract any questions. Please try another file or a clearer image.",
        });
      }
    } catch (error) {
      console.error("Question extraction failed:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Failed to analyze the document. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied!",
        description: "Question text copied to clipboard.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">AI Question Paper Solver</h2>
        <p className="text-muted-foreground">Upload a question paper to get started.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Upload and Preview */}
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Step 1: Upload Question Paper</CardTitle>
                </CardHeader>
                <CardContent>
                    <div 
                        className="relative w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {documentPreview ? (
                            <Image src={documentPreview} alt="Question paper preview" fill={true} className="rounded-lg object-contain p-2" />
                        ) : (
                            <div className="text-center">
                                <Upload className="mx-auto h-12 w-12" />
                                <p>Click to upload Image or PDF</p>
                                <p className="text-xs">(Max 4MB)</p>
                            </div>
                        )}
                    </div>
                    <Input id="timetable-upload" ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                    <Button onClick={handleAnalyze} disabled={!documentData || isLoading} className="w-full mt-4">
                        {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                        {isLoading ? "Analyzing..." : "Analyze Paper"}
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Extracted Questions */}
        <div className="space-y-4">
            <Card className="min-h-[400px]">
                <CardHeader>
                    <CardTitle>Extracted Questions</CardTitle>
                    <CardDescription>Review the questions extracted by the AI.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[280px] pr-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : extractedQuestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                <FileText className="w-10 h-10 mb-2" />
                                <p>Analysis results will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {extractedQuestions.map((q, index) => (
                                    <div key={index} className="p-3 border rounded-lg flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="font-semibold">{q.questionNumber}. <span className="font-normal">{q.questionText}</span></p>
                                            <p className="text-sm text-primary font-medium mt-1">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => copyToClipboard(q.questionText)}>
                                            <ClipboardCopy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
