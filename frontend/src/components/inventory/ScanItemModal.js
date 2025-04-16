// 位置：frontend/src/components/inventory/ScanItemModal.js
import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'antd';

const ScanItemModal = ({ onClose, onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerIntervalRef = useRef(null);

  // 啟動 QR 碼掃描
  useEffect(() => {
    let stream = null;
    
    const startScanner = async () => {
      try {
        setError(null);
        setIsScanning(true);
        
        // 請求攝像頭權限
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // 優先使用後置攝像頭
        });
        
        // 將視訊流設置到 video 元素
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // 開始掃描
          startScanningQRCode();
        }
      } catch (err) {
        console.error('啟動掃描器失敗:', err);
        setError(err.message || '無法啟動攝像頭，請確保瀏覽器有權限訪問攝像頭');
        setIsScanning(false);
      }
    };
    
    startScanner();
    
    // 清理函數
    return () => {
      // 停止掃描
      if (scannerIntervalRef.current) {
        clearInterval(scannerIntervalRef.current);
      }
      
      // 停止攝像頭
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 開始掃描 QR 碼
  const startScanningQRCode = () => {
    // 預先載入 jsQR 庫
    if (typeof window.jsQR !== 'function') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload = () => {
        // jsQR 庫已加載，開始掃描
        setupScanning();
      };
      script.onerror = () => {
        setError('無法載入 QR 碼掃描庫，請檢查網絡連接');
        setIsScanning(false);
      };
      document.body.appendChild(script);
    } else {
      // jsQR 庫已加載，直接開始掃描
      setupScanning();
    }
  };

  // 設置掃描週期
  const setupScanning = () => {
    scannerIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // 設置 canvas 大小與視訊流相同
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 畫面捕捉
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 獲取影像數據
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // 使用 jsQR 解碼
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        
        // 如果找到 QR 碼
        if (code) {
          console.log('掃描到 QR 碼:', code.data);
          clearInterval(scannerIntervalRef.current);
          
          // 解析 URL 並提取 itemId
          try {
            const url = new URL(code.data);
            const pathParts = url.pathname.split('/');
            const itemId = pathParts[pathParts.length - 1];
            
            if (itemId) {
              setScanResult(itemId);
              onScanSuccess && onScanSuccess(itemId);
            } else {
              setError('無效的 QR 碼，找不到庫存項目 ID');
            }
          } catch (err) {
            console.error('解析 QR 碼數據失敗:', err);
            setError('無效的 QR 碼格式');
          }
          
          setIsScanning(false);
        }
      }
    }, 200); // 每200毫秒掃描一次
  };

  // 手動輸入模式
  const [manualInput, setManualInput] = useState('');
  
  const handleManualSubmit = (e) => {
    e.preventDefault();
    
    if (!manualInput.trim()) {
      setError('請輸入庫存項目 ID');
      return;
    }
    
    onScanSuccess && onScanSuccess(manualInput.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">掃描 QR 碼</h2>
          <Button 
            onClick={onClose}
            variant="secondary"
            className="py-1 px-2"
          >
            關閉
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {isScanning ? (
          <div className="relative">
            <div className="w-full aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              ></video>
              <div className="absolute inset-0 border-2 border-green-500 pointer-events-none"></div>
            </div>
            <canvas 
              ref={canvasRef}
              className="hidden"
            ></canvas>
            <p className="text-center mt-2 text-gray-300">
              將 QR 碼對準框內...
            </p>
          </div>
        ) : scanResult ? (
          <div className="text-center p-4">
            <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
              成功掃描 QR 碼
            </div>
            <p>正在載入庫存項目...</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-4 text-gray-300">
              無法使用攝像頭？您可以手動輸入庫存項目 ID
            </p>
            <form onSubmit={handleManualSubmit} className="flex space-x-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="請輸入庫存項目 ID"
                className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <Button type="submit">
                確認
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanItemModal;