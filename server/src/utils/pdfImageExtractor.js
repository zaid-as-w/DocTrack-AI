const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Extract the first embedded image from a scanned PDF.
 * Returns the file path of the extracted image, or null if no image found.
 */
function extractImageFromPdf(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return null;

  try {
    const scriptPath = path.join(__dirname, 'extract_pdf_image.py');
    const outImgPath = path.join(
      path.dirname(pdfPath),
      `${path.basename(pdfPath, path.extname(pdfPath))}_extracted.jpg`
    );

    const result = spawnSync('python', [scriptPath, pdfPath, outImgPath], {
      timeout: 10000,
      encoding: 'utf8'
    });

    if (result.status === 0 && fs.existsSync(outImgPath)) {
      return outImgPath;
    }
  } catch (err) {
    console.warn('[pdfImageExtractor Warning]', err.message);
  }

  return null;
}

module.exports = {
  extractImageFromPdf
};
