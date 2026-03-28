"use client";

import { useState, useRef } from "react";
import { Camera, Phone, ShieldAlert, Activity, ClipboardList, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { submitTriageImage, TriageResult } from "./actions/triage";

type UIState = "IDLE" | "THINKING" | "RESULT" | "ERROR";

export default function Home() {
  const [uiState, setUiState] = useState<UIState>("IDLE");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUiState("THINKING");
    setProgress(20);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result as string;
        setProgress(60);

        const triageData = await submitTriageImage(base64String, file.type);
        setResult(triageData);
        setProgress(100);

        setTimeout(() => setUiState("RESULT"), 500); // Smooth transition
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to analyze image. Please try again or Call 911 immediately if critical.");
        setUiState("ERROR");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
      setUiState("ERROR");
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setUiState("IDLE");
    setResult(null);
    setProgress(0);
  };

  const getUrgencyColor = (urgency: TriageResult["urgency"] | undefined) => {
    switch (urgency) {
      case "immediate":
      case "CRITICAL": return "bg-red-600 text-white border-red-800";
      case "URGENT": return "bg-yellow-500 text-yellow-950 border-yellow-700";
      case "STABLE": return "bg-emerald-600 text-white border-emerald-800";
      default: return "bg-gray-600 text-white";
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0,rgba(220,220,220,0.5)_100%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        {uiState === "IDLE" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md flex flex-col items-center gap-8 z-10"
          >
            <div className="text-center space-y-4">
              <ShieldAlert className="w-16 h-16 mx-auto text-primary" />
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Emergency Intake</h1>
              <p className="text-muted-foreground text-lg">Tap below to rapidly triage a medical situation.</p>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Upload Medical Photo"
              className="hidden"
              ref={fileInputRef}
              onChange={handleUpload}
            />

            <Button
              size="lg"
              className="w-full h-32 text-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-3xl shadow-[0_10px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Take Photo for Triage Analysis"
            >
              <Camera className="mr-3 w-8 h-8" />
              UPLOAD PHOTO
            </Button>
          </motion.div>
        )}

        {uiState === "THINKING" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-8 z-10"
            role="status"
            aria-live="polite"
          >
            <div className="text-center space-y-4">
              <RefreshCw className="w-16 h-16 mx-auto text-primary animate-spin" />
              <h2 className="text-2xl font-bold animate-pulse">Gemini is analyzing urgency...</h2>
            </div>

            <div className="space-y-4">
              <Progress value={progress} className="h-4 w-full" aria-label="Analysis Progress" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl bg-slate-200" />
                <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
                <Skeleton className="h-12 w-3/4 rounded-xl bg-slate-200" />
              </div>
            </div>
          </motion.div>
        )}

        {uiState === "RESULT" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg flex flex-col gap-4 z-10 max-h-full py-4"
            role="alert"
            aria-live="assertive"
          >
            {result.urgency === "CRITICAL" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full flex-shrink-0"
              >
                <Button
                  size="lg"
                  className="w-full h-20 text-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)] animate-pulse"
                  onClick={() => window.location.href = 'tel:911'}
                  aria-label="Call 911 Immediately"
                >
                  <Phone className="mr-3 h-8 w-8" /> CALL 911
                </Button>
              </motion.div>
            )}

            <Card className="border border-slate-200 shadow-xl bg-white overflow-hidden flex flex-col min-h-0">
              <div className={cn("px-6 py-4 flex items-center justify-between flex-shrink-0", getUrgencyColor(result.urgency))}>
                <h2 className="text-2xl font-black uppercase tracking-wider">{result.urgency}</h2>
                <Activity className="w-8 h-8" />
              </div>
              <CardContent className="pt-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Analysis
                  </h3>
                  <p className="text-lg font-medium leading-snug text-slate-800">{result.analysis}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2" /> Immediate Steps
                  </h3>
                  <ul className="space-y-3">
                    {result.immediate_steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-base">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 flex-shrink-0 border-blue-200 text-blue-700 bg-blue-50">
                          {idx + 1}
                        </Badge>
                        <span className="leading-tight text-slate-800">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert className="bg-cyan-50 border-cyan-200 flex-shrink-0">
                  <AlertTitle className="text-cyan-800 font-bold mb-2">Paramedic Handoff Brief</AlertTitle>
                  <AlertDescription className="text-cyan-900 text-sm leading-relaxed">
                    "{result.paramedic_brief}"
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Button variant="outline" size="lg" onClick={reset} className="w-full border-slate-300 text-slate-700 bg-white hover:bg-slate-50 flex-shrink-0">
              Assess Another Patient
            </Button>
          </motion.div>
        )}

        {uiState === "ERROR" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-6 z-10"
            role="alert"
          >
            <ShieldAlert className="w-20 h-20 mx-auto text-red-600" />
            <h2 className="text-3xl font-bold text-slate-900">System Error</h2>
            <p className="text-red-600 text-lg">{errorMsg}</p>
            <Button size="lg" className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800" onClick={reset}>
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
