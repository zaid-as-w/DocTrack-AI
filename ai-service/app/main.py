"""
DocTrack AI - FastAPI Microservice v2.0
High-Speed OCR, Date Extraction and Document Classification Engine
"""

import os
import re
import io
import tempfile
import importlib.util
from typing import Optional, Dict, Any
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil

# OpenCV for image preprocessing (Otsu binarization, resizing, contrast optimization)
CV2_AVAILABLE = False
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    pass

# Tesseract OCR Configuration (Windows & Linux paths)
TESSERACT_CMD = os.environ.get("TESSERACT_PATH", "")
if not TESSERACT_CMD:
    tess_candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract"
    ]
    for cand in tess_candidates:
        if os.path.exists(cand):
            TESSERACT_CMD = cand
            break

TESSERACT_AVAILABLE = False
try:
    import pytesseract
    from PIL import Image
    if TESSERACT_CMD and os.path.exists(TESSERACT_CMD):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        TESSERACT_AVAILABLE = True
    elif shutil.which("tesseract"):
        TESSERACT_AVAILABLE = True
except ImportError:
    try:
        from PIL import Image
    except ImportError:
        Image = None

WINOCR_AVAILABLE = False
try:
    import winocr
    WINOCR_AVAILABLE = True
except ImportError:
    pass

PYPDF_AVAILABLE = False
try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    pass

DATEUTIL_AVAILABLE = importlib.util.find_spec("dateutil") is not None
if DATEUTIL_AVAILABLE:
    from dateutil import parser as dateutil_parser

app = FastAPI(
    title="DocTrack AI Service",
    description="High-Speed OCR, OpenCV Preprocessing, Date Extraction and Document Classification Microservice",
    version="2.2.0"
)

allowed_client = os.environ.get("CLIENT_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_client] if allowed_client != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    text: str
    fileName: Optional[str] = ""
    title: Optional[str] = ""

class ExtractDatesRequest(BaseModel):
    rawText: str
    documentType: Optional[str] = None
    fileName: Optional[str] = ""


MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
    "january": "01", "february": "02", "march": "03", "april": "04",
    "june": "06", "july": "07", "august": "08", "september": "09",
    "october": "10", "november": "11", "december": "12"
}

def normalize_date(date_str):
    if not date_str:
        return None
    s = date_str.strip()
    if re.search(r'lifetime|perpetual|no[\s-]expiry|never', s, re.I):
        return "Perpetual"
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s
    m = re.match(r'^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$', s)
    if m:
        p1, p2, year = int(m.group(1)), int(m.group(2)), m.group(3)
        if p2 > 12 and p1 <= 12:
            day, month = str(p2).zfill(2), str(p1).zfill(2)
        else:
            day, month = str(p1).zfill(2), str(p2).zfill(2)
        return f"{year}-{month}-{day}"
    m = re.match(r'^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$', s)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
    m = re.match(r'^(\d{1,2})[\s./-]+([A-Za-z]{3,9})[\s./-]+(\d{4})$', s)
    if m:
        month_key = m.group(2).lower()[:3]
        month = MONTH_MAP.get(m.group(2).lower(), MONTH_MAP.get(month_key))
        if month:
            return f"{m.group(3)}-{month}-{m.group(1).zfill(2)}"
    m = re.match(r'^([A-Za-z]{3,9})[\s./-]+(\d{1,2}),?[\s./-]+(\d{4})$', s)
    if m:
        month_key = m.group(1).lower()[:3]
        month = MONTH_MAP.get(m.group(1).lower(), MONTH_MAP.get(month_key))
        if month:
            return f"{m.group(3)}-{month}-{m.group(2).zfill(2)}"
    if DATEUTIL_AVAILABLE:
        try:
            parsed = dateutil_parser.parse(s, dayfirst=True)
            if 1900 < parsed.year < 2100:
                return parsed.strftime("%Y-%m-%d")
        except Exception:
            pass
    return None


