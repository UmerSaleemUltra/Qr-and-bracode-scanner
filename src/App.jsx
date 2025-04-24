"use client"

import { useEffect, useState, useRef } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react" // Correct import for qrcode.react
import {
  Camera,
  CheckCircle,
  Loader2,
  Upload,
  Moon,
  Sun,
  Clipboard,
  Download,
  RefreshCw,
  Globe,
  SwitchCamera,
  Share2,
  Search,
  FileUp,
  List,
  Grid,
  Trash2,
} from "lucide-react"

// Country code mapping
const COUNTRY_CODES = {
  "00-13": "USA & Canada",
  "20-29": "In-store",
  "30-37": "France",
  "40-44": "Germany",
  45: "Japan",
  49: "Japan",
  50: "United Kingdom",
  54: "Belgium & Luxembourg",
  57: "Denmark",
  64: "Finland",
  70: "Norway",
  73: "Sweden",
  76: "Switzerland",
  "80-83": "Italy",
  84: "Spain",
  87: "Netherlands",
  "90-91": "Austria",
  93: "Australia",
  94: "New Zealand",
  955: "Malaysia",
  958: "Macau",
  977: "Serial publications",
  "978-979": "Bookland (ISBN)",
  980: "Refund receipts",
  "981-982": "Common Currency Coupons",
  99: "Coupons",
}

// Barcode format options
const BARCODE_FORMATS = [
  { id: "CODE128", name: "Code 128" },
  { id: "EAN13", name: "EAN-13" },
  { id: "UPC", name: "UPC" },
  { id: "CODE39", name: "Code 39" },
]

// Function to detect country from barcode
const detectCountry = (barcode) => {
  if (!barcode || barcode.length < 8 || !/^\d+$/.test(barcode)) {
    return "Unknown"
  }

  const prefix = barcode.substring(0, 3)

  for (const [range, country] of Object.entries(COUNTRY_CODES)) {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map(Number)
      const prefixNum = Number(prefix.substring(0, 2))
      if (prefixNum >= start && prefixNum <= end) {
        return country
      }
    } else if (prefix.startsWith(range)) {
      return country
    }
  }

  return "Unknown"
}

