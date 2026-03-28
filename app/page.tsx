"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Phone, ShieldAlert, Activity, ClipboardList, RefreshCw, Languages, Globe } from "lucide-react";
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

type HospitalResult = {
  name: string;
  address: string;
  maps_link: string;
  rating?: number;
};

type UIState = "IDLE" | "THINKING" | "RESULT" | "ERROR";

const compressImage = async (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = base64Str;
  });
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            console.warn(hospitalError);
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
    if (!file) return;

    setUiState("THINKING");
    setProgress(20);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64String = event.target?.result as string;
        setProgress(40);
        
        const compressedBase64 = await compressImage(base64String);
        setProgress(60);

        const triageData = await submitTriageImage(compressedBase64, "image/jpeg");
        setResult(triageData);
        setProgress(100);

        setTimeout(() => {
          setUiState("RESULT");
          handleGetLocation();
        }, 500); // Smooth transition
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

  const handleTextSubmit = async () => {
    if (!emergencyText.trim()) return;
    
    setUiState("THINKING");
    setProgress(30);

    try {
      const triageData = await submitTriageText(emergencyText);
      setResult(triageData);
      setProgress(100);

      setTimeout(() => {
        setUiState("RESULT");
        handleGetLocation(); // Auto-fetch location
      }, 500); // Smooth transition
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to analyze emergency description.");
      setUiState("ERROR");
    }
  };

  const handleTranslate = async (lang: string) => {
    if (lang === "en") {
      setTranslatedResult(null);
      setTargetLanguage("en");
      return;
    }

    if (!result) return;
    setTargetLanguage(lang);
    setIsTranslating(true);

    try {
      // Translate analysis
      const analysisRes = await fetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: result.analysis, targetLanguage: lang }),
      });
      const { translatedText: translatedAnalysis } = await analysisRes.json();

      // Translate steps
      const stepsPromises = result.immediate_steps.map((step) =>
        fetch("/api/translate", {
          method: "POST",
          body: JSON.stringify({ text: step, targetLanguage: lang }),
        }).then((res) => res.json())
      );
      const stepsResults = await Promise.all(stepsPromises);
      const translatedSteps = stepsResults.map((r) => r.translatedText);

      // Translate brief
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
      setErrorMsg("Translation service unavailable. Showing English.");
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
              className={cn("w-full h-32 text-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-3xl shadow-[0_10px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all", textMode && "hidden")}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Take Photo for Triage Analysis"
            >
              <Camera className="mr-3 w-8 h-8" />
              TAKE OR UPLOAD PHOTO
            </Button>

            {!textMode ? (
              <Button variant="ghost" className="text-slate-500 font-semibold" onClick={() => setTextMode(true)}>
                Or describe emergency in text
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full space-y-4"
              >
                <textarea
                  className="w-full p-4 border-2 border-slate-300 rounded-2xl resize-none text-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white shadow-inner placeholder-slate-400"
                  rows={4}
                  placeholder="Describe the emergency (e.g. Severe chest pain, bleeding from leg...)"
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                  aria-label="Describe emergency"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 shadow-sm h-14 rounded-xl font-bold text-lg" onClick={() => setTextMode(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-xl h-14 rounded-xl font-bold text-lg" 
                    onClick={handleTextSubmit}
                    disabled={!emergencyText.trim()}
                  >
                    Submit
                  </Button>
                </div>
              </motion.div>
            )}
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
              <h2 className="text-2xl font-bold animate-pulse">Medical AI is analyzing urgency...</h2>
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
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black uppercase tracking-wider">{result.urgency}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <select 
                      className="bg-white/20 text-xs font-bold py-1 px-2 rounded border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                      value={targetLanguage}
                      onChange={(e) => handleTranslate(e.target.value)}
                      disabled={isTranslating}
                    >
                      <option value="en" className="text-slate-900">English</option>
                      <option value="hi" className="text-slate-900">Hindi (हिंदी)</option>
                      <option value="es" className="text-slate-900">Spanish (Español)</option>
                    </select>
                    {isTranslating && <RefreshCw className="w-3 h-3 animate-spin text-white" />}
                  </div>
                </div>
                <Activity className="w-8 h-8" />
              </div>
              <CardContent className="pt-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2" /> {targetLanguage === "en" ? "Analysis" : <Languages className="w-4 h-4 mr-2" />}
                  </h3>
                  <p className="text-lg font-medium leading-snug text-slate-800">
                    {translatedResult ? translatedResult.analysis : result.analysis}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2" /> Immediate Steps
                  </h3>
                  <ul className="space-y-3">
                    {(translatedResult || result).immediate_steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-base">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 flex-shrink-0 border-blue-200 text-blue-700 bg-blue-50">
                          {idx + 1}
                        </Badge>
                        <span className="leading-tight text-slate-800">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert className={cn(
                  "flex-shrink-0",
                  (result.urgency === "CRITICAL" || result.urgency === "immediate") ? "bg-red-50 border-red-200" :
                  result.urgency === "URGENT" ? "bg-amber-50 border-amber-200" :
                  "bg-cyan-50 border-cyan-200"
                )}>
                  <AlertTitle className={cn("font-bold mb-2",
                    (result.urgency === "CRITICAL" || result.urgency === "immediate") ? "text-red-900" :
                    result.urgency === "URGENT" ? "text-amber-900" :
                    "text-cyan-800"
                  )}>Paramedic Handoff Brief</AlertTitle>
                  <AlertDescription className={cn("text-sm leading-relaxed",
                    (result.urgency === "CRITICAL" || result.urgency === "immediate") ? "text-red-950" :
                    result.urgency === "URGENT" ? "text-amber-950" :
                    "text-cyan-900"
                  )}>
                    "{(translatedResult || result).paramedic_brief}"
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Hospital Lookup Section */}
            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden flex flex-col min-h-0">
              <CardHeader className="py-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Nearby Medical Centers
                </CardTitle>
                {locatingStatus === "IDLE" && (
                  <Button size="sm" variant="outline" onClick={handleGetLocation}>
                    Find Hospitals
                  </Button>
                )}
              </CardHeader>
              <CardContent className="py-4">
                {locatingStatus === "LOCATING" || locatingStatus === "FETCHING" ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Retrieving your location...</p>
                  </div>
                ) : locatingStatus === "SUCCESS" && hospitals.length > 0 ? (
                  <div className="space-y-4">
                    {hospitals.map((hospital, idx) => (
                      <div key={idx} className="flex flex-col gap-1 pb-3 last:pb-0 border-b last:border-0 border-slate-100">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 leading-tight">{hospital.name}</h4>
                          {hospital.rating && (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 py-0 h-5">
                              ★ {hospital.rating}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{hospital.address}</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto justify-start text-blue-600 font-semibold"
                          asChild
                        >
                          <a href={hospital.maps_link} target="_blank" rel="noopener noreferrer">
                            View on Google Maps →
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : locatingStatus === "SUCCESS" && hospitals.length === 0 ? (
                  <p className="text-center py-4 text-slate-500 text-sm">No nearby medical centers found in this area.</p>
                ) : locatingStatus === "ERROR" ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-slate-500 text-sm italic">Could not access location or find hospitals.</p>
                    <Button size="sm" variant="ghost" onClick={handleGetLocation} className="text-xs">
                      Retry Location Access
                    </Button>
                  </div>
                ) : (
                  <p className="text-center py-4 text-slate-500 text-sm italic">Use your location to see the nearest professional help.</p>
                )}
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
