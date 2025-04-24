import React, { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraIcon, CheckCircle2, Loader2, Upload, Moon, Sun, Swap } from 'lucide-react';

const BarcodeScanner = () => {
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [cameraId, setCameraId] = useState(null);
  const [cameraList, setCameraList] = useState([]);
  const [scanType, setScanType] = useState('');

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE] });

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameraList(devices);
        setCameraId(devices[0].id);  // Set first camera by default
      }
    });

    return () => {
      if (cameraId) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraId) return;

    const html5QrCode = new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE] });

    html5QrCode.start(cameraId, { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText, decodedResult) => {
        if (!history.includes(decodedText)) {
          setResult(decodedText);
          setScanType(decodedResult.format);
          setHistory(prev => [decodedText, ...prev]);
        }
        setScanning(false);
        html5QrCode.stop();
      },
      () => {}
    ).then(() => setLoading(false));
  }, [cameraId, history]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("reader");
    try {
      const decoded = await html5QrCode.scanFile(file, true);
      setResult(decoded);
      setScanType(decoded.type);
      if (!history.includes(decoded)) {
        setHistory(prev => [decoded, ...prev]);
      }
      setScanning(false);
    } catch (err) {
      alert("No barcode found in the image.");
    }
  };

  const handleCameraSwitch = () => {
    const currentCameraIndex = cameraList.findIndex(camera => camera.id === cameraId);
    const nextCameraIndex = (currentCameraIndex + 1) % cameraList.length;
    setCameraId(cameraList[nextCameraIndex].id);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} min-h-screen py-6 px-4`}>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 relative">
        <div className="absolute top-4 right-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <CameraIcon className="text-blue-600 dark:text-blue-400 w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-center mb-2">Scan Barcode / QR Code</h2>
        <p className="text-center text-sm mb-4">Use webcam or upload an image to scan.</p>

        <div id="reader" className="w-full h-64 border-2 border-dashed border-blue-400 rounded-lg mb-4" />

        {loading && (
          <div className="flex justify-center items-center mt-2 text-blue-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading camera...
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <button onClick={handleCameraSwitch} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition">
            <Swap className="w-5 h-5" />
          </button>
        </div>

        {result && (
          <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="break-words">{result}</span>
          </div>
        )}

        {scanType && (
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg flex items-center gap-2 mb-4">
            <span><strong>Scan Type:</strong> {scanType}</span>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mt-4 mb-2">📜 Scan History</h3>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {history.map((entry, index) => (
                <li key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{entry}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