// Function to validate EAN-13 barcode
const validateEAN13 = (barcode) => {
  if (!barcode || barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === Number.parseInt(barcode[12])
}

// Function to get barcode type
const getBarcodeType = (barcode) => {
  if (!barcode) return "Unknown"

  if (/^[0-9]{13}$/.test(barcode)) return "EAN-13"
  if (/^[0-9]{12}$/.test(barcode)) return "UPC-A"
  if (/^[0-9]{8}$/.test(barcode)) return "EAN-8"
  if (/^https?:\/\//.test(barcode)) return "URL"
  if (barcode.length > 20) return "QR Code"

  return "Code 128"
}

function App() {
  // State variables
  const [activeTab, setActiveTab] = useState("scan")
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [generatorText, setGeneratorText] = useState("")
  const [generatorType, setGeneratorType] = useState("barcode")
  const [barcodeFormat, setBarcodeFormat] = useState("CODE128")
  const [cameras, setCameras] = useState([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [countryInfo, setCountryInfo] = useState(null)
  const [batchMode, setBatchMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("list") // list or grid
  const [stats, setStats] = useState({
    totalScans: 0,
    validScans: 0,
    barcodeTypes: {},
    countries: {},
  })

  const html5QrCodeRef = useRef(null)

  // Initialize scanner
  const startCamera = (cameraId) => {
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

  const initCamera = (cameraId) => {
    setLoading(true)
    html5QrCodeRef.current = new Html5Qrcode("reader", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
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
          const barcodeType = getBarcodeType(decodedText)
          const isValid = barcodeType === "EAN-13" ? validateEAN13(decodedText) : true

          setResult(decodedText)
          setCountryInfo(country)

          // Add to history if not already present
          if (!history.find((h) => h.text === decodedText)) {
            const newEntry = {
              text: decodedText,
              time: timestamp,
              country: country,
              type: barcodeType,
              isValid: isValid,
            }

            setHistory((prev) => [newEntry, ...prev])

            // Update statistics
            setStats((prev) => {
              const newStats = { ...prev }
              newStats.totalScans++
              if (isValid) newStats.validScans++

              // Update barcode type stats
              newStats.barcodeTypes[barcodeType] = (newStats.barcodeTypes[barcodeType] || 0) + 1

              // Update country stats
              newStats.countries[country] = (newStats.countries[country] || 0) + 1

              return newStats
            })
          }

          // If not in batch mode, stop scanning
          if (!batchMode) {
            setScanning(false)
            html5QrCodeRef.current?.stop()
          }
        },
        () => {},
      )
      .then(() => setLoading(false))
      .catch((err) => {
        console.error("Error starting camera:", err)
        setLoading(false)
      })
  }

  // Load cameras and initialize
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

    // Load history from localStorage
    const savedHistory = localStorage.getItem("scanHistory")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error("Error loading history:", e)
      }
    }

    // Load stats from localStorage
    const savedStats = localStorage.getItem("scanStats")
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats))
      } catch (e) {
        console.error("Error loading stats:", e)
      }
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

  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("scanHistory", JSON.stringify(history))
    }
  }, [history])

  // Save stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem("scanStats", JSON.stringify(stats))
  }, [stats])

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const html5QrCode = new Html5Qrcode("reader")
      const decoded = await html5QrCode.scanFile(file, true)
      const timestamp = new Date().toLocaleString()
      const country = detectCountry(decoded)
      const barcodeType = getBarcodeType(decoded)
      const isValid = barcodeType === "EAN-13" ? validateEAN13(decoded) : true

      setResult(decoded)
      setCountryInfo(country)

      if (!history.find((h) => h.text === decoded)) {
        const newEntry = {
          text: decoded,
          time: timestamp,
          country: country,
          type: barcodeType,
          isValid: isValid,
        }

        setHistory((prev) => [newEntry, ...prev])

        // Update statistics
        setStats((prev) => {
          const newStats = { ...prev }
          newStats.totalScans++
          if (isValid) newStats.validScans++

          // Update barcode type stats
          newStats.barcodeTypes[barcodeType] = (newStats.barcodeTypes[barcodeType] || 0) + 1

          // Update country stats
          newStats.countries[country] = (newStats.countries[country] || 0) + 1

          return newStats
        })
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

  const copyToClipboard = (text = result) => {
    navigator.clipboard.writeText(text)
  }

  const downloadResult = (text = result) => {
    const blob = new Blob([text], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "scan-result.txt"
    link.click()
  }

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all scan history?")) {
      setHistory([])
      localStorage.removeItem("scanHistory")
    }
  }

  const handleGeneratorTextChange = (e) => {
    setGeneratorText(e.target.value)
  }

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "scan-history.json"
    link.click()
  }

  const importHistory = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedHistory = JSON.parse(event.target.result)
        if (Array.isArray(importedHistory)) {
          setHistory(importedHistory)
          localStorage.setItem("scanHistory", JSON.stringify(importedHistory))
        }
      } catch (err) {
        alert("Invalid history file format")
      }
    }
    reader.readAsText(file)
  }

  const shareResult = () => {
    if (navigator.share && result) {
      navigator
        .share({
          title: "Scanned Barcode",
          text: result,
        })
        .catch((err) => {
          console.error("Error sharing:", err)
        })
    } else {
      alert("Sharing not supported on this browser")
    }
  }

  // Filter history based on search term
  const filteredHistory = history.filter(
    (entry) =>
      entry.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.country && entry.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.type && entry.type.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen bg-gray-100 dark:bg-gray-900 p-4`}>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative">
        {/* Header with tabs */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {cameras.length > 1 && activeTab === "scan" && (
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
          {activeTab === "scan" && cameras.length > 0 && currentCameraIndex < cameras.length && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              <span>Using: {cameras[currentCameraIndex].label}</span>
            </p>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "scan"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("scan")}
          >
            Scan
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "generate"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("generate")}
          >
            Generate
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "history"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "stats"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("stats")}
          >
            Stats
          </button>
        </div>

        {/* Scan Tab */}
        {activeTab === "scan" && (
          <div>
            {/* Batch mode toggle */}
            <div className="flex items-center justify-end mb-2">
              <label className="inline-flex items-center cursor-pointer">
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">Batch Mode</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={() => setBatchMode(!batchMode)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
              </label>
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

                    <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Type:</span>
                        <span>{getBarcodeType(result)}</span>
                      </div>

                      {countryInfo && (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          <span>Country: {countryInfo}</span>
                        </div>
                      )}

                      {getBarcodeType(result) === "EAN-13" && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Valid:</span>
                          <span>{validateEAN13(result) ? "Yes" : "No"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 text-xs border-t border-green-200 dark:border-green-800 pt-2">
                  <button
                    onClick={() => copyToClipboard(result)}
                    className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
                  >
                    <Clipboard className="w-4 h-4" /> Copy
                  </button>
                  <button
                    onClick={() => downloadResult(result)}
                    className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={shareResult}
                    className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generator Type</label>
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setGeneratorType("barcode")}
                  className={`flex-1 py-2 text-sm ${generatorType === "barcode" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  Barcode
                </button>
                <button
                  onClick={() => setGeneratorType("qrcode")}
                  className={`flex-1 py-2 text-sm ${generatorType === "qrcode" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  QR Code
                </button>
              </div>
            </div>

            {generatorType === "barcode" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Barcode Format
                </label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  {BARCODE_FORMATS.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enter text to generate {generatorType === "barcode" ? "barcode" : "QR code"}
              </label>
              <input
                type="text"
                value={generatorText}
                onChange={handleGeneratorTextChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={`Enter text for ${generatorType === "barcode" ? "barcode" : "QR code"}`}
              />
            </div>

            {generatorText && (
              <div className="flex justify-center p-6 bg-white rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                {generatorType === "barcode" ? (
                  <Barcode value={generatorText} format={barcodeFormat} width={1.5} height={50} fontSize={14} />
                ) : (
                  <QRCodeSVG value={generatorText} size={200} level="H" includeMargin={true} />
                )}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search history..."
                  className="pl-9 w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                  className="p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  title={viewMode === "list" ? "Grid View" : "List View"}
                >
                  {viewMode === "list" ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>

                <button
                  onClick={clearHistory}
                  className="p-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Clear History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={exportHistory}
                className="text-xs flex items-center text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-3 h-3 mr-1" /> Export History
              </button>

              <label className="text-xs flex items-center text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                <FileUp className="w-3 h-3 mr-1" /> Import History
                <input type="file" accept=".json" onChange={importHistory} className="hidden" />
              </label>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No scan history found</div>
            ) : (
              <div
                className={`${viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"} max-h-96 overflow-y-auto pr-1`}
              >
                {filteredHistory.map((entry, index) => (
                  <div key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col">
                    <span className="break-words text-gray-800 dark:text-gray-200 font-medium">{entry.text}</span>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {entry.type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {entry.type}
                        </span>
                      )}

                      {entry.country && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <Globe className="w-3 h-3 mr-1" />
                          {entry.country}
                        </span>
                      )}

                      {entry.isValid === true && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Valid
                        </span>
                      )}

                      {entry.isValid === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          Invalid
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{entry.time}</span>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(entry.text)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Copy"
                        >
                          <Clipboard className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Total Scans</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalScans}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Valid Codes</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.validScans}</p>
              </div>
            </div>

            {/* By Type */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">By Type</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {Object.entries(stats.barcodeTypes).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.barcodeTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                        <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* By Country */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">By Country</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {Object.entries(stats.countries).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.countries).map(([country, count]) => (
                      <div key={country} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{country}</span>
                        <span className="text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-0.5 rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