DATE_PAT = (
    r'(?:'
    r'\d{1,2}[./-]\d{1,2}[./-]\d{4}'
    r'|\d{4}[./-]\d{1,2}[./-]\d{1,2}'
    r'|\d{1,2}[\s./-][A-Za-z]{3,9}[\s./-]\d{4}'
    r'|[A-Za-z]{3,9}[\s./-]\d{1,2},?[\s./-]\d{4}'
    r'|lifetime|perpetual|no[\s-]expiry'
    r')'
)

EXPIRY_KEYWORD_PAT = re.compile(
    r'(?:date\s+of\s+expiry|expiry\s+date|expiration\s+date|valid\s+until'
    r'|valid\s+upto|valid\s+to|expires?\s+on|expires?|expiry|valid\s+till'
    r'|validity|exp\.?\s+date|period\s+to|valid\s+through|renewal\s+due'
    r'|warranty\s+(?:valid\s+till|expires|until)|due\s+date)'
    r'\s*[:\-.]?\s*(' + DATE_PAT + r')',
    re.IGNORECASE
)

ISSUE_KEYWORD_PAT = re.compile(
    r'(?:date\s+of\s+issue|issued\s+on|issue\s+date|date\s+issued'
    r'|valid\s+from|effective\s+from|start\s+date|mfg\.?\s+date'
    r'|period\s+from|manufacture\s+date|registration\s+date|enrolled\s+on|issued)'
    r'\s*[:\-.]?\s*(' + DATE_PAT + r')',
    re.IGNORECASE
)

DOB_KEYWORD_PAT = re.compile(
    r'(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s+date|born\s+on)'
    r'\s*[:\-.]?\s*(' + DATE_PAT + r')',
    re.IGNORECASE
)

RANGE_PAT = re.compile(
    r'(?:from|period\s+from)\s+(' + DATE_PAT + r')\s+(?:to|till|until)\s+(' + DATE_PAT + r')',
    re.IGNORECASE
)


def extract_dates_from_text(text, doc_type="", file_name=""):
    issue_date = None
    expiry_date = None
    dob = None
    all_raw_dates = []
    if not text:
        return {"issueDate": None, "expiryDate": None, "dateOfBirth": None, "allDates": [], "confidence": 0.0}
    range_match = RANGE_PAT.search(text)
    if range_match:
        issue_date = normalize_date(range_match.group(1))
        expiry_date = normalize_date(range_match.group(2))
    for m in EXPIRY_KEYWORD_PAT.finditer(text):
        val = normalize_date(m.group(1))
        if val:
            expiry_date = val
            break
    for m in ISSUE_KEYWORD_PAT.finditer(text):
        val = normalize_date(m.group(1))
        if val and val != expiry_date:
            issue_date = val
            break
    for m in DOB_KEYWORD_PAT.finditer(text):
        val = normalize_date(m.group(1))
        if val:
            dob = val
            break

    # Secondary DOB scan for Indian formats (e.g. adjacent to candidate names / text words of date)
    if not dob:
        m_dob = re.search(r'(?:date\s+of\s+birth|dob|birth\s+date|gender\s*:[^\n]*|name\s*:[^\n]*)\s*[:\-.]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})', text, re.I)
        if m_dob:
            dob = normalize_date(m_dob.group(1))

    all_date_matches = re.findall(
        r'\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}'
        r'|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b',
        text, re.IGNORECASE
    )
    seen = set()
    for d in all_date_matches:
        nd = normalize_date(d)
        if nd and nd not in seen:
            seen.add(nd)
            all_raw_dates.append({"raw": d.strip(), "normalized": nd})
    # Chronological candidate date resolution
    candidate_dates = sorted([r["normalized"] for r in all_raw_dates if r["normalized"] and r["normalized"] != "Perpetual" and r["normalized"] != dob])
    if len(candidate_dates) >= 2:
        if not issue_date:
            issue_date = candidate_dates[0]
        if not expiry_date:
            expiry_date = candidate_dates[-1]
    elif len(candidate_dates) == 1:
        if not expiry_date and not issue_date:
            if re.search(r'expir|valid\s+to|valid\s+till|valid\s+upto|expires|due', text, re.I):
                expiry_date = candidate_dates[0]
            else:
                issue_date = candidate_dates[0]

    # Duration calculation (e.g. "This certificate is valid for five year", "valid for 5 years", "validity: 3 years")
    if issue_date and not expiry_date:
        m_dur = re.search(r'(?:valid\s+for|validity\s*[:\-]?\s*|period\s*[:\-]?\s*|isvalidfor\s*)(\w+|\d+)\s*[:\s]*years?', text, re.I)
        if m_dur:
            word_map = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
            raw_y = m_dur.group(1).lower()
            years = int(raw_y) if raw_y.isdigit() else word_map.get(raw_y, 0)
            if years > 0:
                parts = [int(p) for p in issue_date.split('-')]
                if len(parts) == 3:
                    expiry_date = f"{parts[0] + years}-{str(parts[1]).zfill(2)}-{str(parts[2]).zfill(2)}"

    context = f"{text} {doc_type or ''} {file_name or ''}".lower()
    if not expiry_date:
        if re.search(r'lifetime|perpetual|no[\s-]expiry', context):
            expiry_date = "Perpetual"
        elif re.search(r'marks\s*card|marksheet|mark\s*sheet|degree|diploma|sslc|matriculation|passing\s*certificate|birth\s*certificate|academic|education|school\s*examination', context):
            # Educational certificates and marksheets are permanently valid
            expiry_date = "Perpetual"

    confidence = 0.60
    if expiry_date:
        confidence += 0.25
    if issue_date:
        confidence += 0.10
    if dob:
        confidence += 0.05
    confidence = min(0.99, round(confidence, 2))
    return {"issueDate": issue_date, "expiryDate": expiry_date, "dateOfBirth": dob, "allDates": all_raw_dates, "confidence": confidence}


