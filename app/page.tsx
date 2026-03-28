"use client";

import { useState, useRef } from "react";
import { Camera, Phone, ShieldAlert, Activity, ClipboardList, RefreshCw, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { submitTriageImage, submitTriageText, TriageResult } from "./actions/triage";
import { getNearbyHospitals } from "./actions/hospitals";
import { AudioInput } from "@/components/AudioInput";
import { compressImage } from "@/lib/image-processor";

type HospitalResult = {
  name: string;
  address: string;
  maps_link: string;
  rating?: number;
};

type UIState = "IDLE" | "THINKING" | "RESULT" | "ERROR";

export default function Home() {
  const [uiState, setUiState] = useState<UIState>("IDLE");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [locatingStatus, setLocatingStatus] = useState<"IDLE" | "LOCATING" | "FETCHING" | "ERROR" | "SUCCESS">("IDLE");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [textMode, setTextMode] = useState(false);
  const [emergencyText, setEmergencyText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedResult, setTranslatedResult] = useState<TriageResult | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRequestInProgress = uiState === "THINKING";

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setLocatingStatus("ERROR");
      return;
    }

    setLocatingStatus("LOCATING");
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocatingStatus("FETCHING");
        try {
          const { latitude, longitude } = position.coords;
          const { hospitals: foundHospitals, error: hospitalError } = await getNearbyHospitals(latitude, longitude);
          
          if (hospitalError) {
            setLocatingStatus("ERROR"); 
          } else {
            setHospitals(foundHospitals);
            setLocatingStatus("SUCCESS");
          }
        } catch (err) {
          console.error("Failed to fetch hospitals:", err);
          setLocatingStatus("ERROR");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocatingStatus("ERROR");
      },
      { timeout: 10000 }
    );
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isRequestInProgress) return;

    setUiState("THINKING");
    setProgress(10);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result as string;
        setProgress(30);
        
        const compressedBase64 = await compressImage(base64String, 1024, 1024, 0.7);
        setProgress(60);
        
        const triageData = await submitTriageImage(
          compressedBase64, 
          file.type, 
          emergencyText || undefined, 
          voiceTranscript || undefined
        );
        setResult(triageData);
        setProgress(100);

        setTimeout(() => {
          setUiState("RESULT");
          handleGetLocation();
        }, 300);
      } catch (error: any) {
        setErrorMsg(error.message || "Failed to analyze image. Call 911 if critical.");
        setUiState("ERROR");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
      setUiState("ERROR");
    };
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = async () => {
    if (!emergencyText.trim() || isRequestInProgress) return;
    
    setUiState("THINKING");
    setProgress(30);

    try {
      const triageData = await submitTriageText(emergencyText, voiceTranscript);
      setResult(triageData);
      setProgress(100);

      setTimeout(() => {
        setUiState("RESULT");
        handleGetLocation();
      }, 300);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to analyze emergency description.");
      setUiState("ERROR");
    }
  };

  const handleTranslate = async (lang: string) => {
    if (lang === "en") {
      setTranslatedResult(null);
      setTargetLanguage("en");
      return;
    }

    if (!result || isTranslating) return;
    setTargetLanguage(lang);
    setIsTranslating(true);

    try {
      const analysisRes = await fetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: result.analysis, targetLanguage: lang }),
      });
      const { translatedText: translatedAnalysis } = await analysisRes.json();

      const stepsPromises = result.immediate_steps.map((step) =>
        fetch("/api/translate", {
          method: "POST",
          body: JSON.stringify({ text: step, targetLanguage: lang }),
        }).then((res) => res.json())
      );
      const stepsResults = await Promise.all(stepsPromises);
      const translatedSteps = stepsResults.map((r) => r.translatedText);

      const briefRes = await fetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: result.paramedic_brief, targetLanguage: lang }),
      });
      const { translatedText: translatedBrief } = await briefRes.json();

      setTranslatedResult({
        ...result,
        analysis: translatedAnalysis,
        immediate_steps: translatedSteps,
        paramedic_brief: translatedBrief,
      });
    } catch (error) {
      console.error("Translation failed:", error);
      setErrorMsg("Translation service unavailable.");
    } finally {
      setIsTranslating(false);
    }
  };

  const reset = () => {
    setUiState("IDLE");
    setResult(null);
    setHospitals([]);
    setLocatingStatus("IDLE");
    setProgress(0);
    setTextMode(false);
    setEmergencyText("");
    setTargetLanguage("en");
    setTranslatedResult(null);
    setVoiceTranscript("");
    setErrorMsg("");
  };

  const getUrgencyColor = (urgency: TriageResult["urgency"] | undefined) => {
    switch (urgency) {
      case "immediate":
      case "CRITICAL": return "bg-red-600 text-white border-red-800 shadow-red-100";
      case "URGENT": return "bg-yellow-500 text-yellow-950 border-yellow-700 shadow-yellow-100";
      case "STABLE": return "bg-emerald-600 text-white border-emerald-800 shadow-emerald-100";
      default: return "bg-gray-600 text-white shadow-gray-100";
    }
  };

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 text-slate-900 overflow-hidden">
      <AnimatePresence mode="wait">
        {uiState === "IDLE" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md flex flex-col items-center gap-8 z-10"
          >
            <div className="text-center space-y-4">
              <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
              <h1 className="text-4xl font-extrabold tracking-tight">Emergency Intake</h1>
              <p className="text-muted-foreground text-lg">AI-powered rapid medical triage.</p>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Upload Medical Photo"
              className="hidden"
              ref={fileInputRef}
              onChange={handleUpload}
              disabled={isRequestInProgress}
            />

            <Button
              size="lg"
              className={cn("w-full h-32 text-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-3xl shadow-xl transition-transform active:scale-95", textMode && "hidden")}
              onClick={() => fileInputRef.current?.click()}
              disabled={isRequestInProgress}
            >
              <Camera className="mr-3 w-8 h-8" />
              Take/Upload Photo
            </Button>

            {!textMode ? (
              <Button variant="ghost" className="text-slate-500 font-semibold" onClick={() => setTextMode(true)}>
                Or describe in text
              </Button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
                <textarea
                  className="w-full p-4 border-2 border-slate-300 rounded-2xl resize-none text-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  rows={4}
                  placeholder="Describe the emergency..."
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                  disabled={isRequestInProgress}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setTextMode(false)} disabled={isRequestInProgress}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-slate-900 text-white hover:bg-slate-800 h-12 rounded-xl font-bold" 
                    onClick={handleTextSubmit}
                    disabled={!emergencyText.trim() || isRequestInProgress}
                  >
                    Submit Description
                  </Button>
                </div>
              </motion.div>
            )}

            {!textMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                <AudioInput 
                  onTranscriptReady={setVoiceTranscript} 
                  onClear={() => setVoiceTranscript("")} 
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {uiState === "THINKING" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md space-y-8 z-10 text-center"
          >
            <RefreshCw className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h2 className="text-2xl font-bold">Analyzing Urgency...</h2>
            <div className="space-y-4">
              <Progress value={progress} className="h-4 w-full" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl bg-slate-200" />
                <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
              </div>
            </div>
          </motion.div>
        )}

        {uiState === "RESULT" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg flex flex-col gap-4 z-10 max-h-full py-4 overflow-y-auto"
          >
            {result.urgency === "CRITICAL" && (
              <Button
                size="lg"
                className="w-full h-16 text-xl font-black bg-red-600 hover:bg-red-700 text-white animate-pulse rounded-2xl"
                onClick={() => window.location.href = 'tel:911'}
              >
                <Phone className="mr-3 h-6 w-6" /> CALL 911 NOW
              </Button>
            )}

            <Card className="border-none shadow-xl bg-white overflow-hidden flex flex-col">
              <div className={cn("px-6 py-4 flex items-center justify-between", getUrgencyColor(result.urgency))}>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-wider">{result.urgency}</h2>
                  <select 
                    className="bg-white/10 text-xs font-bold py-1 px-2 mt-2 rounded border border-white/20 text-white focus:outline-none"
                    value={targetLanguage}
                    onChange={(e) => handleTranslate(e.target.value)}
                    disabled={isTranslating}
                  >
                    <option value="en" className="text-slate-900">English</option>
                    <option value="hi" className="text-slate-900">Hindi (हिंदी)</option>
                    <option value="es" className="text-slate-900">Spanish (Español)</option>
                  </select>
                </div>
                <Activity className="w-8 h-8 opacity-70" />
              </div>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <ShieldAlert className="w-3 h-3 mr-2" /> Medical Analysis
                  </h3>
                  <p className="text-lg font-medium text-slate-800 leading-snug">
                    {translatedResult ? translatedResult.analysis : result.analysis}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <ClipboardList className="w-3 h-3 mr-2" /> Immediate Actions
                  </h3>
                  <ul className="space-y-3">
                    {(translatedResult || result).immediate_steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-base">
                        <Badge variant="outline" className="h-5 w-5 rounded-full flex items-center justify-center p-0 border-blue-200 text-blue-700 bg-white">
                          {idx + 1}
                        </Badge>
                        <span className="leading-tight text-slate-800">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert className={cn(
                  "border-none",
                  (result.urgency === "CRITICAL" || result.urgency === "immediate") ? "bg-red-50 text-red-900" :
                  result.urgency === "URGENT" ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-900"
                )}>
                  <AlertTitle className="font-bold flex items-center">
                    Paramedic Handoff
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1 whitespace-pre-wrap">
                    "{(translatedResult || result).paramedic_brief}"
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="py-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Nearby Medical Centers
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                {locatingStatus === "LOCATING" || locatingStatus === "FETCHING" ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-slate-500">Locating...</span>
                  </div>
                ) : hospitals.length > 0 ? (
                  <div className="space-y-4">
                    {hospitals.map((h, i) => (
                      <div key={i} className="flex flex-col gap-1 pb-3 last:pb-0 border-b last:border-0 border-slate-100">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-sm">{h.name}</h4>
                          {h.rating && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">★ {h.rating}</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{h.address}</p>
                        <a href={h.maps_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 font-bold hover:underline mt-1">
                          Directions →
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-2 text-xs text-slate-500 italic">No hospitals found or location disabled.</p>
                )}
              </CardContent>
            </Card>

            <Button variant="outline" size="lg" onClick={reset} className="w-full bg-white rounded-2xl h-14 font-bold border-slate-200">
              New Triage
            </Button>
          </motion.div>
        )}

        {uiState === "ERROR" && (
          <motion.div key="error" className="w-full max-w-md text-center space-y-6 z-10" role="alert">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-600" />
            <h2 className="text-2xl font-bold">Analysis Failed</h2>
            <p className="text-slate-600">{errorMsg}</p>
            <Button size="lg" className="w-full bg-slate-900" onClick={reset}>
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
