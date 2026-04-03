import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

/**
 * Analisa problemas de segurança em HTML
 * @param {Array} htmlFiles - Array de objetos HTML parseados
 * @returns {Array<Issue>} - Array de issues detectados
 */
export function analyzeSecurity(htmlFiles) {
    console.log('[SecurityAnalyzer] INÍCIO', {
        totalArquivos: htmlFiles.length,
        timestamp: new Date().toISOString()
    });

    const issues = [];

    // CDN domains para verificar integrity
    const cdnDomains = [
        'cdnjs.cloudflare.com',
        'cdn.jsdelivr.net',
        'unpkg.com',
        'cloudflare.com',
        'googleapis.com',
        'gstatic.com',
        'bootstrapcdn.com',
        'code.jquery.com'
    ];

    htmlFiles.forEach((file, fileIndex) => {
        console.log(`[SecurityAnalyzer] Processando arquivo ${fileIndex + 1}/${htmlFiles.length}`, {
            arquivo: file.path
        });

        if (!file.parsed || !file.parsed.elements) {
            console.log(`[SecurityAnalyzer] Arquivo sem elementos parseados`, { arquivo: file.path });
            return;
        }

        // REGRA 1: javascript-href
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando javascript: em href...`);

        const links = file.parsed.elements.filter(el => el.tagName === 'a');

        links.forEach(link => {
            const hrefAttr = link.attrs.find(attr => attr.name === 'href');

            if (hrefAttr && hrefAttr.value.trim().toLowerCase().startsWith('javascript:')) {
                console.log(`[SecurityAnalyzer] [${file.path}] javascript: href encontrado`, {
                    href: hrefAttr.value,
                    linha: link.line
                });

                issues.push(new Issue({
                    type: 'javascript-href',
                    severity: SEVERITY.CRITICAL,
                    category: CATEGORY.HTML,
                    subcategory: 'security',
                    message: `JavaScript protocol in href attribute`,
                    description: `<a href="javascript:..."> is a known XSS (Cross-Site Scripting) vector. Malicious code can be injected through this pattern, especially if the URL comes from user input or external data.`,
                    location: {
                        file: file.path,
                        line: link.line || 0,
                        column: link.col || 0
                    },
                    codeSnippet: `<a href="${hrefAttr.value.substring(0, 100)}${hrefAttr.value.length > 100 ? '...' : ''}">`,
                    suggestion: `Use proper event handlers instead. Replace with <a href="#" onclick="handler()"> or better yet, attach events via JavaScript addEventListener(). Never use javascript: in production.`
                }));
            }
        });

        // REGRA 2: inline-event-handlers-security
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando event handlers inline...`);

        file.parsed.elements.forEach(element => {
            element.attrs.forEach(attr => {
                if (attr.name.toLowerCase().startsWith('on')) {
                    console.log(`[SecurityAnalyzer] [${file.path}] Event handler inline`, {
                        elemento: element.tagName,
                        atributo: attr.name,
                        valor: attr.value,
                        linha: element.line
                    });

                    issues.push(new Issue({
                        type: 'inline-event-handlers-security',
                        severity: SEVERITY.HIGH,
                        category: CATEGORY.HTML,
                        subcategory: 'security',
                        message: `Inline event handler '${attr.name}' detected`,
                        description: `Inline event handlers (onclick, onload, onerror, etc.) are incompatible with Content Security Policy (CSP). CSP is a critical security feature that prevents XSS attacks. Using inline handlers forces you to use 'unsafe-inline' in CSP, which defeats its purpose.`,
                        location: {
                            file: file.path,
                            line: element.line || 0,
                            column: element.col || 0
                        },
                        codeSnippet: `<${element.tagName} ${attr.name}="${attr.value.substring(0, 80)}${attr.value.length > 80 ? '...' : ''}">`,
                        suggestion: `Move event handlers to external JavaScript files using addEventListener(). Example:\n// HTML: <button id="myBtn">\n// JS: document.getElementById('myBtn').addEventListener('click', handler);`
                    }));
                }
            });
        });

        // REGRA 3 e 4: iframe security
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando iframes...`);

        const iframes = file.parsed.elements.filter(el => el.tagName === 'iframe');

        iframes.forEach(iframe => {
            const sandboxAttr = iframe.attrs.find(attr => attr.name === 'sandbox');
            const referrerpolicyAttr = iframe.attrs.find(attr => attr.name === 'referrerpolicy');

            // REGRA 3: iframe-no-sandbox
            if (!sandboxAttr) {
                console.log(`[SecurityAnalyzer] [${file.path}] iframe sem sandbox`, {
                    linha: iframe.line
                });

                issues.push(new Issue({
                    type: 'iframe-no-sandbox',
                    severity: SEVERITY.HIGH,
                    category: CATEGORY.HTML,
                    subcategory: 'security',
                    message: `<iframe> without sandbox attribute`,
                    description: `iframes without the 'sandbox' attribute can execute arbitrary JavaScript, access cookies, and perform malicious actions. This is especially dangerous when loading third-party content.`,
                    location: {
                        file: file.path,
                        line: iframe.line || 0,
                        column: iframe.col || 0
                    },
                    codeSnippet: `<iframe src="..."> <!-- Missing sandbox -->`,
                    suggestion: `Add sandbox attribute: <iframe sandbox="allow-scripts allow-same-origin" src="...">. Only enable the permissions you need. Start with empty sandbox and add permissions as needed.`
                }));
            }

            // REGRA 4: iframe-no-referrerpolicy
            if (!referrerpolicyAttr) {
                console.log(`[SecurityAnalyzer] [${file.path}] iframe sem referrerpolicy`, {
                    linha: iframe.line
                });

                issues.push(new Issue({
                    type: 'iframe-no-referrerpolicy',
                    severity: SEVERITY.MEDIUM,
                    category: CATEGORY.HTML,
                    subcategory: 'security',
                    message: `<iframe> without referrerpolicy attribute`,
                    description: `iframes without 'referrerpolicy' leak referrer data to the embedded page. The third-party site can see where your users came from and which page embeds the iframe.`,
                    location: {
                        file: file.path,
                        line: iframe.line || 0,
                        column: iframe.col || 0
                    },
                    codeSnippet: `<iframe src="..."> <!-- Missing referrerpolicy -->`,
                    suggestion: `Add referrerpolicy: <iframe referrerpolicy="no-referrer" src="..."> or use 'strict-origin-when-cross-origin' for balanced privacy.`
                }));
            }
        });

        // REGRA 5: target-blank-no-noopener
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando target="_blank" sem noopener...`);

        links.forEach(link => {
            const targetAttr = link.attrs.find(attr => attr.name === 'target');
            const relAttr = link.attrs.find(attr => attr.name === 'rel');

            if (targetAttr && targetAttr.value === '_blank') {
                const relValue = relAttr ? relAttr.value.toLowerCase() : '';

                if (!relValue.includes('noopener') && !relValue.includes('noreferrer')) {
                    console.log(`[SecurityAnalyzer] [${file.path}] target="_blank" sem noopener`, {
                        href: link.attrs.find(a => a.name === 'href')?.value || '',
                        linha: link.line
                    });

                    issues.push(new Issue({
                        type: 'target-blank-no-noopener',
                        severity: SEVERITY.MEDIUM,
                        category: CATEGORY.HTML,
                        subcategory: 'security',
                        message: `<a target="_blank"> without rel="noopener"`,
                        description: `Links with target="_blank" without rel="noopener" or rel="noreferrer" create a security vulnerability. The opened page gains access to window.opener and can redirect your page via window.opener.location. This is called "reverse tabnabbing".`,
                        location: {
                            file: file.path,
                            line: link.line || 0,
                            column: link.col || 0
                        },
                        codeSnippet: `<a target="_blank" href="..."> <!-- Missing rel="noopener" -->`,
                        suggestion: `Add rel="noopener noreferrer": <a target="_blank" rel="noopener noreferrer" href="...">. Modern browsers add noopener automatically, but explicit is better.`
                    }));
                }
            }
        });

        // REGRA 6: form-action-http
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando forms com action HTTP...`);

        const forms = file.parsed.elements.filter(el => el.tagName === 'form');

        forms.forEach(form => {
            const actionAttr = form.attrs.find(attr => attr.name === 'action');

            if (actionAttr && actionAttr.value.trim().toLowerCase().startsWith('http://')) {
                console.log(`[SecurityAnalyzer] [${file.path}] form com action HTTP`, {
                    action: actionAttr.value,
                    linha: form.line
                });

                issues.push(new Issue({
                    type: 'form-action-http',
                    severity: SEVERITY.HIGH,
                    category: CATEGORY.HTML,
                    subcategory: 'security',
                    message: `<form> submitting to HTTP (insecure)`,
                    description: `Form action points to http:// (not https://). User data will be sent without encryption, visible to anyone intercepting the traffic (man-in-the-middle attacks). This is especially critical for login forms, payment forms, or any sensitive data.`,
                    location: {
                        file: file.path,
                        line: form.line || 0,
                        column: form.col || 0
                    },
                    codeSnippet: `<form action="${actionAttr.value}">`,
                    suggestion: `Change to HTTPS: <form action="${actionAttr.value.replace('http://', 'https://')}">. All form submissions should use encrypted connections.`
                }));
            }
        });

        // REGRA 7: mixed-content-links
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando mixed content...`);

        const elementsWithSrc = file.parsed.elements.filter(el =>
            ['link', 'script', 'img', 'iframe', 'video', 'audio', 'source'].includes(el.tagName)
        );

        elementsWithSrc.forEach(element => {
            const srcAttr = element.attrs.find(attr => attr.name === 'src' || attr.name === 'href');

            if (srcAttr) {
                const srcValue = srcAttr.value.trim().toLowerCase();

                // Verificar se é http:// (não https, não localhost, não relativo)
                if (srcValue.startsWith('http://') && !srcValue.includes('localhost') && !srcValue.includes('127.0.0.1')) {
                    console.log(`[SecurityAnalyzer] [${file.path}] Mixed content detectado`, {
                        elemento: element.tagName,
                        src: srcAttr.value,
                        linha: element.line
                    });

                    issues.push(new Issue({
                        type: 'mixed-content-links',
                        severity: SEVERITY.HIGH,
                        category: CATEGORY.HTML,
                        subcategory: 'security',
                        message: `Mixed content: <${element.tagName}> loading from HTTP`,
                        description: `Loading resources from http:// on an https:// page creates "mixed content". Modern browsers block active mixed content (scripts, stylesheets) entirely, and warn about passive mixed content (images). This breaks functionality and displays security warnings.`,
                        location: {
                            file: file.path,
                            line: element.line || 0,
                            column: element.col || 0
                        },
                        codeSnippet: `<${element.tagName} ${srcAttr.name}="${srcAttr.value}">`,
                        suggestion: `Change to HTTPS: ${srcAttr.value.replace('http://', 'https://')} or use protocol-relative URLs: ${srcAttr.value.replace('http://', '//')}`
                    }));
                }
            }
        });

        // REGRA 8: script-no-integrity
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando scripts CDN sem integrity...`);

        const externalScripts = file.parsed.elements.filter(el => {
            if (el.tagName !== 'script') return false;

            const srcAttr = el.attrs.find(attr => attr.name === 'src');
            if (!srcAttr) return false;

            // Verificar se é CDN
            return cdnDomains.some(domain => srcAttr.value.includes(domain));
        });

        externalScripts.forEach(script => {
            const integrityAttr = script.attrs.find(attr => attr.name === 'integrity');
            const srcAttr = script.attrs.find(attr => attr.name === 'src');

            if (!integrityAttr) {
                console.log(`[SecurityAnalyzer] [${file.path}] Script CDN sem integrity`, {
                    src: srcAttr.value,
                    linha: script.line
                });

                issues.push(new Issue({
                    type: 'script-no-integrity',
                    severity: SEVERITY.HIGH,
                    category: CATEGORY.HTML,
                    subcategory: 'security',
                    message: `External <script> from CDN without integrity attribute`,
                    description: `Loading scripts from CDNs without Subresource Integrity (SRI) is a supply chain attack vector. If the CDN is compromised or the file is modified, malicious code could be injected into your site. The integrity attribute ensures the file hasn't been tampered with.`,
                    location: {
                        file: file.path,
                        line: script.line || 0,
                        column: script.col || 0
                    },
                    codeSnippet: `<script src="${srcAttr.value}"></script> <!-- Missing integrity -->`,
                    suggestion: `Add integrity and crossorigin attributes. Generate SRI hash at https://srihash.org/:\n<script src="${srcAttr.value}"\n        integrity="sha384-..."\n        crossorigin="anonymous"></script>`
                }));
            }
        });

        // REGRA 9: base-tag-detected
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando tag <base>...`);

        const baseTags = file.parsed.elements.filter(el => el.tagName === 'base');

        baseTags.forEach(base => {
            const hrefAttr = base.attrs.find(attr => attr.name === 'href');

            console.log(`[SecurityAnalyzer] [${file.path}] <base> tag encontrada`, {
                href: hrefAttr?.value || '',
                linha: base.line
            });

            issues.push(new Issue({
                type: 'base-tag-detected',
                severity: SEVERITY.MEDIUM,
                category: CATEGORY.HTML,
                subcategory: 'security',
                message: `<base> tag detected`,
                description: `The <base> tag changes the base URL for all relative URLs on the page. This can be exploited for phishing attacks or to hijack resource loading. If an attacker can inject a <base> tag (via XSS), they can redirect all your relative links to malicious sites.`,
                location: {
                    file: file.path,
                    line: base.line || 0,
                    column: base.col || 0
                },
                codeSnippet: `<base href="${hrefAttr?.value || ''}">`,
                suggestion: `Avoid <base> tag unless absolutely necessary. Use absolute URLs or server-side URL generation instead. If you must use it, ensure it can't be overridden by user input.`
            }));
        });

        // REGRA 10: meta-refresh-redirect
        console.log(`[SecurityAnalyzer] [${file.path}] Verificando meta refresh redirects...`);

        const metaTags = file.parsed.elements.filter(el => el.tagName === 'meta');

        metaTags.forEach(meta => {
            const httpEquivAttr = meta.attrs.find(attr => attr.name === 'http-equiv');
            const contentAttr = meta.attrs.find(attr => attr.name === 'content');

            if (httpEquivAttr && httpEquivAttr.value.toLowerCase() === 'refresh') {
                if (contentAttr && contentAttr.value.includes('url=')) {
                    console.log(`[SecurityAnalyzer] [${file.path}] Meta refresh redirect`, {
                        content: contentAttr.value,
                        linha: meta.line
                    });

                    issues.push(new Issue({
                        type: 'meta-refresh-redirect',
                        severity: SEVERITY.MEDIUM,
                        category: CATEGORY.HTML,
                        subcategory: 'security',
                        message: `<meta http-equiv="refresh"> redirect detected`,
                        description: `Meta refresh redirects can be used for phishing attacks. Users don't see the URL changing in the address bar until after the redirect, making it easy to trick them into visiting malicious sites. Search engines also penalize sites using meta refresh.`,
                        location: {
                            file: file.path,
                            line: meta.line || 0,
                            column: meta.col || 0
                        },
                        codeSnippet: `<meta http-equiv="refresh" content="${contentAttr.value}">`,
                        suggestion: `Use server-side redirects (HTTP 301/302) or JavaScript window.location instead. Server-side redirects are more secure and SEO-friendly.`
                    }));
                }
            }
        });
    });

    console.log('[SecurityAnalyzer] FIM', {
        totalIssues: issues.length,
        timestamp: new Date().toISOString()
    });

    return issues;
}