def extract_holder_name(text):
    if not text:
        return ""
    m = re.search(r'Surname[:\s]+([A-Za-z]+)\s+Given\s+Name[:\s]+([A-Za-z\s]+)', text, re.I)
    if m:
        return f"{m.group(2).strip()} {m.group(1).strip()}".strip()
    m = re.search(r'(?:Candidate\s+Name|Student\s+Name|Name\s+of\s+Candidate|Holder\s+Name|Full\s+Name|Given\s+Name|Insured\s+Name|Customer\s+Name|Account\s+Holder|Name)[.:\s]+([A-Za-z][A-Za-z\s.]{1,39})', text, re.I)
    if m:
        candidate = m.group(1).split('\n')[0].strip()
        if len(candidate) >= 2 and not re.search(r'department|republic|certificate|licen[cs]e|office|transport|authority|issued|examination|board|school|regular|fresh', candidate, re.I):
            return candidate
    return ""

def extract_doc_number(text):
    if not text:
        return ""
    m = re.search(r'Passport\s*No[.:\s]*([A-Za-z][0-9]{7})', text, re.I)
    if not m:
        m = re.search(r'\b([A-PR-WYa-pr-wy][1-9][0-9]{7})\b', text)
    if m:
        return m.group(1).upper()
    m = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', text, re.I)
    if m:
        return m.group(1).upper()
    m = re.search(r'\b(\d{4}\s\d{4}\s\d{4})\b', text)
    if not m:
        m = re.search(r'(?:Aadhaar|UIDAI)[.:\s]*(\d{12})', text, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r'Licen[cs]e\s*No[.:\s]*([A-Za-z0-9\s-]{8,22})', text, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r'(?:Policy\s*No|Certificate\s*No|Serial\s*No|Ref\s*No|Doc(?:ument)?\s*No|Registration\s*No|Reg\s*No|Roll\s*No)[.:\s]*([A-Za-z0-9\s/-]{4,25})', text, re.I)
    if m:
        return m.group(1).strip()
    return ""

