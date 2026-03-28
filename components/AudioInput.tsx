"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Play, Pause, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { transcribeAudio } from "@/app/actions/triage";

interface AudioInputProps {
  onTranscriptReady: (transcript: string) => void;
  onClear: () => void;
}

type AudioState = "IDLE" | "RECORDING" | "REVIEW" | "TRANSCRIBING" | "READY";

export function AudioInput({ onTranscriptReady, onClear }: AudioInputProps) {
  const [state, setState] = useState<AudioState>("IDLE");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setState("REVIEW");
        handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setState("RECORDING");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Could not access microphone. Please check permissions or upload an audio file.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === "RECORDING") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setState("TRANSCRIBING");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const result = await transcribeAudio(base64Audio, blob.type);
        setTranscript(result);
        onTranscriptReady(result);
        setState("READY");
      };
    } catch (error) {
      console.error("Transcription error:", error);
      setState("REVIEW");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    handleTranscribe(file);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript("");
    setDuration(0);
    setState("IDLE");
    onClear();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state === "RECORDING" ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {state === "IDLE" && "Voice Input"}
            {state === "RECORDING" && `Recording... ${formatTime(duration)}`}
            {state === "REVIEW" && "Audio Recorded"}
            {state === "TRANSCRIBING" && "Transcribing Audio..."}
            {state === "READY" && "Transcript Ready"}
          </span>
        </div>
        {(state === "REVIEW" || state === "READY") && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-red-500 h-8 px-2 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-1" /> Remove
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {state === "IDLE" && (
          <>
            <Button 
              onClick={startRecording} 
              className="flex-1 h-14 bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 rounded-xl font-bold transition-all active:scale-95"
            >
              <Mic className="w-5 h-5 mr-2" /> Start Voice Note
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 p-0 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              <Upload className="w-5 h-5" />
            </Button>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
          </>
        )}

        {state === "RECORDING" && (
          <Button 
            onClick={stopRecording} 
            className="w-full h-14 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold animate-pulse shadow-lg shadow-red-200"
          >
            <Square className="w-5 h-5 mr-2 fill-current" /> Stop & Review
          </Button>
        )}

        {state === "TRANSCRIBING" && (
          <div className="w-full h-14 flex items-center justify-center gap-3 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl text-slate-500 font-medium">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing speech...
          </div>
        )}

        {state === "READY" && (
          <div className="w-full space-y-3">
             <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-800 font-medium truncate">"{transcript || "No speech detected"}"</p>
                </div>
                {audioUrl && (
                  <audio src={audioUrl} controls className="h-8 max-w-[100px]" />
                )}
             </div>
          </div>
        )}
      </div>

      {state === "RECORDING" && (
        <Progress value={(duration % 60) * 1.66} className="h-1" />
      )}
    </div>
  );
}
