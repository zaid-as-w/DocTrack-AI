"""
DocTrack AI - FastAPI Microservice v2.0
High-Speed OCR, Date Extraction and Document Classification Engine
"""

import os
import re
import io
import importlib.util
from typing import Optional, Dict, Any
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil

TESSERACT_AVAILABLE = False
try:
    import pytesseract
    from PIL import Image
    if shutil.which("tesseract"):
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
    description="High-Speed OCR, Date Extraction and Document Classification Microservice",
    version="2.1.0"
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
    if not expiry_date and all_raw_dates:
        future_dates = [
            r["normalized"] for r in all_raw_dates
            if r["normalized"] and r["normalized"] != "Perpetual"
            and r["normalized"] > datetime.now().strftime("%Y-%m-%d")
        ]
        if future_dates:
            expiry_date = max(future_dates)
        elif not issue_date and all_raw_dates:
            sorted_dates = sorted(
                [r["normalized"] for r in all_raw_dates if r["normalized"] and r["normalized"] != "Perpetual"]
            )
            if len(sorted_dates) >= 2:
                issue_date = sorted_dates[0]
                expiry_date = sorted_dates[-1]
            elif sorted_dates:
                # If only one date and it was DOB, don't double count as issue date
                if not dob:
                    issue_date = sorted_dates[0]

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


async def ocr_image_bytes(image_bytes):
    if Image is None or not image_bytes:
        return ""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Optimize size: max dimension 1600px for lightning-fast OCR
        max_dim = 1600
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # 1. Native Windows C++ OCR Engine (~0.6s, high accuracy)
        if WINOCR_AVAILABLE:
            try:
                res = await winocr.recognize_pil(img, lang="en-US")
                if res and res.text and len(res.text.strip()) > 5:
                    return res.text.strip()
            except Exception as e:
                print(f"[OCR] winocr error: {e}")

        # 2. Tesseract OCR Engine (fallback)
        if TESSERACT_AVAILABLE:
            try:
                gray = img.convert("L")
                txt = pytesseract.image_to_string(gray, config='--psm 6 --oem 3')
                if txt and len(txt.strip()) > 5:
                    return txt.strip()
            except Exception as e:
                print(f"[OCR] Tesseract error: {e}")
    except Exception as e:
        print(f"[OCR] Image open error: {e}")
    return ""


async def extract_text_from_file_bytes(file_bytes, filename):
    if not file_bytes:
        return ""
    fn = (filename or "").lower()
    is_image = any(fn.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']) or \
               file_bytes[:3] == b'\xff\xd8\xff' or file_bytes[:4] == b'\x89PNG' or \
               file_bytes[:4] == b'RIFF' or file_bytes[:2] == b'BM'
    is_pdf = fn.endswith('.pdf') or file_bytes[:4] == b'%PDF'

    if is_image:
        return await ocr_image_bytes(file_bytes)

    if is_pdf:
        if PYPDF_AVAILABLE:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
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
        try:
            raw = file_bytes.decode('latin-1', errors='ignore')
            texts = re.findall(r'BT\s*(.*?)\s*ET', raw, re.DOTALL)
            strings = re.findall(r'\(([^)]{2,80})\)', ' '.join(texts))
            result = ' '.join(s for s in strings if re.search(r'[A-Za-z]{2,}', s))
            if len(result) > 30:
                return result
        except Exception:
            pass
        return await ocr_image_bytes(file_bytes)

    # Text / plain file
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
        "version": "2.1.0",
        "capabilities": ["ocr", "date-extraction", "classification"],
        "winocr": WINOCR_AVAILABLE,
        "pypdf": PYPDF_AVAILABLE,
        "tesseract": TESSERACT_AVAILABLE
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "DocTrack AI Service",
        "version": "2.1.0",
        "winocr_available": WINOCR_AVAILABLE,
        "pypdf_available": PYPDF_AVAILABLE,
        "tesseract_available": TESSERACT_AVAILABLE,
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
    if file is not None:
        file_bytes = await file.read()
        fn = file.filename or fileName or "document"
        text = await extract_text_from_file_bytes(file_bytes, fn)
        source = "winocr" if WINOCR_AVAILABLE else ("tesseract" if TESSERACT_AVAILABLE else "file_text")
        if not fileName:
            fileName = fn
    elif rawText:
        text = rawText
        source = "raw_text"
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or rawText")
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
