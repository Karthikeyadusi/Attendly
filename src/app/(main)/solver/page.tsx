
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileQuestion } from 'lucide-react';

// Placeholder data for demonstration purposes
const placeholderQuestions = [
    { id: 1, text: 'Explain the process of photosynthesis in detail.', marks: 14 },
    { id: 2, text: 'What is the capital of France?', marks: 2 },
    { id: 3, text: 'Summarize the plot of Hamlet.', marks: 7 },
    { id: 4, text: 'Define the term "Inertia".', marks: 2 },
    { id: 5, text: 'Describe the water cycle with a diagram.', marks: 7 },
    { id: 6, text: 'What are the main causes of World War I?', marks: 14 },
    { id: 7, text: 'List two properties of a proton.', marks: 2 },
    { id: 8, text: 'Explain the difference between hardware and software.', marks: 7 },
];

type MarkFilter = 2 | 7 | 14 | 'All';

export default function SolverPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [markFilter, setMarkFilter] = useState<MarkFilter>('All');

    const filteredQuestions = useMemo(() => {
        return placeholderQuestions.filter(q => {
            const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = markFilter === 'All' || q.marks === markFilter;
            return matchesSearch && matchesFilter;
        });
    }, [searchTerm, markFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Question Solver</h2>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Analyze a Question Paper</CardTitle>
                    <CardDescription>
                        Upload a question paper to get started. For now, you can test the filters with the sample questions below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full">
                        <FileQuestion className="mr-2 h-4 w-4" />
                        Upload Question Paper
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Extracted Questions</CardTitle>
                    <CardDescription>
                        Use the search and filters to find specific questions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search questions..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(['All', 2, 7, 14] as const).map(m => (
                             <Button 
                                key={m}
                                variant={markFilter === m ? 'default' : 'outline'}
                                onClick={() => setMarkFilter(m)}
                             >
                                {m === 'All' ? 'All' : `${m} Marks`}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-3 pt-4">
                        {filteredQuestions.length > 0 ? (
                            filteredQuestions.map(q => (
                                <div key={q.id} className="p-3 border rounded-lg flex justify-between items-start bg-card-foreground/5">
                                    <p className="pr-4">{q.text}</p>
                                    <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                                        {q.marks}m
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-8">
                                No questions match your criteria.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
