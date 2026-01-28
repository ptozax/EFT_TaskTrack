
import React, { useRef, useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import iconImgR from "../../public/Top_R.png";
import iconImgL from "../../public/Top_L.png"

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
    // Guard: ถ้า OpenCV / video / canvas ยังไม่พร้อม ให้หยุดทันที
    if (!window.cv || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // 1) วาด frame ปัจจุบันจาก video ลง canvas (full resolution)
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // 2) อ่านภาพจาก canvas และ template
    const src = cv.imread(canvas);

    const templateEl = document.getElementById("templateR");
    if (!templateEl) {
      src.delete();
      return;
    }
    const template = cv.imread(templateEl);

    // 3) Template Matching
    const dst = new cv.Mat();
    cv.matchTemplate(src, template, dst, cv.TM_CCOEFF_NORMED);

    // 4) หา match ที่ดีที่สุด
    const { maxVal, maxLoc } = cv.minMaxLoc(dst);

    if (maxVal > 0.85) {
      // FOUND
      setStatus(
        `FOUND: ${(maxVal * 100).toFixed(1)}% at ${maxLoc.x},${maxLoc.y}`
      );

      // วาดกรอบตำแหน่งที่เจอ
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 5;
      ctx.strokeRect(
        maxLoc.x,
        maxLoc.y,
        template.cols,
        template.rows
      );









      // =========================
      // CROP ไปทางซ้าย 1000x20
      // =========================
      const cropWidth = 1000;
      const cropHeight = 20;

      // x เริ่มต้น (ไปทางซ้าย)
      const cropX = Math.max(0, maxLoc.x - cropWidth);
      const cropY = maxLoc.y;

      // กันไม่ให้เกินขอบ canvas
      const safeWidth = Math.min(cropWidth, canvas.width - cropX);
      const safeHeight = Math.min(cropHeight, canvas.height - cropY);

      const croppedImage = ctx.getImageData(
        cropX,
        cropY,
        safeWidth,
        safeHeight
      );


      // วาดลง canvas ชั่วคราว
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = croppedLeft.width;
      tempCanvas.height = croppedLeft.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.putImageData(croppedLeft, 0, 0);



      // =========================
      // STEP 2: หา templateL
      // =========================
      const srcL = cv.imread(tempCanvas);

      const templateLEl = document.getElementById("templateL");
      if (!templateLEl) {
        srcL.delete();
        return;
      }

      const templateL = cv.imread(templateLEl);
      const dstL = new cv.Mat();

      cv.matchTemplate(srcL, templateL, dstL, cv.TM_CCOEFF_NORMED);
      const { maxVal: maxValL, maxLoc: maxLocL } = cv.minMaxLoc(dstL);

      if (maxValL > 0.85) {
        // =========================
        // STEP 3: Crop ฝั่งขวาที่เหลือ
        // =========================
        const rightX = maxLocL.x + templateL.cols;
        const rightWidth = srcL.cols - rightX;

        if (rightWidth > 0) {
          ctx.strokeStyle = "#ff0000"; // แดง
          ctx.lineWidth = 3;
          ctx.strokeRect(
            rightX,
            rightY,
            rightWidth,
            rightHeight
          );
        }
      }





    } else {
      setStatus("Searching...");
    }

    // 5) เคลียร์ memory (สำคัญมากใน browser)
    src.delete();
    template.delete();
    dst.delete();
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

      <img id="templateR" src={iconImgR} alt="template" style={{ display: "none" }} />
      <img id="templateL" src={iconImgL} alt="template" style={{ display: "none" }} />
    </div>
  );
};

export default ItemPrice;