
import React, { useRef, useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import iconImg from "../../public/Top_R.png";

const ItemPrice = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Idle");

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 10 },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video to load metadata to get actual resolution
      video.onloadedmetadata = () => {
        video.play();
        const canvas = canvasRef.current;
        // FIX: Set canvas internal size to match the actual screen resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        intervalRef.current = setInterval(() => {
          detectIcon();
        }, 500); // 500ms is more stable for performance
      };
    } catch (err) {
      console.error("Error starting capture:", err);
    }
  };

  const stopCapture = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStatus("Stopped");
  };

  const detectIcon = () => {
    if (!window.cv || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Draw full resolution frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let src = null;
    let template = null;
    let dst = null;


    // 1. Read the current screen frame
    src = window.cv.imread(canvas);

    // 2. Read the template image from the <img> tag
    const templateImgElement = document.getElementById("template");
    if (!templateImgElement) return;
    template = window.cv.imread(templateImgElement);

    dst = new window.cv.Mat();
    const mask = new window.cv.Mat();

    // 3. Perform Template Matching
    window.cv.matchTemplate(
      src,
      template,
      dst,
      window.cv.TM_CCOEFF_NORMED,
      mask
    );

    // 4. Find the best match location
    const result = window.cv.minMaxLoc(dst, mask);
    const { maxVal, maxLoc } = result;

    // Threshold: 0.7 - 0.8 is usually good
    if (maxVal > 0.85) {
      setStatus(`FOUND: ${(maxVal * 100).toFixed(1)}% at ${maxLoc.x},${maxLoc.y}`);

      // Draw detection box on canvas
      ctx.strokeStyle = "#00ff00"; // Bright green
      ctx.lineWidth = 5;
      ctx.strokeRect(maxLoc.x, maxLoc.y, template.cols, template.rows);

    } else {
      setStatus("Searching...");
    }


    mask.delete();

    // 5. CRITICAL: Clean up memory to prevent browser crash
    if (src) src.delete();
    if (template) template.delete();
    if (dst) dst.delete();

  };

  return (
    <div className="container mt-3">
      <h4>Full Res Icon Detection</h4>

      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={startCapture}>Start Capture</button>
        <button className="btn btn-danger" onClick={stopCapture}>Stop</button>
      </div>

      <p>Status: <span className="badge bg-dark">{status}</span></p>

      <video ref={videoRef} style={{ display: "none" }} />

      <div className="border" style={{ overflow: "auto", maxWidth: "100%", maxHeight: "600px" }}>
        {/* CSS handles the visual display size, while JS handles the internal resolution */}
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />
      </div>

      <img id="template" src={iconImg} alt="template" style={{ display: "none" }} />
    </div>
  );
};

export default ItemPrice;