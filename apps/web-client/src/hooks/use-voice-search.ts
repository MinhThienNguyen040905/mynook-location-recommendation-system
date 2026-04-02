"use client";

import { useState, useRef, useCallback } from "react";

type VoiceSearchState = "idle" | "recording" | "transcribing";

export function useVoiceSearch(onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceSearchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const transcribe = useCallback(
    async (audioBlob: Blob) => {
      setState("transcribing");
      setError(null);

      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        setError("Groq API key is not configured.");
        setState("idle");
        return;
      }

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "vi");

      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
          },
        );

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Groq API error ${res.status}: ${body}`);
        }

        const data = await res.json();
        const text = (data.text ?? "").trim();
        if (text) {
          onResult(text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setState("idle");
      }
    },
    [onResult],
  );

  const start = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          transcribe(audioBlob);
        } else {
          setState("idle");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");

      // Auto-stop after 15 seconds
      timeoutRef.current = setTimeout(() => {
        stop();
      }, 15000);
    } catch {
      setError("Microphone access denied.");
      setState("idle");
    }
  }, [transcribe, stop]);

  const toggle = useCallback(() => {
    if (state === "recording") {
      stop();
    } else if (state === "idle") {
      start();
    }
    // If transcribing, ignore clicks
  }, [state, start, stop]);

  return { state, error, toggle };
}
