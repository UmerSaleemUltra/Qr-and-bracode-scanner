import React, { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Barcode from 'react-barcode'; // Import the barcode generator
import {
  CameraIcon, CheckCircle2, Loader2, Upload, Moon, Sun, Clipboard, Trash2, Download
} from 'lucide-react';

const BarcodeScanner = () => {
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [barcodeText, setBarcodeText] = useState(''); // State to hold barcode text

  const startCamera = (html5QrCode, cameraId) => {
    html5QrCode.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        const timestamp = new Date().toLocaleString();
        if (!history.find(h => h.text === decodedText)) {
          setResult(decodedText);
          setHistory(prev => [{ text: decodedText, time: timestamp }, ...prev]);
        }
        setScanning(false);
        html5QrCode.stop();
      },
      () => {}
    ).then(() => setLoading(false));
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE],
    });

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        startCamera(html5QrCode, cameraId);
      }
    });

    return () => html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("reader");
    try {
      const decoded = await html5QrCode.scanFile(file, true);
      const timestamp = new Date().toLocaleString();
      setResult(decoded);
      if (!history.find(h => h.text === decoded)) {
        setHistory(prev => [{ text: decoded, time: timestamp }, ...prev]);
      }
      setScanning(false);
    } catch (err) {
      alert("No barcode found in the image.");
    }
  };

  const handleRescan = () => {
    setResult('');
    setScanning(true);
    setLoading(true);

    const html5QrCode = new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE],
    });

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        startCamera(html5QrCode, cameraId);
      }
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scan-result.txt';
    link.click();
  };

  const clearHistory = () => setHistory([]);

  const handleBarcodeTextChange = (e) => setBarcodeText(e.target.value); // Handle barcode text input

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
        </div>

        {result && (
          <div className="bg-green-100 text-green-800 p-3 rounded-lg flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="break-words">
                {/^https?:\/\//.test(result) ? (
                  <a href={result} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{result}</a>
                ) : result}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-blue-600">
              <button onClick={copyToClipboard} className="flex items-center gap-1 hover:underline">
                <Clipboard className="w-4 h-4" /> Copy
              </button>
              <button onClick={downloadResult} className="flex items-center gap-1 hover:underline">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={handleRescan} className="hover:underline">Rescan</button>
            </div>
          </div>
        )}

        {/* Barcode Generator Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Generate Barcode</h3>
          <input
            type="text"
            value={barcodeText}
            onChange={handleBarcodeTextChange}
            className="w-full p-2 border rounded-md mb-4"
            placeholder="Enter text to generate barcode"
          />
          {barcodeText && (
            <div className="flex justify-center">
              <Barcode value={barcodeText} />
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">📜 Scan History</h3>
              <button onClick={clearHistory} className="text-xs text-red-500 flex items-center gap-1 hover:underline">
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
            <ul className="text-sm space-y-2 max-h-40 overflow-y-auto">
              {history.map((entry, index) => (
                <li key={index} className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded flex flex-col">
                  <span className="break-words">{entry.text}</span>
                  <span className="text-xs text-gray-500">{entry.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
