import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Loader2, CheckCircle2, AlertCircle, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DraftReport {
  id: string;
  imageDataUrl: string;
  detectionDescription: string;
  confidence: number;
  location: string;
  timestamp: string;
}

interface PotholeCameraProps {
  onClose: () => void;
  onDraftSaved: () => void;
}

const PotholeCamera = ({ onClose, onDraftSaved }: PotholeCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{ description: string; confidence: number } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanCount, setScanCount] = useState(0);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setDetected(false);
      setCapturedImage(null);
      setDetectionResult(null);
      setScanCount(0);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Could not access camera. Please allow camera permission.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        });
      });

      return `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    } catch {
      return "Location unavailable";
    }
  }, []);

  const addLocationWatermark = useCallback(async (imageDataUrl: string, location: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return imageDataUrl;

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);

        const padding = Math.max(16, Math.round(img.width * 0.025));
        const fontSize = Math.max(18, Math.round(img.width * 0.032));
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "bottom";

        const label = `📍 ${location}`;
        const metrics = ctx.measureText(label);
        const boxHeight = fontSize + 18;
        const boxWidth = metrics.width + padding * 2;
        const x = padding;
        const y = img.height - padding;

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(x - 8, y - boxHeight, boxWidth + 16, boxHeight + 8);
        ctx.fillStyle = "#22c55e";
        ctx.fillText(label, x, y - 10);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(imageDataUrl);
      img.src = imageDataUrl;
    });
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (analyzing || detected) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setAnalyzing(true);
    setScanCount((c) => c + 1);

    try {
      const { data, error } = await supabase.functions.invoke("detect-pothole", {
        body: { image: imageData },
      });

      if (error) {
        console.error("Detection error:", error);
        setAnalyzing(false);
        return;
      }

      if (data?.detected && data.confidence >= 60) {
        setDetected(true);
        setCapturedImage(imageData);
        setDetectionResult({ description: data.description, confidence: data.confidence });
        stopCamera();
        toast.success("🕳️ Pothole detected! Photo captured automatically.");
      }
    } catch (err) {
      console.error("Analysis error:", err);
    }

    setAnalyzing(false);
  }, [analyzing, detected, captureFrame, stopCamera]);

  useEffect(() => {
    if (cameraActive && !detected) {
      intervalRef.current = setInterval(() => {
        analyzeFrame();
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [cameraActive, detected, analyzeFrame]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
  }, [facingMode, cameraActive, startCamera]);

  const saveDraft = async () => {
    if (!capturedImage || !detectionResult) return;
    setSaving(true);

    const location = await getCurrentLocation();
    const imageWithWatermark = await addLocationWatermark(capturedImage, location);

    const draft: DraftReport = {
      id: Date.now().toString(),
      imageDataUrl: imageWithWatermark,
      detectionDescription: detectionResult.description,
      confidence: detectionResult.confidence,
      location,
      timestamp: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem("pothole_drafts") || "[]");
    existing.unshift(draft);
    localStorage.setItem("pothole_drafts", JSON.stringify(existing));

    setSaving(false);
    toast.success("📝 Draft saved! Complete your report from the Drafts page.");
    onDraftSaved();
    onClose();
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const manualCapture = () => {
    const imageData = captureFrame();
    if (imageData) {
      setCapturedImage(imageData);
      setDetected(true);
      setDetectionResult({ description: "Manually captured photo", confidence: 100 });
      stopCamera();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-5 py-3">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Camera className="h-5 w-5" />
            <span className="font-semibold">AI Pothole Scanner</span>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            className="rounded-full p-1 text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative aspect-[4/3] bg-black">
          <video ref={videoRef} className={`h-full w-full object-cover ${detected ? "hidden" : ""}`} playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {capturedImage && (
            <img src={capturedImage} alt="Captured pothole" className="h-full w-full object-cover" />
          )}

          {/* Scanning overlay */}
          {cameraActive && !detected && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Scan frame */}
              <div className="absolute inset-8 border-2 border-dashed border-accent/60 rounded-xl" />
              
              {/* Scanning indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Analyzing frame...</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                    <span>Scanning... ({scanCount} frames checked)</span>
                  </>
                )}
              </div>

              {/* Camera controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button onClick={switchCamera}
                  className="rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/70">
                  <SwitchCamera className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Detection success overlay */}
          {detected && detectionResult && (
            <div className="absolute inset-0 flex items-end">
              <div className="w-full bg-gradient-to-t from-black/80 to-transparent p-5">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Pothole Detected!</span>
                  <span className="ml-auto rounded-full bg-green-400/20 px-2 py-0.5 text-xs font-bold">
                    {detectionResult.confidence}% confident
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/80">{detectionResult.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 space-y-3">
          {!detected ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Point your camera at a pothole. AI will auto-capture when detected.
              </p>
              <div className="flex gap-3">
                <button onClick={manualCapture}
                  className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-foreground transition-all hover:brightness-110">
                  📸 Manual Capture
                </button>
                <button onClick={() => { stopCamera(); onClose(); }}
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button onClick={saveDraft} disabled={saving}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-foreground transition-all hover:brightness-110 disabled:opacity-50">
                {saving ? "Saving with location..." : "💾 Save as Draft"}
              </button>
              <button onClick={() => { setDetected(false); setCapturedImage(null); setDetectionResult(null); startCamera(); }}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                🔄 Retake
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PotholeCamera;
