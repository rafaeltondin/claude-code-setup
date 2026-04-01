# /// script
# requires-python = ">=3.10"
# dependencies = ["Pillow", "numpy"]
# ///
"""Color Palette — Extrai paleta de cores dominantes de imagens."""
import sys, json
from pathlib import Path

def rgb_to_hex(r, g, b):
    return f'#{r:02x}{g:02x}{b:02x}'

def rgb_to_hsl(r, g, b):
    r, g, b = r/255, g/255, b/255
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        h = s = 0
    else:
        d = mx - mn
        s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r: h = (g - b) / d + (6 if g < b else 0)
        elif mx == g: h = (b - r) / d + 2
        else: h = (r - g) / d + 4
        h /= 6
    return round(h * 360), round(s * 100), round(l * 100)

def get_luminance(r, g, b):
    """Luminância relativa (WCAG)."""
    def lin(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast_ratio(c1, c2):
    l1 = get_luminance(*c1)
    l2 = get_luminance(*c2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return round((lighter + 0.05) / (darker + 0.05), 2)

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    input_path = args.get('input', '')
    num_colors = args.get('colors', 6)
    output_path = args.get('output', '')

    if not input_path:
        print(json.dumps({"error": "Parâmetro 'input' é obrigatório"}))
        return

    p = Path(input_path).expanduser().resolve()
    if not p.exists():
        print(json.dumps({"error": f"Arquivo não encontrado: {p}"}))
        return

    try:
        from PIL import Image
        import numpy as np

        img = Image.open(str(p)).convert('RGB')
        # Redimensionar para acelerar processamento
        img.thumbnail((200, 200))
        pixels = np.array(img).reshape(-1, 3)

        # K-means simples para encontrar cores dominantes
        from collections import Counter

        # Quantizar cores (reduzir precisão para agrupar)
        quantized = (pixels // 16) * 16 + 8
        color_counts = Counter(map(tuple, quantized.tolist()))
        dominant = color_counts.most_common(num_colors * 3)

        # Agrupar cores muito parecidas
        final_colors = []
        for color, count in dominant:
            r, g, b = color
            too_close = False
            for existing in final_colors:
                er, eg, eb = existing['rgb']
                dist = ((r-er)**2 + (g-eg)**2 + (b-eb)**2) ** 0.5
                if dist < 50:
                    too_close = True
                    break
            if not too_close:
                h, s, l = rgb_to_hsl(r, g, b)
                final_colors.append({
                    "rgb": [int(r), int(g), int(b)],
                    "hex": rgb_to_hex(int(r), int(g), int(b)),
                    "hsl": f"hsl({h}, {s}%, {l}%)",
                    "luminance": round(get_luminance(r, g, b), 3),
                    "percentage": round(count / len(pixels) * 100, 1)
                })
            if len(final_colors) >= num_colors:
                break

        # Calcular contraste entre pares principais
        contrasts = []
        if len(final_colors) >= 2:
            for i in range(min(3, len(final_colors))):
                for j in range(i+1, min(4, len(final_colors))):
                    c1 = final_colors[i]
                    c2 = final_colors[j]
                    ratio = contrast_ratio(c1['rgb'], c2['rgb'])
                    contrasts.append({
                        "pair": f"{c1['hex']} vs {c2['hex']}",
                        "ratio": ratio,
                        "wcag_aa": ratio >= 4.5,
                        "wcag_aaa": ratio >= 7.0
                    })

        result = {
            "success": True,
            "file": str(p),
            "image_size": f"{img.size[0]}x{img.size[1]}",
            "colors": final_colors,
            "contrasts": contrasts,
            "css_variables": {f"--color-{i+1}": c['hex'] for i, c in enumerate(final_colors)}
        }

        # Gerar paleta visual HTML se output solicitado
        if output_path:
            out = Path(output_path).expanduser().resolve()
            html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Paleta - {p.name}</title>
<style>body{{font-family:Inter,sans-serif;background:#1a1a2e;color:#fff;padding:2rem}}
.palette{{display:flex;gap:8px;margin:1rem 0}}.swatch{{width:120px;height:120px;border-radius:12px;display:flex;align-items:end;padding:8px}}
.swatch span{{background:rgba(0,0,0,.6);padding:2px 6px;border-radius:4px;font-size:12px}}</style></head>
<body><h1>Paleta de Cores — {p.name}</h1><div class="palette">"""
            for c in final_colors:
                html += f'<div class="swatch" style="background:{c["hex"]}"><span>{c["hex"]}</span></div>'
            html += "</div></body></html>"
            out.write_text(html, encoding='utf-8')
            result["html_output"] = str(out)

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    main()
