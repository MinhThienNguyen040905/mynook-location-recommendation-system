"use client";

import { useState, useRef, useCallback } from "react";
import { API_BASE_URL } from "@/config/api";

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

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      try {
        const res = await fetch(
          `${API_BASE_URL}/search/transcribe`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!res.ok) {
          throw new Error(res.status === 429
            ? "Bạn đã thử quá nhiều lần. Vui lòng đợi một phút."
            : "Chưa thể nhận dạng giọng nói. Bạn có thể nhập từ khóa để tìm kiếm.");
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
