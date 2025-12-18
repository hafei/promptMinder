'use client';
import { useState, useEffect, useRef } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play, StopCircle, Loader2, Info, PanelLeftClose, PanelLeftOpen, Copy, Check, Timer } from "lucide-react";
import { apiClient } from '@/lib/api-client';
import { replaceVariables } from '@/lib/promptVariables';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function MultiModelTestModal({
    open,
    onOpenChange,
    prompt,
    variableValues,
    availableModels,
    sharedParams,
    t
}) {
    const [selectedModels, setSelectedModels] = useState([]);
    const [testInput, setTestInput] = useState('');
    const [results, setResults] = useState({});
    const [isTesting, setIsTesting] = useState(false);
    const [controllers, setControllers] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [copiedModel, setCopiedModel] = useState(null);
    const timerRefs = useRef({});

    const mt = t?.promptDetailPage?.chatTest?.multiModelTest;

    useEffect(() => {
        if (availableModels.length > 0 && selectedModels.length === 0) {
            setSelectedModels([availableModels[0]]);
        }
    }, [availableModels, selectedModels.length]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(timerRefs.current).forEach(clearInterval);
        };
    }, []);

    const toggleModel = (model) => {
        setSelectedModels(prev =>
            prev.includes(model)
                ? prev.filter(m => m !== model)
                : [...prev, model]
        );
    };

    const handleRunTest = async () => {
        if (selectedModels.length === 0 || !testInput.trim()) return;

        setIsTesting(true);
        setResults({});
        const newControllers = {};

        // Reset timers
        Object.values(timerRefs.current).forEach(clearInterval);
        timerRefs.current = {};

        const testRequests = selectedModels.map(async (model) => {
            const controller = new AbortController();
            newControllers[model] = controller;

            const startTime = Date.now();

            setResults(prev => ({
                ...prev,
                [model]: { content: '', status: 'loading', duration: 0 }
            }));

            // Start duration timer
            timerRefs.current[model] = setInterval(() => {
                setResults(prev => ({
                    ...prev,
                    [model]: { ...prev[model], duration: (Date.now() - startTime) / 1000 }
                }));
            }, 100);

            try {
                const response = await apiClient.chat(
                    [{ role: 'user', content: testInput }],
                    {
                        ...sharedParams,
                        model,
                        systemPrompt: replaceVariables(prompt.content, variableValues),
                        signal: controller.signal
                    }
                );

                if (!response.ok) throw new Error('Request failed');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulated = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    accumulated += decoder.decode(value, { stream: true });
                    setResults(prev => ({
                        ...prev,
                        [model]: { ...prev[model], content: accumulated, status: 'streaming' }
                    }));
                }

                clearInterval(timerRefs.current[model]);
                const finalDuration = (Date.now() - startTime) / 1000;

                setResults(prev => ({
                    ...prev,
                    [model]: { ...prev[model], status: 'done', duration: finalDuration }
                }));
            } catch (error) {
                clearInterval(timerRefs.current[model]);
                const finalDuration = (Date.now() - startTime) / 1000;

                if (error.name === 'AbortError') {
                    setResults(prev => ({
                        ...prev,
                        [model]: { ...prev[model], status: 'stopped', duration: finalDuration }
                    }));
                } else {
                    setResults(prev => ({
                        ...prev,
                        [model]: { ...prev[model], status: 'error', error: error.message, duration: finalDuration }
                    }));
                }
            }
        });

        setControllers(newControllers);
        // Auto-collapse sidebar when starting test to focus on results
        if (selectedModels.length > 2) setIsSidebarOpen(false);

        await Promise.all(testRequests);
        setIsTesting(false);
    };

    const handleStopTest = () => {
        Object.values(controllers).forEach(c => c.abort());
        setIsTesting(false);
        setControllers({});
        Object.values(timerRefs.current).forEach(clearInterval);
    };

    const handleCopy = (model) => {
        const content = results[model]?.content;
        if (!content) return;

        navigator.clipboard.writeText(content).then(() => {
            setCopiedModel(model);
            setTimeout(() => setCopiedModel(null), 2000);
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-[95vw] w-full flex flex-col p-0">
                <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div>
                        <SheetTitle className="text-xl">{mt?.title}</SheetTitle>
                        <SheetDescription className="line-clamp-1">{mt?.description}</SheetDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden md:flex"
                    >
                        {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                    </Button>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: Config */}
                    <div className={cn(
                        "border-r transition-all duration-300 ease-in-out overflow-y-auto bg-muted/10",
                        isSidebarOpen ? "w-full md:w-72 p-6" : "w-0 p-0 overflow-hidden border-r-0"
                    )}>
                        <div className="space-y-6 min-w-[240px]">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-foreground/80">{mt?.selectModels}</h3>
                                <div className="space-y-2.5">
                                    {availableModels.map(model => (
                                        <div key={model} className="flex items-center space-x-2 rounded-md hover:bg-muted/50 p-1 -ml-1 transition-colors">
                                            <Checkbox
                                                id={`model-${model}`}
                                                checked={selectedModels.includes(model)}
                                                onCheckedChange={() => toggleModel(model)}
                                            />
                                            <label
                                                htmlFor={`model-${model}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                            >
                                                {model}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-1">
                                    {mt?.sharedParams}
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                                </h3>
                                <div className="grid grid-cols-1 gap-2.5 text-xs text-muted-foreground">
                                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                                        <span>Temperature</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{sharedParams?.temperature}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                                        <span>Max Tokens</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{sharedParams?.maxTokens}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span>Top P</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{sharedParams?.topP}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Area: Input and Results */}
                    <div className="flex-1 flex flex-col min-w-0 bg-muted/5 relative">
                        {!isSidebarOpen && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsSidebarOpen(true)}
                                className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full bg-background shadow-md border-border md:flex hidden hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                                <PanelLeftOpen className="h-3 w-3" />
                            </Button>
                        )}

                        <div className="p-4 border-b space-y-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                            <Textarea
                                placeholder={mt?.inputPlaceholder}
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                className="min-h-[80px] md:min-h-[100px] resize-none focus-visible:ring-primary/20 transition-all border-muted-foreground/20"
                            />
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-muted-foreground font-medium">
                                    {selectedModels.length} {mt?.selectModels}
                                </div>
                                <div className="flex space-x-2">
                                    {isTesting ? (
                                        <Button variant="destructive" onClick={handleStopTest} className="gap-2 h-9 px-4">
                                            <StopCircle className="h-4 w-4" />
                                            {mt?.stopTest}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleRunTest}
                                            disabled={selectedModels.length === 0 || !testInput.trim()}
                                            className="gap-2 h-9 px-6 shadow-sm hover:shadow transition-all"
                                        >
                                            <Play className="h-4 w-4" />
                                            {mt?.runTest}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4 md:p-6">
                            <TooltipProvider>
                                <div className={cn(
                                    "grid gap-6 pb-6",
                                    isSidebarOpen
                                        ? "grid-cols-1 lg:grid-cols-2"
                                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                )}>
                                    {selectedModels.map(model => (
                                        <Card key={model} className="flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-200 border-border/60 overflow-hidden group bg-background">
                                            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b bg-muted/30 group-hover:bg-muted/50 transition-colors">
                                                <CardTitle className="text-sm font-bold text-foreground/80 truncate mr-2" title={model}>
                                                    {model}
                                                </CardTitle>
                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                    {results[model]?.duration > 0 && (
                                                        <div className="flex items-center text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">
                                                            <Timer className="h-2.5 w-2.5 mr-1 opacity-60" />
                                                            {results[model].duration.toFixed(1)}s
                                                        </div>
                                                    )}
                                                    {results[model]?.content && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                                    onClick={() => handleCopy(model)}
                                                                >
                                                                    {copiedModel === model ? (
                                                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                                                    ) : (
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">Copy Output</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    <div className="flex items-center ml-1">
                                                        {results[model]?.status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                                                        {results[model]?.status === 'streaming' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                                                        {results[model]?.status === 'done' && <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />}
                                                        {results[model]?.status === 'stopped' && <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0 flex-1 flex flex-col bg-background/50">
                                                <ScrollArea className="flex-1 max-h-[400px] md:max-h-[500px]">
                                                    <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                                        {results[model]?.content || (
                                                            results[model]?.status === 'loading' ?
                                                                <span className="text-muted-foreground italic flex items-center gap-2 animate-pulse">
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    {mt?.loading}
                                                                </span> :
                                                                <span className="text-muted-foreground/30 italic">Waiting for response...</span>
                                                        )}
                                                        {results[model]?.error && (
                                                            <div className="mt-2 p-3 rounded-md bg-destructive/5 text-destructive text-xs border border-destructive/10 flex items-start gap-2">
                                                                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive/80" />
                                                                <div className="flex-1">
                                                                    <p className="font-semibold mb-0.5">{mt?.error}</p>
                                                                    <p className="opacity-90">{results[model].error}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {selectedModels.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/5 rounded-xl border border-dashed border-border/50">
                                            <Info className="h-10 w-10 opacity-10" />
                                            <p className="text-sm font-medium">{mt?.noModelsSelected}</p>
                                        </div>
                                    )}
                                </div>
                            </TooltipProvider>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
