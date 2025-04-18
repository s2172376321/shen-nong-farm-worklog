// 位置：frontend/src/components/inventory/ScanItemModal.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, message } from 'antd';
import { Html5QrcodeScanner } from 'html5-qrcode';
import InventoryCheckoutForm from './InventoryCheckoutForm';
import { fetchInventoryItemByProductId } from '../../utils/inventoryApi';

const ScanItemModal = ({ visible, onClose, onScanSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const scannerRef = useRef(null);

  const handleScan = useCallback(async (decodedText) => {
    try {
      setLoading(true);
      
      // 從QR碼中提取產品ID
      const url = new URL(decodedText);
      const productId = url.searchParams.get('productId');
      
      if (!productId) {
        message.error('無效的QR碼');
        return;
      }

      // 獲取庫存項目
      const item = await fetchInventoryItemByProductId(productId);
      
      if (!item) {
        message.error('找不到對應的庫存項目');
        return;
      }

      setScannedItem(item);
      setShowCheckoutForm(true);
      
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    } catch (error) {
      console.error('掃描處理失敗:', error);
      message.error('掃描處理失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('掃描錯誤:', error);
    message.error('掃描失敗，請重試');
  }, []);

  useEffect(() => {
    if (visible) {
      // 初始化掃描器
      const qrScanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: 250,
        aspectRatio: 1.0
      });

      qrScanner.render(handleScan, handleError);
      scannerRef.current = qrScanner;
    } else {
      // 清理掃描器
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      setScannedItem(null);
      setShowCheckoutForm(false);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [visible, handleScan, handleError]);

  const handleCheckoutSuccess = () => {
    setScannedItem(null);
    setShowCheckoutForm(false);
    if (onScanSuccess) {
      onScanSuccess();
    }
    onClose();
  };

  return (
    <Modal
      title={showCheckoutForm ? "庫存領用" : "掃描QR碼"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {!showCheckoutForm && !loading && (
        <div>
          <div id="qr-reader" style={{ width: '100%' }}></div>
          <p className="text-center mt-4">
            請將QR碼對準相機進行掃描
          </p>
        </div>
      )}
      
      {showCheckoutForm && scannedItem && (
        <InventoryCheckoutForm
          item={scannedItem}
          onSuccess={handleCheckoutSuccess}
          onCancel={() => {
            setShowCheckoutForm(false);
            setScannedItem(null);
          }}
        />
      )}
    </Modal>
  );
};

export default ScanItemModal;