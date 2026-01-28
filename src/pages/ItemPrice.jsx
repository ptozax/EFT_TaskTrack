import React, { useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const ItemPrice = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const startCapture = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 10 }
    });

    streamRef.current = stream;

    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    intervalRef.current = setInterval(() => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }, 100);
  };

  const stopCapture = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current)
      streamRef.current.getTracks().forEach(t => t.stop());
  };

  return (
    <div className="container mt-3">
      <h5>Screen Capture</h5>

      <button className="btn btn-primary me-2" onClick={startCapture}>
        Start Capture
      </button>

      <button className="btn btn-danger" onClick={stopCapture}>
        Stop
      </button>

      <video ref={videoRef} style={{ display: "none" }} />

      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="border mt-3"
      />
    </div>
  );
};

export default ItemPrice;
