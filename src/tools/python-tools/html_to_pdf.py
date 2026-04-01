# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright"]
# ///
"""HTML to PDF — Converte HTML (arquivo ou URL) para PDF via Playwright (headless Chromium)."""
import sys, json, asyncio
from pathlib import Path

async def convert(args):
    input_path = args.get('input', '')
    url = args.get('url', '')
    output_path = args.get('output', '')
    format_size = args.get('format', 'A4')
    landscape = args.get('landscape', False)
    margin = args.get('margin', '1cm')
    scale = args.get('scale', 1.0)
    print_bg = args.get('print_background', True)
    header = args.get('header', '')
    footer = args.get('footer', '')
    wait = args.get('wait', 2000)

    if not input_path and not url:
        return {"error": "Parâmetro 'input' (arquivo HTML) ou 'url' é obrigatório"}

    try:
        from playwright.async_api import async_playwright

        source_url = url
        if input_path:
            p = Path(input_path).expanduser().resolve()
            if not p.exists():
                return {"error": f"Arquivo não encontrado: {p}"}
            source_url = f'file:///{str(p).replace(chr(92), "/")}'

        if not output_path:
            if input_path:
                output_path = str(Path(input_path).expanduser().resolve().with_suffix('.pdf'))
            else:
                output_path = str(Path.cwd() / 'output.pdf')

        out = Path(output_path).expanduser().resolve()

        margins = {"top": margin, "right": margin, "bottom": margin, "left": margin}

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(source_url, wait_until='networkidle', timeout=30000)

            if wait > 0:
                await page.wait_for_timeout(wait)

            pdf_options = {
                "path": str(out),
                "format": format_size,
                "landscape": landscape,
                "margin": margins,
                "scale": scale,
                "print_background": print_bg,
            }

            if header:
                pdf_options["header_template"] = header
                pdf_options["display_header_footer"] = True
            if footer:
                pdf_options["footer_template"] = footer
                pdf_options["display_header_footer"] = True

            await page.pdf(**pdf_options)
            await browser.close()

        size = out.stat().st_size
        return {
            "success": True,
            "output": str(out),
            "size_kb": round(size / 1024, 1),
            "source": url or str(input_path),
            "format": format_size,
            "landscape": landscape
        }

    except Exception as e:
        error_msg = str(e)
        if 'playwright install' in error_msg.lower() or 'executable doesn' in error_msg.lower():
            return {"error": f"Playwright browsers não instalados. Execute: uv run playwright install chromium\n{error_msg}"}
        return {"error": error_msg}

def main():
    args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    result = asyncio.run(convert(args))
    print(json.dumps(result))

if __name__ == '__main__':
    main()
