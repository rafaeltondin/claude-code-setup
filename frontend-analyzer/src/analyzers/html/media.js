/**
 * Analisador de Mídia (Imagens, Vídeos)
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeMedia(htmlFiles) {
  console.log(`[MediaAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    const images = parsed.elements.filter(el => el.tagName === 'img');
    let firstImageIndex = 0;

    images.forEach((img, index) => {
      const width = img.attrs.find(a => a.name === 'width');
      const height = img.attrs.find(a => a.name === 'height');
      const loading = img.attrs.find(a => a.name === 'loading');
      const srcset = img.attrs.find(a => a.name === 'srcset');
      const decoding = img.attrs.find(a => a.name === 'decoding');
      const src = img.attrs.find(a => a.name === 'src');
      const fetchpriority = img.attrs.find(a => a.name === 'fetchpriority');

      if (!width || !height) {
        issues.push(new Issue({
          severity: SEVERITY.CRITICAL, // CRÍTICO: CLS afeta Core Web Vitals diretamente
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Imagem sem dimensões (CLS)',
          description: 'Imagem sem atributos width/height causa CLS (Cumulative Layout Shift) CRÍTICO.',
          file: file.path,
          line: img.line,
          column: img.col,
          code: `<img src="${src?.value || '...'}" />`,
          evidence: 'Sem width/height - causa layout shift',
          suggestion: 'Adicione width="" e height="" (ou CSS aspect-ratio) para reservar espaço antes do carregamento. Use dimensões reais da imagem.',
          impact: '🔴 CRITICAL: CLS (Core Web Vital) ruim afeta SEO, UX e performance score do Google.',
          performanceImpact: 'CRITICAL',
          wcagViolation: 'Indiretamente afeta WCAG 2.1.1 (Keyboard): Layout shifts podem mover foco'
        }));
      }

      if (!loading) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Lazy loading não aplicado',
          description: 'Imagem sem loading="lazy".',
          file: file.path,
          line: img.line,
          column: img.col,
          code: '<img>',
          evidence: 'Sem loading="lazy"',
          suggestion: 'Adicione loading="lazy" em imagens abaixo da dobra.',
          impact: 'Todas as imagens carregam imediatamente, prejudicando performance inicial.',
          performanceImpact: 'MEDIUM'
        }));
      }

      // Srcset
      if (!srcset) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Imagem sem srcset',
          description: 'Imagem sem atributo srcset para responsividade.',
          file: file.path,
          line: img.line,
          column: img.col,
          code: `<img src="${src?.value || ''}">`,
          evidence: 'Sem srcset',
          suggestion: 'Adicione srcset="img-320w.jpg 320w, img-640w.jpg 640w, img-1024w.jpg 1024w" sizes="100vw".',
          impact: 'Mobile baixa imagens desktop-sized, desperdiçando largura de banda.',
          performanceImpact: 'MEDIUM'
        }));
      }

      // Decoding async
      if (!decoding) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Imagem sem decoding async',
          description: 'Imagem sem atributo decoding="async".',
          file: file.path,
          line: img.line,
          column: img.col,
          code: '<img>',
          evidence: 'Sem decoding="async"',
          suggestion: 'Adicione decoding="async" para não bloquear renderização.',
          impact: 'Decode da imagem pode bloquear thread principal.',
          performanceImpact: 'LOW'
        }));
      }

      // Formato antigo
      if (src) {
        const srcValue = src.value.toLowerCase();
        const oldFormats = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        const hasOldFormat = oldFormats.some(format => srcValue.endsWith(format));

        if (hasOldFormat && !srcset) {
          // Verificar se tem <picture> como pai
          let hasPictureParent = false;
          let current = img.parent;
          while (current) {
            if (current.tagName === 'picture') {
              hasPictureParent = true;
              break;
            }
            current = current.parent;
          }

          if (!hasPictureParent) {
            issues.push(new Issue({
              severity: SEVERITY.MEDIUM,
              category: CATEGORY.PERFORMANCE,
              subcategory: 'media',
              title: 'Formato de imagem antigo',
              description: `Imagem ${srcValue.match(/\.(jpg|jpeg|png|gif|bmp)$/i)?.[0]} sem fallback para WebP/AVIF.`,
              file: file.path,
              line: img.line,
              column: img.col,
              code: `<img src="${src.value}">`,
              evidence: 'Formato legado sem <picture> ou srcset com WebP',
              suggestion: 'Use <picture><source type="image/webp" srcset="img.webp"><img src="img.jpg"></picture>.',
              impact: 'Imagens legadas são 2-3x maiores que WebP/AVIF, aumentando tempo de carregamento.',
              performanceImpact: 'MEDIUM'
            }));
          }
        }
      }

      // Lazy loading em imagem above-the-fold
      if (index === 0 && loading?.value === 'lazy') {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Lazy loading em imagem LCP',
          description: 'Primeira imagem da página com loading="lazy".',
          file: file.path,
          line: img.line,
          column: img.col,
          code: '<img loading="lazy">',
          evidence: 'Primeira imagem lazy',
          suggestion: 'REMOVA loading="lazy" da primeira imagem (candidata a LCP). Use fetchpriority="high".',
          impact: 'ALTO: Lazy loading em LCP candidate atrasa carregamento crítico, prejudicando Core Web Vitals.',
          performanceImpact: 'HIGH'
        }));
      }

      // Fetchpriority high em imagem lazy
      if (loading?.value === 'lazy' && fetchpriority?.value === 'high') {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Lazy loading + fetchpriority high conflitante',
          description: 'Imagem com loading="lazy" E fetchpriority="high".',
          file: file.path,
          line: img.line,
          column: img.col,
          code: '<img loading="lazy" fetchpriority="high">',
          evidence: 'Conflito: lazy + high priority',
          suggestion: 'Remova loading="lazy" (para imagem prioritária) OU remova fetchpriority="high".',
          impact: 'Configuração conflitante: lazy adia carregamento, fetchpriority pede prioridade.',
          performanceImpact: 'HIGH'
        }));
      }

      // Primeira imagem sem fetchpriority high
      if (index === 0 && !fetchpriority) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'LCP candidate sem fetchpriority',
          description: 'Primeira imagem (provável LCP) sem fetchpriority="high".',
          file: file.path,
          line: img.line,
          column: img.col,
          code: '<img>',
          evidence: 'Primeira imagem sem fetchpriority',
          suggestion: 'Adicione fetchpriority="high" na primeira imagem (hero/LCP candidate).',
          impact: 'LCP candidate sem prioridade pode atrasar carregamento crítico.',
          performanceImpact: 'MEDIUM'
        }));
      }
    });

    // Vídeos
    console.log('[MediaAnalyzer] Verificando elementos <video>');
    const videos = parsed.elements.filter(el => el.tagName === 'video');
    videos.forEach(video => {
      const poster = video.attrs.find(a => a.name === 'poster');

      if (!poster) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'media',
          title: 'Vídeo sem poster',
          description: 'Elemento <video> sem atributo poster.',
          file: file.path,
          line: video.line,
          column: video.col,
          code: '<video>',
          evidence: 'Sem poster',
          suggestion: 'Adicione poster="thumbnail.jpg" para mostrar frame antes do play.',
          impact: 'Vídeo sem thumbnail pode exibir frame preto ou aleatório.'
        }));
      }
    });

    // Iframes
    console.log('[MediaAnalyzer] Verificando iframes sem dimensões');
    const iframes = parsed.elements.filter(el => el.tagName === 'iframe');
    iframes.forEach(iframe => {
      const width = iframe.attrs.find(a => a.name === 'width');
      const height = iframe.attrs.find(a => a.name === 'height');

      if (!width || !height) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'media',
          title: 'Iframe sem dimensões (CLS)',
          description: 'Iframe sem atributos width/height causa CLS.',
          file: file.path,
          line: iframe.line,
          column: iframe.col,
          code: '<iframe>',
          evidence: 'Sem width/height',
          suggestion: 'Adicione width="" e height="" no iframe para reservar espaço.',
          impact: 'Layout shift quando iframe carrega, prejudicando CLS (Core Web Vital).',
          performanceImpact: 'MEDIUM'
        }));
      }
    });
  });

  console.log(`[MediaAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