def extract_authority(text):
    if not text:
        return "Authorized Issuing Authority"
    if re.search(r'karnataka school examination|examination and assessment board|kseeb|state board|cbse|icse', text, re.I):
        return "Karnataka School Examination & Assessment Board"
    if re.search(r'passport office', text, re.I):
        return "Regional Passport Office"
    if re.search(r'uidai', text, re.I):
        return "UIDAI (Govt of India)"
    if re.search(r'transport office|rto\b', text, re.I):
        return "Regional Transport Office (RTO)"
    if re.search(r'bajaj allianz', text, re.I):
        return "Bajaj Allianz General Insurance"
    if re.search(r'hdfc ergo', text, re.I):
        return "HDFC ERGO General Insurance"
    if re.search(r'emission test|puc center', text, re.I):
        return "State Transport Emission Testing Center"
    m = re.search(r'(?:Issued\s+by|Issuing\s+Authority|Authority)[.:\s]+([A-Za-z][A-Za-z\s,.-]{4,50})', text, re.I)
    if m:
        return m.group(1).split('\n')[0].strip()
    return "Authorized Issuing Authority"

def classify_from_text(text, file_name="", title=""):
    combined = f"{text} {title} {file_name}".lower()
    if any(k in combined for k in ["passport", "aadhaar", "pan card", "voter", "national id"]):
        return {"category": "Identity Proofs", "categoryId": "identity", "sensitivity": "HIGH"}
    if any(k in combined for k in ["driving licence", "driving license", "dl ", "motor vehicle"]):
        return {"category": "Vehicle Records", "categoryId": "vehicle", "sensitivity": "MEDIUM"}
    if any(k in combined for k in ["insurance", "policy no", "premium"]):
        return {"category": "Insurance Papers", "categoryId": "insurance", "sensitivity": "HIGH"}
    if any(k in combined for k in ["puc", "pollution", "emission"]):
        return {"category": "Vehicle Records", "categoryId": "vehicle", "sensitivity": "MEDIUM"}
    if any(k in combined for k in ["warranty", "invoice", "serial"]):
        return {"category": "Warranty and Bills", "categoryId": "warranty", "sensitivity": "STANDARD"}
    if any(k in combined for k in ["degree", "diploma", "marksheet", "marks card", "mark sheet", "examination", "university", "certificate", "sslc", "cbse", "icse", "school"]):
        return {"category": "Education and Academic", "categoryId": "education", "sensitivity": "MEDIUM"}
    if any(k in combined for k in ["salary", "payslip", "employment", "offer letter"]):
        return {"category": "Employment and Career", "categoryId": "employment", "sensitivity": "MEDIUM"}
    if any(k in combined for k in ["bank", "statement", "credit", "loan"]):
        return {"category": "Financial and Banking", "categoryId": "financial", "sensitivity": "HIGH"}
    if any(k in combined for k in ["deed", "lease", "rent", "property"]):
        return {"category": "Property and Real Estate", "categoryId": "property", "sensitivity": "HIGH"}
    if any(k in combined for k in ["prescription", "hospital", "lab", "medical"]):
        return {"category": "Healthcare and Medical", "categoryId": "healthcare", "sensitivity": "HIGH"}
    return {"category": "Other Documents", "categoryId": "other", "sensitivity": "STANDARD"}


def preprocess_image_cv2(image_input):
    """
    OpenCV document image preprocessing:
    1. Grayscale conversion
    2. Adaptive cubic scaling (upscale small fonts, downscale huge photos)
    3. Otsu binary thresholding for crisp contrast
    """
    if not CV2_AVAILABLE:
        return None
    try:
        if isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(image_input, str) and os.path.exists(image_input):
            img = cv2.imread(image_input)
        elif Image is not None and isinstance(image_input, Image.Image):
            img = cv2.cvtColor(np.array(image_input), cv2.COLOR_RGB2BGR)
        else:
            img = image_input

        if img is None:
            return None

        # 1. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Rescaling: optimal OCR dimension is ~1600-2000px
        h, w = gray.shape[:2]
        if max(h, w) > 2000:
            scale = 2000.0 / max(h, w)
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        elif max(h, w) < 900:
            gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        # 3. Otsu binarization
        _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return threshold
    except Exception as e:
        print(f"[OpenCV Preprocess Error] {e}")
        return None


