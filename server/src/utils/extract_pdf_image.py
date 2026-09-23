import sys
import os

def extract_first_image(pdf_path, output_image_path):
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            if len(page.images) > 0:
                with open(output_image_path, "wb") as f:
                    f.write(page.images[0].data)
                return True
        return False
    except Exception as e:
        sys.stderr.write(f"PDF extraction error: {e}\n")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    pdf_in = sys.argv[1]
    img_out = sys.argv[2]
    if os.path.exists(pdf_in) and extract_first_image(pdf_in, img_out):
        print("SUCCESS")
        sys.exit(0)
    else:
        print("NO_IMAGE")
        sys.exit(2)
