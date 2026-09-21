/**
 * FastApiOCRService - Bridge between Node.js and FastAPI ai-service
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const FASTAPI_TIMEOUT_MS = 5000;

async function callFastApiOCR(filePath, rawText, fileName, documentType) {
  return new Promise(function(resolve, reject) {
    const form = new FormData();
    if (filePath && fs.existsSync(filePath)) {
      form.append("file", fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: "application/octet-stream"
      });
      form.append("fileName", path.basename(filePath));
    } else if (rawText) {
      form.append("rawText", rawText);
    } else {
      return reject(new Error("No file or rawText provided"));
    }
    if (fileName) form.append("fileName", fileName);
    if (documentType) form.append("documentType", documentType);
    const urlObj = new URL(AI_SERVICE_URL + "/ocr");
    const isHttps = urlObj.protocol === "https:";
    const transport = isHttps ? https : http;
    const port = urlObj.port || (isHttps ? 443 : 80);
    const options = {
      hostname: urlObj.hostname,
      port: port,
      path: urlObj.pathname,
      method: "POST",
      headers: form.getHeaders(),
      timeout: FASTAPI_TIMEOUT_MS
    };
    const req = transport.request(options, function(res) {
      let data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error("FastAPI returned " + res.statusCode + ": " + data));
          }
        } catch (e) {
          reject(new Error("FastAPI JSON parse error: " + e.message));
        }
      });
    });
    req.on("timeout", function() {
      req.destroy(new Error("FastAPI /ocr timed out after " + FASTAPI_TIMEOUT_MS + "ms"));
    });
    req.on("error", function(err) { reject(err); });
    form.pipe(req);
  });
}

async function callFastApiExtractDates(rawText, documentType) {
  return new Promise(function(resolve, reject) {
    const body = JSON.stringify({ rawText: rawText, documentType: documentType || null });
    const urlObj = new URL(AI_SERVICE_URL + "/extract-dates");
    const isHttps = urlObj.protocol === "https:";
    const transport = isHttps ? https : http;
    const port = urlObj.port || (isHttps ? 443 : 80);
    const options = {
      hostname: urlObj.hostname,
      port: port,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: FASTAPI_TIMEOUT_MS
    };
    const req = transport.request(options, function(res) {
      let data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error("FastAPI /extract-dates returned " + res.statusCode));
          }
        } catch (e) {
          reject(new Error("FastAPI /extract-dates JSON parse error: " + e.message));
        }
      });
    });
    req.on("timeout", function() {
      req.destroy(new Error("FastAPI /extract-dates timed out after " + FASTAPI_TIMEOUT_MS + "ms"));
    });
    req.on("error", function(err) { reject(err); });
    req.write(body);
    req.end();
  });
}

let _fastApiAvailable = null;
let _fastApiLastCheck = 0;
const FASTAPI_CACHE_TTL = 30000;

async function isFastApiAvailable() {
  const now = Date.now();
  if (_fastApiAvailable !== null && now - _fastApiLastCheck < FASTAPI_CACHE_TTL) return _fastApiAvailable;
  return new Promise(function(resolve) {
    const urlObj = new URL(AI_SERVICE_URL + "/health");
    const isHttps = urlObj.protocol === "https:";
    const transport = isHttps ? https : http;
    const port = urlObj.port || (isHttps ? 443 : 80);
    const req = transport.request({
      hostname: urlObj.hostname,
      port: port,
      path: urlObj.pathname,
      method: "GET",
      timeout: 2000
    }, function(res) {
      _fastApiAvailable = res.statusCode === 200;
      _fastApiLastCheck = Date.now();
      resolve(_fastApiAvailable);
    });
    req.on("timeout", function() {
      req.destroy();
      _fastApiAvailable = false;
      _fastApiLastCheck = Date.now();
      resolve(false);
    });
    req.on("error", function() {
      _fastApiAvailable = false;
      _fastApiLastCheck = Date.now();
      resolve(false);
    });
    req.end();
  });
}

module.exports = {
  callFastApiOCR: callFastApiOCR,
  callFastApiExtractDates: callFastApiExtractDates,
  isFastApiAvailable: isFastApiAvailable,
  AI_SERVICE_URL: AI_SERVICE_URL
};