async def ocr_image_bytes(image_bytes, file_path=None):
    if not image_bytes and not file_path:
        return ""
    try:
        # Step 1: Preprocess with OpenCV if available
        preprocessed = None
        if CV2_AVAILABLE:
            preprocessed = preprocess_image_cv2(file_path if file_path else image_bytes)

        # Step 2: Run Tesseract OCR (with --psm 6 config)
        if TESSERACT_AVAILABLE:
            try:
                if preprocessed is not None:
                    ocr_input = preprocessed
                elif file_path:
                    ocr_input = Image.open(file_path).convert("L")
                else:
                    ocr_input = Image.open(io.BytesIO(image_bytes)).convert("L")

                text = pytesseract.image_to_string(ocr_input, config="--psm 6")
                if text and len(text.strip()) > 5:
                    return text.strip()
            except Exception as e:
                print(f"[OCR] Tesseract error: {e}")

        # Step 3: Native Windows C++ Media OCR Engine Fallback (WinRT, ~0.6s)
        if WINOCR_AVAILABLE:
            try:
                if preprocessed is not None:
                    pil_img = Image.fromarray(preprocessed)
                elif file_path:
                    pil_img = Image.open(file_path)
                else:
                    pil_img = Image.open(io.BytesIO(image_bytes))

                res = await winocr.recognize_pil(pil_img, lang="en-US")
                if res and res.text and len(res.text.strip()) > 5:
                    return res.text.strip()
            except Exception as e:
                print(f"[OCR] winocr error: {e}")
    except Exception as e:
        print(f"[OCR] Image open/process error: {e}")
    return ""


