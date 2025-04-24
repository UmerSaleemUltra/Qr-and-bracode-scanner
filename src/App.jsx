"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import Barcode from "react-barcode"
import {
  Camera,
  CheckCircle,
  Loader2,
  Upload,
  Moon,
  Sun,
  Clipboard,
  Trash2,
  Download,
  RefreshCw,
  Globe,
  SwitchCamera,
} from "lucide-react"

// Country code regex pattern
const COUNTRY_CODE_REGEX = /^[A-Z]{2}|[A-Z]{2}-[A-Z]{2}|[A-Z]{2}\s[A-Z]{2}/

// Simple mapping of some country codes
const COUNTRY_CODES: Record<string, string> = {
  US: "United States",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  RU: "Russia",
  ZA: "South Africa",
  SG: "Singapore",
  KR: "South Korea",
}

export const BarcodeScanner = () => {
  const [result, setResult] = useState("")
  const [history, setHistory] = useState<{ text: string; time: string; country?: string }[]>([])
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [barcodeText, setBarcodeText] = useState("")
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [countryInfo, setCountryInfo] = useState<string | null>(null)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

  const detectCountry = (text: string): string | null => {
    // Check for country code pattern
    const match = text.match(COUNTRY_CODE_REGEX)
    if (match) {
      const code = match[0].replace(/\s/g, "").split("-")[0]
      return COUNTRY_CODES[code] || code
    }

    // Check if the text contains any known country code
    for (const [code, country] of Object.entries(COUNTRY_CODES)) {
      if (text.includes(code)) {
        return country
      }
      if (text.toLowerCase().includes(country.toLowerCase())) {
        return country
      }
    }

    return null
  }

  const startCamera = (cameraId: string) => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          initCamera(cameraId)
        })
        .catch(() => {
          initCamera(cameraId)
        })
    } else {
      initCamera(cameraId)
    }
  }

  const initCamera = (cameraId: string) => {
    setLoading(true)
    html5QrCodeRef.current = new Html5Qrcode("reader", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
      ],
    })

    html5QrCodeRef.current
      .start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const timestamp = new Date().toLocaleString()
          const country = detectCountry(decodedText)

          if (!history.find((h) => h.text === decodedText)) {
            setResult(decodedText)
            setCountryInfo(country)
            setHistory((prev) => [
              {
                text: decodedText,
                time: timestamp,
                country: country || undefined,
              },
              ...prev,
            ])
          }

          setScanning(false)
          html5QrCodeRef.current?.stop()
        },
        () => {},
      )
      .then(() => setLoading(false))
  }

  useEffect(() => {
    // Load available cameras
    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length) {
        setCameras(devices)
        startCamera(devices[0].id)
      }
    })

    // Apply dark mode from user preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDarkMode(true)
    }

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear()
          })
          .catch(() => {})
      }
    }
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const html5QrCode = new Html5Qrcode("reader")
      const decoded = await html5QrCode.scanFile(file, true)
      const timestamp = new Date().toLocaleString()
      const country = detectCountry(decoded)

      setResult(decoded)
      setCountryInfo(country)

      if (!history.find((h) => h.text === decoded)) {
        setHistory((prev) => [
          {
            text: decoded,
            time: timestamp,
            country: country || undefined,
          },
          ...prev,
        ])
      }

      setScanning(false)
    } catch (err) {
      alert("No barcode found in the image.")
    }
  }

  const handleRescan = () => {
    setResult("")
    setCountryInfo(null)
    setScanning(true)

    if (cameras.length > 0) {
      startCamera(cameras[currentCameraIndex].id)
    }
  }

  const switchCamera = () => {
    if (cameras.length <= 1) return

    const nextCameraIndex = (currentCameraIndex + 1) % cameras.length
    setCurrentCameraIndex(nextCameraIndex)
    startCamera(cameras[nextCameraIndex].id)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result)
  }

  const downloadResult = () => {
    const blob = new Blob([result], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "scan-result.txt"
    link.click()
  }

  const clearHistory = () => setHistory([])

  const handleBarcodeTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeText(e.target.value)
  }

  return (
    <div className={`${darkMode ? "dark" : ""} w-full max-w-md`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative">
        <div className="absolute top-4 right-4 flex space-x-2">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
              title="Switch Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3">
            <Camera className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-1">Barcode & QR Scanner</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {cameras.length > 0 && currentCameraIndex < cameras.length && (
              <span>Using: {cameras[currentCameraIndex].label}</span>
            )}
          </p>
        </div>

        <div
          id="reader"
          className="w-full h-64 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg mb-4 overflow-hidden bg-gray-50 dark:bg-gray-900"
        />

        {loading && (
          <div className="flex justify-center items-center mt-2 text-blue-500 dark:text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading camera...</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <Upload className="w-4 h-4" />
            Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          {!scanning && (
            <button
              onClick={handleRescan}
              className="flex items-center gap-2 text-sm bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Scan Again
            </button>
          )}
        </div>

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg flex flex-col gap-3 mb-6 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="break-words">
                  {/^https?:\/\//.test(result) ? (
                    <a
                      href={result}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      {result}
                    </a>
                  ) : (
                    result
                  )}
                </div>

                {countryInfo && (
                  <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Globe className="w-4 h-4 mr-1" />
                    <span>Country: {countryInfo}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 text-xs border-t border-green-200 dark:border-green-800 pt-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
              >
                <Clipboard className="w-4 h-4" /> Copy
              </button>
              <button
                onClick={downloadResult}
                className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        )}

        {/* Barcode Generator Section */}
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Generate Barcode</h3>
          <input
            type="text"
            value={barcodeText}
            onChange={handleBarcodeTextChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Enter text to generate barcode"
          />
          {barcodeText && (
            <div className="flex justify-center p-4 bg-white rounded-lg overflow-x-auto">
              <Barcode value={barcodeText} width={1.5} height={50} fontSize={14} />
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Scan History</h3>
              <button
                onClick={clearHistory}
                className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 hover:text-red-700 dark:hover:text-red-300 transition"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
              {history.map((entry, index) => (
                <div key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col">
                  <span className="break-words text-gray-800 dark:text-gray-200">{entry.text}</span>

                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{entry.time}</span>
                    {entry.country && (
                      <span className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {entry.country}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
