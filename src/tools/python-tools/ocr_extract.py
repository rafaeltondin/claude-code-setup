# /// script
# requires-python = ">=3.10"
# dependencies = ["pytesseract", "Pillow", "pdf2image"]
# ///
"""OCR Extract — Extrai texto de imagens e PDFs escaneados via Tesseract OCR."""
import sys, json, os
from pathlib import Path

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    input_path = args.get('input', '')
    lang = args.get('lang', 'por+eng')
    output = args.get('output', '')
    pages = args.get('pages', '')

    if not input_path:
        print(json.dumps({"error": "Parâmetro 'input' é obrigatório"}))
        return

    p = Path(input_path).expanduser().resolve()
    if not p.exists():
        print(json.dumps({"error": f"Arquivo não encontrado: {p}"}))
        return

    try:
        import pytesseract
        from PIL import Image

        # Tentar encontrar tesseract no Windows
        tesseract_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        ]
        for tp in tesseract_paths:
            if Path(tp).exists():
                pytesseract.pytesseract.tesseract_cmd = tp
                break

        ext = p.suffix.lower()
        texts = []

        if ext == '.pdf':
            try:
                from pdf2image import convert_from_path
                page_range = {}
                if pages:
                    parts = pages.split('-')
                    page_range['first_page'] = int(parts[0])
                    if len(parts) > 1:
                        page_range['last_page'] = int(parts[1])
                images = convert_from_path(str(p), dpi=300, **page_range)
                for i, img in enumerate(images):
                    text = pytesseract.image_to_string(img, lang=lang)
                    texts.append(f"--- Página {i+1} ---\n{text.strip()}")
            except Exception as e:
                print(json.dumps({"error": f"Erro ao processar PDF (precisa de poppler): {e}"}))
                return
        else:
            img = Image.open(str(p))
            text = pytesseract.image_to_string(img, lang=lang)
            texts.append(text.strip())

        result = '\n\n'.join(texts)

        if output:
            out_path = Path(output).expanduser().resolve()
            out_path.write_text(result, encoding='utf-8')
            print(json.dumps({"success": True, "output": str(out_path), "chars": len(result), "preview": result[:500]}))
        else:
            print(json.dumps({"success": True, "chars": len(result), "text": result[:8000]}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()
