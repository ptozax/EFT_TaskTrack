
import React, { useRef, useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import iconImgR from "/Top_R.png";
import iconImgL from "/Top_L.png";

const ItemPrice = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Idle");


  const canvasCrop = useRef(null);

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

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // =========================
    // Draw video frame
    // =========================
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const src = cv.imread(canvas);

    // =========================
    // Load RIGHT template
    // =========================
    const templateREl = document.getElementById("templateR");
    if (!templateREl) {
      src.delete();
      return;
    }
    const templateR = cv.imread(templateREl);

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(templateR, templateR, cv.COLOR_RGBA2GRAY);

    // =========================
    // Match RIGHT icon
    // =========================
    const dst = new cv.Mat();
    cv.matchTemplate(src, templateR, dst, cv.TM_CCOEFF_NORMED);

    const { maxVal, maxLoc } = cv.minMaxLoc(dst);

    if (maxVal < 0.85) {
      setStatus("Searching...");
      src.delete();
      templateR.delete();
      dst.delete();
      return;
    }

    setStatus(`FOUND R ${(maxVal * 100).toFixed(1)}%`);

    // Draw R box
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      maxLoc.x,
      maxLoc.y,
      templateR.cols,
      templateR.rows
    );

    // =========================
    // Crop LEFT area (search L)
    // =========================
    const cropWidth = 1000;
    const cropHeight = templateR.rows;

    const cropX = Math.max(0, maxLoc.x - cropWidth);
    const cropY = maxLoc.y;

    const safeWidth = Math.min(cropWidth, canvas.width - cropX);
    const safeHeight = Math.min(cropHeight, canvas.height - cropY);

    // ctx.strokeStyle = "#ff0000";
    // ctx.lineWidth = 2;
    // ctx.strokeRect(cropX, cropY, safeWidth, safeHeight);

    const cropImageData = ctx.getImageData(
      cropX,
      cropY,
      safeWidth,
      safeHeight
    );

    const srcCrop = cv.matFromImageData(cropImageData);

    // =========================
    // Detect LEFT icon
    // =========================
    const templateLEl = document.getElementById("templateL");
    if (!templateLEl) {
      src.delete();
      templateR.delete();
      dst.delete();
      srcCrop.delete();
      return;
    }

    const templateL = cv.imread(templateLEl);

    cv.cvtColor(srcCrop, srcCrop, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(templateL, templateL, cv.COLOR_RGBA2GRAY);

    const result = new cv.Mat();
    cv.matchTemplate(srcCrop, templateL, result, cv.TM_CCOEFF_NORMED);

    const matchL = cv.minMaxLoc(result);

    if (matchL.maxVal >= 0.85) {
      console.log("✅ Found LEFT icon", matchL.maxVal);

      // ตำแหน่งจริงของ L
      const leftX = cropX + matchL.maxLoc.x;
      const leftY = cropY + matchL.maxLoc.y;

      // ctx.strokeStyle = "#0000ff";
      // ctx.strokeRect(leftX, leftY, templateL.cols, templateL.rows);

      // =========================
      // FINAL CROP (text only)
      // =========================
      const textX = leftX + templateL.cols;
      const textY = cropY;

      const textWidth = maxLoc.x - textX;
      const textHeight = templateR.rows;

      if (textWidth > 0 && textHeight > 0) {
        const textImage = ctx.getImageData(
          textX,
          textY,
          textWidth,
          textHeight
        );

        if (canvasCrop.current) {
          const ctxCrop = canvasCrop.current.getContext("2d");
          canvasCrop.current.width = textWidth;
          canvasCrop.current.height = textHeight;
          ctxCrop.putImageData(textImage, 0, 0);
        }
      }
    }

    // =========================
    // Cleanup
    // =========================
    src.delete();
    templateR.delete();
    dst.delete();
    srcCrop.delete();
    templateL.delete();
    result.delete();
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

      <div className="border" style={{ overflow: "auto", maxWidth: "100%", maxHeight: "600px" }}>
        {/* CSS handles the visual display size, while JS handles the internal resolution */}
        <canvas ref={canvasCrop} style={{ width: "100%", height: "auto" }} />
      </div>

      <img id="templateR" src={iconImgR} alt="template" style={{ display: "none" }} />
      <img id="templateL" src={iconImgL} alt="template" style={{ display: "none" }} />
    </div>
  );
};

export default ItemPrice;