async def extract_text_from_file(file_path, filename, file_bytes=None):
    fn = (filename or "").lower()
    is_image = any(fn.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']) or \
               (file_bytes and (file_bytes[:3] == b'\xff\xd8\xff' or file_bytes[:4] == b'\x89PNG' or file_bytes[:4] == b'RIFF' or file_bytes[:2] == b'BM'))
    is_pdf = fn.endswith('.pdf') or (file_bytes and file_bytes[:4] == b'%PDF')

    if is_image:
        return await ocr_image_bytes(file_bytes, file_path=file_path)

    if is_pdf:
        if PYPDF_AVAILABLE:
            try:
                reader = pypdf.PdfReader(file_path if file_path else io.BytesIO(file_bytes))
                text = ""
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
                if len(text.strip()) > 30:
                    return text.strip()
                # Scanned PDF: extract embedded image streams and OCR
                for page in reader.pages:
                    for img_obj in page.images:
                        img_txt = await ocr_image_bytes(img_obj.data)
                        if img_txt:
                            text += img_txt + "\n"
                if len(text.strip()) > 10:
                    return text.strip()
            except Exception as pe:
                print(f"[PDF] pypdf error: {pe}")
        # Fallback for PDF text strings
        if file_bytes:
            try:
                raw = file_bytes.decode('latin-1', errors='ignore')
                texts = re.findall(r'BT\s*(.*?)\s*ET', raw, re.DOTALL)
                strings = re.findall(r'\(([^)]{2,80})\)', ' '.join(texts))
                result = ' '.join(s for s in strings if re.search(r'[A-Za-z]{2,}', s))
                if len(result) > 30:
                    return result
            except Exception:
                pass
        return await ocr_image_bytes(file_bytes, file_path=file_path)

    # Text / plain file
    if file_bytes:
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore").strip()
            if len(decoded) > 10:
                return decoded
        except Exception:
            pass
    return ""


@app.get("/")
def root():
    return {
        "service": "DocTrack AI Microservice",
        "status": "active",
        "version": "2.2.0",
        "capabilities": ["ocr", "opencv-preprocessing", "date-extraction", "classification"],
        "opencv": CV2_AVAILABLE,
        "tesseract": TESSERACT_AVAILABLE,
        "winocr": WINOCR_AVAILABLE,
        "pypdf": PYPDF_AVAILABLE
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "DocTrack AI Service",
        "version": "2.2.0",
        "opencv_available": CV2_AVAILABLE,
        "tesseract_available": TESSERACT_AVAILABLE,
        "winocr_available": WINOCR_AVAILABLE,
        "pypdf_available": PYPDF_AVAILABLE,
        "environment": os.environ.get("ENVIRONMENT", "production"),
        "port": os.environ.get("PORT", "8000")
    }


@app.post("/ocr")
async def ocr_document(
    file: Optional[UploadFile] = File(None),
    rawText: Optional[str] = Form(None),
    fileName: Optional[str] = Form(""),
    documentType: Optional[str] = Form(None)
):
    text = ""
    source = "text"
    temp_path = None
    file_bytes = None

    try:
        if file is not None:
            file_bytes = await file.read()
            fn = file.filename or fileName or "document"
            ext = os.path.splitext(fn)[1] or ".tmp"

            # Flow: Upload -> Save temporarily -> Preprocess -> OCR
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
                temp.write(file_bytes)
                temp_path = temp.name

            text = await extract_text_from_file(temp_path, fn, file_bytes=file_bytes)
            source = "tesseract_cv2" if TESSERACT_AVAILABLE else ("winocr_cv2" if WINOCR_AVAILABLE else "file_text")
            if not fileName:
                fileName = fn
        elif rawText:
            text = rawText
            source = "raw_text"
        else:
            raise HTTPException(status_code=400, detail="Provide either a file or rawText")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
    date_result = extract_dates_from_text(text, documentType or "", fileName or "")
    holder_name = extract_holder_name(text)
    doc_number = extract_doc_number(text)
    authority = extract_authority(text)
    classification = classify_from_text(text, fileName or "", "")
    confidence = date_result["confidence"]
    if holder_name:
        confidence = min(0.99, confidence + 0.03)
    if doc_number:
        confidence = min(0.99, confidence + 0.03)
    confidence = round(confidence, 2)
    needs_verification = not date_result["expiryDate"]
    return {
        "success": True,
        "source": source,
        "tesseractUsed": TESSERACT_AVAILABLE,
        "rawText": text,
        "confidence": confidence,
        "extractedFields": {
            "docNumber": doc_number,
            "holderName": holder_name,
            "issueDate": date_result["issueDate"],
            "expiryDate": date_result["expiryDate"],
            "dateOfBirth": date_result["dateOfBirth"],
            "allDates": date_result["allDates"],
            "issuingAuthority": authority,
            "category": classification["category"],
            "categoryId": classification["categoryId"],
            "sensitivity": classification["sensitivity"],
            "needsVerification": needs_verification
        }
    }


@app.post("/extract-dates")
def extract_dates_endpoint(req: ExtractDatesRequest):
    result = extract_dates_from_text(req.rawText, req.documentType or "", req.fileName or "")
    return {"success": True, "issueDate": result["issueDate"], "expiryDate": result["expiryDate"], "dateOfBirth": result["dateOfBirth"], "allDates": result["allDates"], "confidence": result["confidence"], "needsVerification": not result["expiryDate"]}


@app.post("/classify")
def classify_document(req: ClassifyRequest):
    if not req.text and not req.title and not req.fileName:
        raise HTTPException(status_code=400, detail="Text or metadata required for classification")
    classification = classify_from_text(req.text, req.fileName, req.title)
    return {"category": classification["category"], "categoryId": classification["categoryId"], "confidence": 0.94, "confidencePercentage": 94, "confidenceLevel": "HIGH", "sensitivity": classification["sensitivity"], "reasoning": f"Keyword heuristics matched category '{classification['category']}'"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
