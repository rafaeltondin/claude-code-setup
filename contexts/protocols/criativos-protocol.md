# Protocolo de Criativos (Estáticos, Motion, Vídeo)

## Neuromarketing
Consultar KB ANTES: `search_kb query="NEUROMARKETING gatilhos mentais Meta Ads"`
Aplicar: hook <3s, framing de perda, prova social, storytelling, cores quentes no CTA, autenticidade.
Checklist completo: `NEUROMARKETING-GATILHOS-MENTAIS-META-ADS-GUIA.md`

## Análise de Pixels — Posicionamento de Texto sobre Imagem de Produto

**OBRIGATÓRIO** quando criativo usa foto do produto como background (100% do card):

1. **Rodar análise Python** para safe zones: `python analyze_images.py`
   - Script ref: `~/.claude/temp/fiber-carousels/analyze_images.py`
   - Gera: placement_data.json + debug images + card images (1080x1080)

2. **Técnicas combinadas** (pesos: variância 1.0, entropia 1.5, edges 2.0):
   - Background por cor (amostra cantos, tolerância 35, erode 30×30)
   - Variância local (scipy uniform_filter, window=50)
   - Entropia (scikit-image entropy, disk_radius=15)
   - Bordas (OpenCV Canny 50/150 + dilate 15×15)
   - Deps: `pip install opencv-contrib-python scikit-image scipy numpy Pillow`

3. **Usar placement_data.json** para posicionar texto:
   - score >= 0.8 → seguro para headline + body
   - score < 0.8 → apenas headline curto ou dividir top/bottom
   - SEMPRE `max-height + overflow:hidden` como safety net

4. **Fontes mínimas** para cards 1080×1080 (Meta Ads):
   | Elemento | Tamanho |
   |----------|---------|
   | Headline hook | 64–70px bold 800 |
   | Headline text-top | 56–60px bold 800 |
   | Body text | 26–28px regular 400 |
   | Tag/label | 20–22px bold 700, spacing 3.5px |
   | CTA button | 24px, padding 20px 64px |
   | Preço | 52px bold 800 |

5. **Gradiente overlay** sobre fotos claras:
   - Topo: `linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 32%, transparent 52%)`
   - Rodapé: inverter direção
   - `text-shadow: 0 3px 12px rgba(0,0,0,0.7)` em todos os textos

6. **Puppeteer**: base64 data URI (NUNCA file:///), `domcontentloaded` (NUNCA networkidle0), fontes do sistema (NUNCA Google Fonts externo)

## Motion Video

**Prioridade: motion-gen → capture-final.js → API remota**

1. **motion-gen (RECOMENDADO):** `node ~/.claude/tools/motion-gen/motion-gen.js <html> --quality turbo --output <mp4>`
2. **capture-final.js (recaptura):** `node capture-final.js <html> --output <mp4>`
3. **API remota:** `https://motion.rafaeltondin.com.br/api/generate-inline`

**CRÍTICO:**
- APAGAR MP3s antigos se motion-config tem textos diferentes: `rm [pasta]/n*.mp3`
- Após gerar, COPIAR T constants reais do output para o fallback hardcoded no HTML
- HTML DEVE ter `autoFit()` dentro do load event (após fontes)
- NUNCA usar camera-rig/wrapper que transforma o stage

KB: `CRIATIVOS-MOTION-ADS-TOOLKIT-GUIA.md`
Templates: `motion-template-riwerlabs-m3.html` | `motion-template-betpredict-v2.html`

## Topaz Video AI (Upscale)

`topaz_enhance input="video.mp4" model=ahq-12 width=W height=H`
- OBRIGATÓRIO: `video_tools action=info` para resolução original ANTES
- SEMPRE passar width/height mantendo aspect ratio:
  9:16→2160x3840 | 16:9→3840x2160 | 1:1→2160x2160
- NUNCA confiar nos defaults (forçam 3840x2160)
- Flask falhou → `cd D:/TOPAZ/modern_topaz && python app.py &`
