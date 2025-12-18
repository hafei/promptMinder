'use client';
import { useState, useEffect } from 'react';
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
import { Play, StopCircle, Loader2, Info } from "lucide-react";
import { apiClient } from '@/lib/api-client';
import { replaceVariables } from '@/lib/promptVariables';

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

    const mt = t?.promptDetailPage?.chatTest?.multiModelTest;

    useEffect(() => {
        if (availableModels.length > 0 && selectedModels.length === 0) {
            setSelectedModels([availableModels[0]]);
        }
    }, [availableModels, selectedModels.length]);

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

        const testRequests = selectedModels.map(async (model) => {
            const controller = new AbortController();
            newControllers[model] = controller;

            setResults(prev => ({
                ...prev,
                [model]: { content: '', status: 'loading' }
            }));

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
                        [model]: { content: accumulated, status: 'streaming' }
                    }));
                }

                setResults(prev => ({
                    ...prev,
                    [model]: { ...prev[model], status: 'done' }
                }));
            } catch (error) {
                if (error.name === 'AbortError') {
                    setResults(prev => ({
                        ...prev,
                        [model]: { ...prev[model], status: 'stopped' }
                    }));
                } else {
                    setResults(prev => ({
                        ...prev,
                        [model]: { ...prev[model], status: 'error', error: error.message }
                    }));
                }
            }
        });

        setControllers(newControllers);
        await Promise.all(testRequests);
        setIsTesting(false);
    };

    const handleStopTest = () => {
        Object.values(controllers).forEach(c => c.abort());
        setIsTesting(false);
        setControllers({});
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-[90vw] w-full flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle>{mt?.title}</SheetTitle>
                    <SheetDescription>{mt?.description}</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: Config */}
                    <div className="w-full md:w-72 border-r p-6 space-y-6 overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="font-medium text-sm">{mt?.selectModels}</h3>
                            <div className="space-y-2">
                                {availableModels.map(model => (
                                    <div key={model} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`model-${model}`}
                                            checked={selectedModels.includes(model)}
                                            onCheckedChange={() => toggleModel(model)}
                                        />
                                        <label
                                            htmlFor={`model-${model}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {model}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-medium text-sm flex items-center gap-1">
                                {mt?.sharedParams}
                                <Info className="h-3 w-3 text-muted-foreground" />
                            </h3>
                            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Temperature</span>
                                    <span className="font-mono">{sharedParams?.temperature}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Max Tokens</span>
                                    <span className="font-mono">{sharedParams?.maxTokens}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Top P</span>
                                    <span className="font-mono">{sharedParams?.topP}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Area: Input and Results */}
                    <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
                        <div className="p-6 border-b space-y-4 bg-background">
                            <Textarea
                                placeholder={mt?.inputPlaceholder}
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                className="min-h-[100px] resize-none"
                            />
                            <div className="flex justify-end space-x-2">
                                {isTesting ? (
                                    <Button variant="destructive" onClick={handleStopTest} className="gap-2">
                                        <StopCircle className="h-4 w-4" />
                                        {mt?.stopTest}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleRunTest}
                                        disabled={selectedModels.length === 0 || !testInput.trim()}
                                        className="gap-2"
                                    >
                                        <Play className="h-4 w-4" />
                                        {mt?.runTest}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-6">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6">
                                {selectedModels.map(model => (
                                    <Card key={model} className="flex flex-col h-fit shadow-sm border-border/40 overflow-hidden">
                                        <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
                                            <CardTitle className="text-sm font-semibold text-primary/80">{model}</CardTitle>
                                            {results[model]?.status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                                            {results[model]?.status === 'streaming' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                                            {results[model]?.status === 'done' && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                        </CardHeader>
                                        <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[120px] bg-background">
                                            {results[model]?.content || (
                                                results[model]?.status === 'loading' ?
                                                    <span className="text-muted-foreground italic flex items-center gap-2">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        {mt?.loading}
                                                    </span> :
                                                    <span className="text-muted-foreground italic opacity-50">Waiting for input...</span>
                                            )}
                                            {results[model]?.error && (
                                                <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                                                    <Info className="h-3 w-3 mt-0.5" />
                                                    <span>{mt?.error}: {results[model].error}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
