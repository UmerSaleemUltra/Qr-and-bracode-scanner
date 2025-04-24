"use client"

import React, { useEffect, useState, useRef } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import Barcode from "react-barcode"
import QRCode from "qrcode.react"
import { Camera, CheckCircle, Loader2, Upload, Moon, Sun, Clipboard, Trash2, Download, RefreshCw, Globe, SwitchCamera, Search, BarChart2, Save, FileUp, Filter, Settings, List, Grid, QrCode, Smartphone, Layers, X, Info, AlertCircle, CheckCircleIcon } from 'lucide-react'

// Country code database (expanded)
const COUNTRY_CODES = {
  // EAN/UPC Prefixes
  "00-13": "USA & Canada",
  "20-29": "In-store",
  "30-37": "France",
  "40-44": "Germany",
  "45": "Japan",
  "49": "Japan",
  "50": "United Kingdom",
  "54": "Belgium & Luxembourg",
  "57": "Denmark",
  "64": "Finland",
  "70": "Norway",
  "73": "Sweden",
  "76": "Switzerland",
  "80-83": "Italy",
  "84": "Spain",
  "87": "Netherlands",
  "90-91": "Austria",
  "93": "Australia",
  "94": "New Zealand",
  "955": "Malaysia",
  "958": "Macau",
  "977": "Serial publications",
  "978-979": "Bookland (ISBN)",
  "980": "Refund receipts",
  "981-982": "Common Currency Coupons",
  "99": "Coupons",
  // ISO Country Codes
  "US": "United States",
  "UK": "United Kingdom",
  "CA": "Canada",
  "AU": "Australia",
  "DE": "Germany",
  "FR": "France",
  "JP": "Japan",
  "CN": "China",
  "IN": "India",
  "BR": "Brazil",
  "MX": "Mexico",
  "ES": "Spain",
  "IT": "Italy",
  "NL": "Netherlands",
  "RU": "Russia",
  "ZA": "South Africa",
  "SG": "Singapore",
  "KR": "South Korea",
}

// Barcode validation patterns
const BARCODE_PATTERNS = {
  EAN13: /^[0-9]{13}$/,
  EAN8: /^[0-9]{8}$/,
  UPC: /^[0-9]{12}$/,
  ISBN: /^(978|979)[0-9]{10}$/,
  CODE39: /^[A-Z0-9\-\.\$\/\+\%\s]+$/,
  CODE128: /^[\x00-\x7F]+$/,
}

// Barcode type detection
const detectBarcodeType = (text) => {
  if (BARCODE_PATTERNS.EAN13.test(text)) return "EAN-13"
  if (BARCODE_PATTERNS.EAN8.test(text)) return "EAN-8"
  if (BARCODE_PATTERNS.UPC.test(text)) return "UPC-A"
  if (BARCODE_PATTERNS.ISBN.test(text)) return "ISBN"
  if (text.startsWith("http") || text.includes("www.")) return "URL"
  if (BARCODE_PATTERNS.CODE39.test(text)) return "Code 39"
  if (BARCODE_PATTERNS.CODE128.test(text)) return "Code 128"
  return "Unknown"
}

// Function to validate EAN-13 checksum
const validateEAN13 = (barcode) => {
  if (!BARCODE_PATTERNS.EAN13.test(barcode)) return false
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3)
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(barcode[12])
}

