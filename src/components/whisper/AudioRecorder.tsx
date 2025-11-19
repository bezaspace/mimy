"use client";

import { useEffect, useState, useRef } from "react";

export type RecorderStatus = "idle" | "recording" | "preview";

export interface AudioRecorderProps {
  maxDurationMs?: number;
  onRecordingReady?: (blob: Blob) => void;
  onSendRequested?: () => void;
  isChecking?: boolean;
}

export function AudioRecorder({ maxDurationMs = 45000, onRecordingReady, onSendRequested, isChecking }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopVisualization = () => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const startVisualization = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const analyserNode = analyserRef.current;
      const canvas = canvasRef.current;
      if (!analyserNode || !canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      analyserNode.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ec4899";
      ctx.beginPath();

      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i += 1) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      animationRef.current = window.requestAnimationFrame(draw);
    };

    draw();
  };

  const stopRecordingInternal = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    stopTimer();
    stopVisualization();
    cleanupStream();
    setStatus("preview");
  };

  const startTimer = () => {
    stopTimer();
    setElapsedMs(0);
    timerRef.current = window.setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + 200;
        if (next >= maxDurationMs) {
          stopRecordingInternal();
          return maxDurationMs;
        }
        return next;
      });
    }, 200);
  };

  const startRecording = async () => {
    if (status === "recording") {
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setError(null);
    setHasPreviewed(false);
    setElapsedMs(0);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setError("Recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const chunks = chunksRef.current;
        if (!chunks.length) {
          return;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        chunksRef.current = [];
        if (onRecordingReady) {
          onRecordingReady(blob);
        }
      };

      mediaRecorder.start();
      setStatus("recording");
      startTimer();
      startVisualization(stream);
    } catch (err) {
      setError("Could not access microphone. Check permissions.");
      cleanupStream();
      stopTimer();
      stopVisualization();
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (status !== "recording") {
      return;
    }
    stopRecordingInternal();
  };

  const handleReRecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setElapsedMs(0);
    setStatus("idle");
    setHasPreviewed(false);
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopTimer();
      stopVisualization();
      cleanupStream();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const totalSeconds = Math.floor(maxDurationMs / 1000);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minsStr = mins.toString();
    const secsStr = secs.toString().padStart(2, "0");
    return `${minsStr}:${secsStr}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">
          Step 1
        </p>
        <p className="text-sm font-semibold text-gray-900">
          Say "May I meet you because..."
        </p>
        <p className="text-xs text-gray-500">
          Max {formatTime(totalSeconds)}. Take your time and be kind.
        </p>
      </div>
      <div className="rounded-xl neo-border bg-gray-50 px-3 py-3 flex flex-col gap-3">
        <div className="h-20 w-full rounded-lg bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={600}
            height={160}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {formatTime(elapsedSeconds)} / {formatTime(totalSeconds)}
          </span>
          <span
            className={
              status === "recording"
                ? "flex items-center gap-1 text-red-500"
                : "flex items-center gap-1 text-gray-400"
            }
          >
            <span className="inline-block h-2 w-2 rounded-full bg-current" />
            {status === "recording" ? "Recording" : "Idle"}
          </span>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex justify-center">
          {status !== "recording" && (
            <button
              type="button"
              onClick={startRecording}
              className="h-14 w-14 rounded-full bg-primary text-white neo-border flex items-center justify-center text-sm font-semibold hover:brightness-110 disabled:opacity-60"
              disabled={!!error}
            >
              Rec
            </button>
          )}
          {status === "recording" && (
            <button
              type="button"
              onClick={stopRecording}
              className="h-14 w-14 rounded-full bg-red-500 text-white neo-border flex items-center justify-center text-sm font-semibold hover:brightness-110"
            >
              Stop
            </button>
          )}
        </div>
        {audioUrl && (
          <div className="flex flex-col gap-2">
            <audio
              src={audioUrl}
              controls
              className="w-full"
              onPlay={() => setHasPreviewed(true)}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReRecord}
                className="flex-1 px-3 py-2 rounded-lg bg-white neo-border text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Re-record
              </button>
              <button
                type="button"
                disabled={!hasPreviewed || !onSendRequested || !!error || isChecking}
                onClick={onSendRequested}
                className="flex-1 px-3 py-2 rounded-lg bg-primary text-white neo-border text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? "Vibe checking..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
