
import React, { useRef, useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Tesseract from "tesseract.js";
import iconImgR from "/Top_R.png";
import iconImgL from "/Top_L.png";
import items from "../data/items.json";

const ItemPrice = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Idle");
  const [itemList, setItemList] = useState([]);
  const [loading, setLoading] = useState(false);
  const chance = Math.random() < 0.9;

  const canvasCrop = useRef(null);

  const getCurrentPrice = async (id) => {
    setLoading(true);
    const query = `
      query MyQuery {
        item(
          id: "${id}",
          gameMode: pve
        ) {
          id
          name
          sellFor {
            currency
            price
            priceRUB
            source
          }
        }
      }
  `;

    // 2. Fetch with params converted to string
    try {
      const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (result.data && result.data.item) {
        // console.log(result.data.item);
        setItemList(prev => {
          return prev.some(i => i.id === result.data.item.id) ? prev :
            [result.data.item, ...prev]
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

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

    if (matchL.maxVal >= 0.4) {
      // console.log("✅ Found LEFT icon", matchL.maxVal);

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
          const image = canvasCrop.current.toDataURL("image/png");

          processImage(image);
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

  const levenshtein = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[a.length][b.length];
  };

  const processImage = async (image) => {
    const result = await Tesseract.recognize(
      image,
      'eng',
      // { logger: m => console.log(m.status) }
    );
    // console.log(result.data.text.split('|\n')[0].trim());
    const text = result.data.text.split('|\n')[0].trim();

    let min = Infinity;
    const best = items.reduce((best, item) => {
      const d = levenshtein(text, item.name);
      return d < min ? (min = d, item) : best;
    }, null);
    if (best) {
      // console.log(best);
      if (itemList.some(i => i.id === best.id)) return;
      getCurrentPrice(best.id);
    }
  };



  const getTierColor = (price) => {
    if (price >= 100000) return { border: '#ff4444', glow: 'rgb(255, 187, 0)' }; // แพงมาก (แดง/ส้ม)
    if (price >= 35000) return { border: '#ffbb33', glow: 'rgba(255, 65, 223, 0.59)' };  // ปานกลาง (เหลือง)
    if (price >= 20000) return { border: '#00C851', glow: 'rgba(105, 255, 165, 0.82)' };   // พอใช้ (เขียว)
    return { border: 'rgba(255, 255, 255, 0.1)', glow: 'transparent' };               // ทั่วไป
  };




  return (
    <div className="m-5">
      <h4>Full Res Icon Detection</h4>
      <div className="row">
        <div>
          <div className="d-flex align-items-center">
            <button className="btn btn-primary me-2" onClick={startCapture}>Start Capture</button>
            <button className="btn btn-danger me-2" onClick={stopCapture}>Stop</button>
            <div className="border ms-2 flex-grow-1" style={{ height: '40px' }}>
              <canvas ref={canvasCrop} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
          <p>Status: <span className="badge bg-dark">{status}</span></p>
          <video ref={videoRef} style={{ display: "none" }} />
          <div className="border" style={{ overflow: "auto", maxWidth: "100%", maxHeight: "100%", display: 'none' }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />
          </div>
          <img id="templateR" src={iconImgR} alt="template" style={{ display: "none" }} />
          <img id="templateL" src={iconImgL} alt="template" style={{ display: "none" }} />

          {/* <h4 className="mt-3 text-center">Item Lists</h4> */}
          {(loading && itemList.length === 0) ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: "calc(100vh - 25rem)" }}
            >
              <h1>Loading prices...</h1>
            </div>
          ) : (!loading && itemList.length === 0) ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: "calc(100vh - 25rem)" }}
            >
              <h1>{chance ? "No items in list" : "หาม้าย Items นิ๊"}</h1>
            </div>
          ) : (
            <>
              {/* <div className="container">
                <div className="row justify-content-center">
                  {itemList?.map((item, index) => {
                    const data = items.find(i => i.id === item.id);
                    const trader = item?.sellFor
                      .filter(trader => trader.source !== "fleaMarket") // 1. Remove Flea Market
                      .sort((a, b) => b.priceRUB - a.priceRUB)[0];      // 2. Sort Descending & take first
                    const fleaMarket = item?.sellFor.find(trader => trader.source === "fleaMarket");
                    return (
                      <div key={index} className="border 1px solid gray m-2 col-md-4" style={{ maxWidth: '22%' }}>
                        <h5 className="card-title mt-2">{data.shortName}</h5>
                        <p className="card-title"><em>{data.name}</em></p>
                        <div className="row mt-2">
                          <div className="col d-flex align-items-center justify-content-center">
                            <img src={data.inspectImageLink} alt={data.name} style={{ width: '8rem' }} />
                          </div>
                          <div className="col">
                            <p className="card-text mb-1"><b className="text-info">Trader Price:</b> <br /> <em>{trader?.source}</em> <br /> {trader?.price} {trader?.currency}</p>
                            {fleaMarket && <p><b className="text-danger">FleaMarket:</b> <br /> {fleaMarket?.price} {fleaMarket?.currency}</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div> */}






              <div className="container">
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 justify-content-center">
                  {itemList?.map((item, index) => {
                    const data = items.find((i) => i.id === item.id);
                    if (!data) return null;

                    const trader = item?.sellFor
                      .filter((t) => t.source !== "fleaMarket")
                      .sort((a, b) => b.priceRUB - a.priceRUB)[0];

                    const fleaMarket = item?.sellFor.find((t) => t.source === "fleaMarket");

                    // หาค่าราคาที่สูงที่สุดเพื่อกำหนด Tier
                    const maxPrice = Math.max(trader?.priceRUB || 0, fleaMarket?.priceRUB || 0);
                    const tier = getTierColor(maxPrice);

                    return (
                      <div key={index} className="col">
                        <div
                          className="card h-100 border-0 text-light"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            // เปลี่ยนสี Border ตามราคา
                            border: `1px solid ${tier.border}`, 
                            // เพิ่มเงาเรืองแสงตามสี Tier
                            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px ${tier.glow}`,
                            transition: 'all 0.3s ease' // เพิ่ม transition ให้ดูนุ่มนวล
                          }}
                        >
                          <div className="card-body p-3 d-flex flex-column">
                            {/* ชื่อสินค้า */}
                            <h6 className="text-warning mb-0 fw-bold">{data.shortName}</h6>
                            <small className="text-white-50 text-truncate mb-3" title={data.name}>
                              {data.name}
                            </small>

                            {/* รูปภาพสินค้า พร้อมเอฟเฟกต์เรืองแสงเบาๆ */}
                            <div
                              className="d-flex align-items-center justify-content-center mb-3 rounded"
                              style={{
                                height: '140px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                              }}
                            >
                              <img
                                src={data.inspectImageLink}
                                alt={data.name}
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}
                              />
                            </div>

                            {/* ส่วนราคา */}
                            <div className="mt-auto">
                              {/* Trader Price */}
                              <div className="p-2 rounded mb-2" style={{ background: 'rgba(23, 162, 184, 0.15)', borderLeft: '4px solid #17a2b8' }}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-info fw-bold text-uppercase">{trader?.source}</small>
                                  <span className="fw-bold">{trader?.price?.toLocaleString()} {trader?.currency}</span>
                                </div>
                              </div>

                              {/* Flea Market Price */}
                              {fleaMarket && (
                                <div className="p-2 rounded" style={{ background: 'rgba(220, 53, 69, 0.15)', borderLeft: '4px solid #dc3545' }}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-danger fw-bold">FLEA</small>
                                    <span className="fw-bold">
                                      {fleaMarket?.price?.toLocaleString()} {fleaMarket?.currency}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default ItemPrice;