const BarcodeScanner = () => {
  // Core states
  const [result, setResult] = useState("")
  const [history, setHistory] = useState([])
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  
  // Camera states
  const [cameras, setCameras] = useState([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  
  // Generator states
  const [generatorText, setGeneratorText] = useState("")
  const [generatorType, setGeneratorType] = useState("barcode") // barcode or qrcode
  const [barcodeFormat, setBarcodeFormat] = useState("CODE128")
  
  // Advanced features
  const [countryInfo, setCountryInfo] = useState(null)
  const [barcodeType, setBarcodeType] = useState(null)
  const [isValid, setIsValid] = useState(null)
  const [viewMode, setViewMode] = useState("list") // list or grid
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [batchMode, setBatchMode] = useState(false)
  const [batchResults, setBatchResults] = useState([])
  const [showStats, setShowStats] = useState(false)
  const [productInfo, setProductInfo] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState("scan") // scan, generate, history, stats
  
  const html5QrCodeRef = useRef(null)
  
  // Load from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("scanHistory")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error("Failed to load history from localStorage", e)
      }
    }
    
    // Check system dark mode preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDarkMode(true)
    }
    
    // Initialize camera
    initializeCameras()
    
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [])
  
  // Save to local storage when history changes
  useEffect(() => {
    localStorage.setItem("scanHistory", JSON.stringify(history))
  }, [history])
  
  // Initialize cameras
  const initializeCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length) {
        setCameras(devices)
        startCamera(devices[0].id)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error("Error getting cameras:", err)
      setLoading(false)
    }
  }
  
  // Detect country from barcode
  const detectCountry = (text) => {
    // Check for EAN/UPC prefix
    if (/^\d{13}$/.test(text)) {
      const prefix = text.substring(0, 3)
      
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
    }
    
    // Check for country code in text
    for (const [code, country] of Object.entries(COUNTRY_CODES)) {
      if (text.includes(code)) {
        return country
      }
    }
    
    return null
  }
  
  // Start camera with given ID
  const startCamera = (cameraId) => {
    setLoading(true)
    
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        initializeScanner(cameraId)
      }).catch(() => {
        initializeScanner(cameraId)
      })
    } else {
      initializeScanner(cameraId)
    }
  }
  
  // Initialize scanner with camera ID
  const initializeScanner = (cameraId) => {
    html5QrCodeRef.current = new Html5Qrcode("reader", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
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
          processResult(decodedText)
          
          if (!batchMode) {
            html5QrCodeRef.current?.stop()
            setScanning(false)
          } else {
            // In batch mode, continue scanning
            if (!batchResults.includes(decodedText)) {
              setBatchResults(prev => [...prev, decodedText])
            }
          }
        },
        () => {}
      )
      .then(() => setLoading(false))
      .catch(err => {
        console.error("Error starting camera:", err)
        setLoading(false)
      })
  }
  
  // Process scan result
  const processResult = (decodedText) => {
    const timestamp = new Date().toLocaleString()
    const country = detectCountry(decodedText)
    const type = detectBarcodeType(decodedText)
    const valid = type === "EAN-13" ? validateEAN13(decodedText) : null
    
    setResult(decodedText)
    setCountryInfo(country)
    setBarcodeType(type)
    setIsValid(valid)
    
    // Check if this is a new scan
    if (!history.find(h => h.text === decodedText)) {
      const newEntry = {
        text: decodedText,
        time: timestamp,
        country,
        type,
        valid,
      }
      
      setHistory(prev => [newEntry, ...prev])
      
      // Try to fetch product info for EAN/UPC codes
      if (type === "EAN-13" || type === "UPC-A") {
        fetchProductInfo(decodedText)
      }
    }
  }
  
  // Fetch product info (mock implementation)
  const fetchProductInfo = (barcode) => {
    // This would normally be an API call
    // For demo purposes, we'll just simulate a response
    setTimeout(() => {
      if (Math.random() > 0.5) {
        setProductInfo({
          name: `Product ${barcode.substring(0, 4)}`,
          manufacturer: `Company ${barcode.substring(4, 6)}`,
          category: ["Electronics", "Food", "Books", "Clothing"][Math.floor(Math.random() * 4)],
          price: `$${(Math.random() * 100).toFixed(2)}`,
        })
      } else {
        setProductInfo(null)
      }
    }, 500)
  }
  
  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const html5QrCode = new Html5Qrcode("reader")
      const decoded = await html5QrCode.scanFile(file, true)
      processResult(decoded)
      setScanning(false)
    } catch (err) {
      alert("No barcode found in the image.")
    }
  }
  
  // Handle rescan
  const handleRescan = () => {
    setResult("")
    setCountryInfo(null)
    setBarcodeType(null)
    setIsValid(null)
    setProductInfo(null)
    setScanning(true)
    
    if (cameras.length > 0) {
      startCamera(cameras[currentCameraIndex].id)
    }
  }
  
  // Switch camera
  const switchCamera = () => {
    if (cameras.length <= 1) return
    
    const nextCameraIndex = (currentCameraIndex + 1) % cameras.length
    setCurrentCameraIndex(nextCameraIndex)
    startCamera(cameras[nextCameraIndex].id)
  }
  
  // Toggle batch mode
  const toggleBatchMode = () => {
    const newBatchMode = !batchMode
    setBatchMode(newBatchMode)
    
    if (newBatchMode) {
      setBatchResults([])
      // If we're not scanning, start scanning
      if (!scanning) {
        setScanning(true)
        startCamera(cameras[currentCameraIndex].id)
      }
    } else {
      // If turning off batch mode, stop scanning
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop()
        setScanning(false)
      }
    }
  }
  
  // Finish batch scanning
  const finishBatchScan = () => {
    setBatchMode(false)
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop()
      setScanning(false)
    }
  }
  
  // Copy to clipboard
  const copyToClipboard = (text = result) => {
    navigator.clipboard.writeText(text)
  }
  
  // Download result
  const downloadResult = (text = result) => {
    const blob = new Blob([text], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "scan-result.txt"
    link.click()
  }
  
  // Export history
  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "scan-history.json"
    link.click()
  }
  
  // Import history
  const importHistory = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedHistory = JSON.parse(event.target.result)
        if (Array.isArray(importedHistory)) {
          setHistory(prev => [...importedHistory, ...prev])
        }
      } catch (err) {
        alert("Invalid history file")
      }
    }
    reader.readAsText(file)
  }
  
  // Clear history
  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all scan history?")) {
      setHistory([])
    }
  }
  
  // Filter history
  const filteredHistory = history.filter(entry => {
    // Apply search filter
    const matchesSearch = searchTerm === "" || 
      entry.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.country && entry.country.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Apply type filter
    const matchesType = filterType === "all" || 
      (filterType === "valid" && entry.valid === true) ||
      (filterType === "invalid" && entry.valid === false) ||
      entry.type === filterType
    
    return matchesSearch && matchesType
  })
  
  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      total: history.length,
      byType: {},
      byCountry: {},
      validCount: 0,
      invalidCount: 0,
      byDate: {},
    }
    
    history.forEach(entry => {
      // Count by type
      if (entry.type) {
        stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1
      }
      
      // Count by country
      if (entry.country) {
        stats.byCountry[entry.country] = (stats.byCountry[entry.country] || 0) + 1
      }
      
      // Count valid/invalid
      if (entry.valid === true) stats.validCount++
      if (entry.valid === false) stats.invalidCount++
      
      // Count by date
      const date = new Date(entry.time).toLocaleDateString()
      stats.byDate[date] = (stats.byDate[date] || 0) + 1
    })
    
    return stats
  }
  
  // Get stats for display
  const stats = calculateStats()
  
  return (
    <div className={`${darkMode ? "dark" : ""} w-full max-w-2xl`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative">
        {/* Header with tabs */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Camera className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Barcode Scanner Pro
          </h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
              title={darkMode ? "Light Mode" : "Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Settings panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg relative">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-medium mb-3 text-gray-800 dark:text-white">Settings</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Batch Mode</span>
                <button 
                  onClick={toggleBatchMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${batchMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${batchMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">View Mode</span>
                <div className="flex border rounded overflow-hidden">
                  <button 
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1 text-xs ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1 text-xs ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                <button 
                  onClick={exportHistory}
                  className="text-xs flex items-center text-blue-600 dark:text-blue-400"
                >
                  <Download className="w-4 h-4 mr-1" /> Export History
                </button>
                
                <label className="text-xs flex items-center text-blue-600 dark:text-blue-400 cursor-pointer">
                  <FileUp className="w-4 h-4 mr-1" /> Import History
                  <input type="file" accept=".json" onChange={importHistory} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "scan" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <Camera className="w-4 h-4 inline mr-1" /> Scan
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "generate" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <Layers className="w-4 h-4 inline mr-1" /> Generate
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "history" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <List className="w-4 h-4 inline mr-1" /> History
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "stats" ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <BarChart2 className="w-4 h-4 inline mr-1" /> Stats
          </button>
        </div>
        
        {/* Scan Tab */}
        {activeTab === "scan" && (
          <div>
            {/* Camera selection */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={switchCamera}
                  className="flex items-center gap-2 text-sm bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition"
                >
                  <SwitchCamera className="w-4 h-4" />
                  Switch Camera
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Using: {cameras[currentCameraIndex]?.label || `Camera ${currentCameraIndex + 1}`}
                </span>
              </div>
            )}
            
            {/* Batch mode indicator */}
            {batchMode && (
              <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  <span className="text-sm">Batch Mode: {batchResults.length} scanned</span>
                </div>
                <button
                  onClick={finishBatchScan}
                  className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded"
                >
                  Finish
                </button>
              </div>
            )}
            
            {/* Scanner */}
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
            
            {/* Action buttons */}
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
            
            {/* Scan Result */}
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
                    
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      {barcodeType && (
                        <div className="flex items-center">
                          <Info className="w-4 h-4 mr-1" />
                          <span>Type: {barcodeType}</span>
                        </div>
                      )}
                      
                      {countryInfo && (
                        <div className="flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          <span>Country: {countryInfo}</span>
                        </div>
                      )}
                      
                      {isValid !== null && (
                        <div className="flex items-center">
                          {isValid ? (
                            <>
                              <CheckCircleIcon className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
                              <span>Valid checksum</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-1 text-red-600 dark:text-red-400" />
                              <span>Invalid checksum</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Product info if available */}
                {productInfo && (
                  <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Product Information</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><span className="font-medium">Name:</span> {productInfo.name}</div>
                      <div><span className="font-medium">Price:</span> {productInfo.price}</div>
                      <div><span className="font-medium">Manufacturer:</span> {productInfo.manufacturer}</div>
                      <div><span className="font-medium">Category:</span> {productInfo.category}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 text-xs border-t border-green-200 dark:border-green-800 pt-2">
                  <button
                    onClick={() => copyToClipboard()}
                    className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
                  >
                    <Clipboard className="w-4 h-4" /> Copy
                  </button>
                  <button
                    onClick={() => downloadResult()}
                    className="flex items-center gap-1 hover:text-green-700 dark:hover:text-green-200 transition"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              </div>
            )}
            
            {/* Batch Results */}
            {batchMode && batchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center">
                  <Layers className="w-4 h-4 mr-1" /> Batch Results ({batchResults.length})
                </h3>
                <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {batchResults.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      <span className="text-sm truncate max-w-[80%]">{item}</span>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => copyToClipboard(item)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Clipboard className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Generator Type
              </label>
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
                  <option value="CODE128">Code 128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC-A</option>
                  <option value="CODE39">Code 39</option>
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
                onChange={(e) => setGeneratorText(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={`Enter text for ${generatorType === "barcode" ? "barcode" : "QR code"}`}
              />
            </div>
            
            {generatorText && (
              <div className="flex justify-center p-6 bg-white rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                {generatorType === "barcode" ? (
                  <Barcode 
                    value={generatorText} 
                    format={barcodeFormat}
                    width={1.5} 
                    height={50} 
                    fontSize={14}
                  />
                ) : (
                  <QRCode 
                    value={generatorText}
                    size={200}
                    level="H"
                    includeMargin={true}
                    renderAs="svg"
                  />
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
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="EAN-13">EAN-13</option>
                  <option value="QR Code">QR Code</option>
                  <option value="Code 128">Code 128</option>
                  <option value="URL">URLs</option>
                  <option value="valid">Valid Only</option>
                  <option value="invalid">Invalid Only</option>
                </select>
                
                <button
                  onClick={clearHistory}
                  className="p-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Clear History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No scan history found
              </div>
            ) : (
              <div className={`${viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"} max-h-96 overflow-y-auto pr-1`}>
                {filteredHistory.map((entry, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col"
                  >
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
                      
                      {entry.valid === true && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Valid
                        </span>
                      )}
                      
                      {entry.valid === false && (
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
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Valid Codes</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.validCount}</p>
              </div>
            </div>
            
            {/* By Type */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">By Type</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {Object.entries(stats.byType).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                        <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">{count}</span>
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
                {Object.entries(stats.byCountry).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byCountry).map(([country, count]) => (
                      <div key={country} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{country}</span>
                        <span className="text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-0.5 rounded">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* By Date */}
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white mb-2">Recent Activity</h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {Object.entries(stats.byDate).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byDate).slice(0, 5).map(([date, count]) => (
                      <div key={date} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{date}</span>
                        <span className="text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 px-2 py-0.5 rounded">{count} scans</span>
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

export default BarcodeScanner
