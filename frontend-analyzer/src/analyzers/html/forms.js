/**
 * Analisador de Formulários HTML
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeForms(htmlFiles) {
  console.log(`[FormsAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    const forms = parsed.elements.filter(el => el.tagName === 'form');
    forms.forEach(form => {
      const action = form.attrs.find(a => a.name === 'action');
      const method = form.attrs.find(a => a.name === 'method');

      if (!action) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'forms',
          title: 'Form sem action',
          description: 'Formulário sem atributo action.',
          file: file.path,
          line: form.line,
          column: form.col,
          code: '<form>',
          evidence: 'Sem action',
          suggestion: 'Adicione action="/url" ou use JavaScript para submit.',
          impact: 'Formulário pode não funcionar corretamente.'
        }));
      }

      if (!method) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'forms',
          title: 'Form sem method',
          description: 'Formulário sem atributo method (padrão GET).',
          file: file.path,
          line: form.line,
          column: form.col,
          code: '<form>',
          evidence: 'Sem method',
          suggestion: 'Adicione method="POST" ou method="GET" explicitamente.',
          impact: 'Dados podem ser enviados via GET expondo informações na URL.'
        }));
      }
    });

    // Inputs sem name
    console.log('[FormsAnalyzer] Verificando inputs sem name');
    const inputs = parsed.elements.filter(el => el.tagName === 'input');
    inputs.forEach(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      const nameAttr = input.attrs.find(a => a.name === 'name');
      const type = typeAttr?.value || 'text';

      // Exceções: submit e button não precisam de name
      if (['submit', 'button'].includes(type)) return;

      if (!nameAttr) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.HTML,
          subcategory: 'forms',
          title: 'Input sem name',
          description: `<input type="${type}"> sem atributo name.`,
          file: file.path,
          line: input.line,
          column: input.col,
          code: `<input type="${type}">`,
          evidence: 'Sem name',
          suggestion: 'Adicione name="campo" para o valor ser enviado no submit.',
          impact: 'Valor do input NÃO será enviado no submit do formulário.'
        }));
      }
    });

    // Inputs sem type
    console.log('[FormsAnalyzer] Verificando inputs sem type');
    inputs.forEach(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      if (!typeAttr) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'forms',
          title: 'Input sem type',
          description: 'Input sem atributo type (padrão: text).',
          file: file.path,
          line: input.line,
          column: input.col,
          code: '<input>',
          evidence: 'Sem type',
          suggestion: 'Adicione type="text", type="email", type="password", etc. explicitamente.',
          impact: 'Tipo text padrão pode não oferecer validação adequada (email, tel, etc).'
        }));
      }
    });

    // Form sem submit button
    console.log('[FormsAnalyzer] Verificando forms sem submit');
    const submitButtons = parsed.elements.filter(el =>
      (el.tagName === 'button' && el.attrs.some(a => a.name === 'type' && a.value === 'submit')) ||
      (el.tagName === 'input' && el.attrs.some(a => a.name === 'type' && a.value === 'submit'))
    );

    if (forms.length > 0 && submitButtons.length === 0) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'forms',
        title: 'Form sem botão submit',
        description: 'Formulário sem <button type="submit"> ou <input type="submit">.',
        file: file.path,
        line: forms[0].line,
        column: forms[0].col,
        code: '<form>',
        evidence: 'Sem submit button',
        suggestion: 'Adicione <button type="submit">Enviar</button> ou use JavaScript para submit.',
        impact: 'Usuários podem não saber como enviar o formulário.'
      }));
    }

    // Password sem autocomplete
    console.log('[FormsAnalyzer] Verificando inputs password sem autocomplete');
    inputs.forEach(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      const autocompleteAttr = input.attrs.find(a => a.name === 'autocomplete');

      if (typeAttr?.value === 'password' && !autocompleteAttr) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'forms',
          title: 'Password sem autocomplete',
          description: 'Input type="password" sem atributo autocomplete.',
          file: file.path,
          line: input.line,
          column: input.col,
          code: '<input type="password">',
          evidence: 'Sem autocomplete',
          suggestion: 'Adicione autocomplete="current-password" (login) ou autocomplete="new-password" (cadastro).',
          impact: 'Gerenciadores de senha podem não funcionar adequadamente.'
        }));
      }
    });

    // Placeholder como label
    console.log('[FormsAnalyzer] Verificando placeholder sem label');
    inputs.forEach(input => {
      const placeholderAttr = input.attrs.find(a => a.name === 'placeholder');
      const ariaLabel = input.attrs.find(a => a.name === 'aria-label');
      const idAttr = input.attrs.find(a => a.name === 'id');

      if (placeholderAttr) {
        // Verificar se tem label associado
        const hasLabel = idAttr && parsed.elements.some(el =>
          el.tagName === 'label' && el.attrs.some(a => a.name === 'for' && a.value === idAttr.value)
        );

        if (!hasLabel && !ariaLabel) {
          issues.push(new Issue({
            severity: SEVERITY.HIGH,
            category: CATEGORY.ACCESSIBILITY,
            subcategory: 'forms',
            title: 'Placeholder usado como label',
            description: `Input com placeholder="${placeholderAttr.value}" mas sem <label> ou aria-label.`,
            file: file.path,
            line: input.line,
            column: input.col,
            code: `<input placeholder="${placeholderAttr.value}">`,
            evidence: 'Placeholder sem label',
            suggestion: 'Adicione <label> associado. Placeholder desaparece ao focar e não é acessível.',
            impact: 'CRÍTICO para acessibilidade: placeholder NÃO substitui label. Desaparece ao focar.',
            wcagLevel: 'A',
            wcagViolation: '3.3.2 Labels or Instructions'
          }));
        }
      }
    });

    // Fieldset para radio/checkbox groups
    console.log('[FormsAnalyzer] Verificando fieldset em radio/checkbox groups');
    const radioInputs = inputs.filter(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      return typeAttr?.value === 'radio';
    });

    const fieldsets = parsed.elements.filter(el => el.tagName === 'fieldset');

    if (radioInputs.length > 0 && fieldsets.length === 0) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'forms',
        title: 'Radio buttons sem fieldset',
        description: 'Inputs type="radio" encontrados, mas nenhum <fieldset> na página.',
        file: file.path,
        line: radioInputs[0].line,
        column: radioInputs[0].col,
        code: '<input type="radio">',
        evidence: 'Radios sem fieldset',
        suggestion: 'Agrupe radios relacionados em <fieldset><legend>Grupo</legend>...</fieldset>.',
        impact: 'Leitores de tela não conseguem agrupar opções relacionadas.'
      }));
    }

    // Select sem opção padrão informativa
    console.log('[FormsAnalyzer] Verificando <select> elements');
    const selects = parsed.elements.filter(el => el.tagName === 'select');
    selects.forEach(select => {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.HTML,
        subcategory: 'forms',
        title: 'Select detectado',
        description: 'Elemento <select> detectado. Primeira opção será selecionada por padrão.',
        file: file.path,
        line: select.line,
        column: select.col,
        code: '<select>',
        evidence: 'Select presente',
        suggestion: 'Adicione primeira opção descritiva: <option value="">Selecione...</option>.',
        impact: 'INFO: Primeira opção é selecionada automaticamente se não houver value="".'
      }));
    });

    // Hidden inputs sensíveis
    console.log('[FormsAnalyzer] Verificando hidden inputs sensíveis');
    inputs.forEach(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      const nameAttr = input.attrs.find(a => a.name === 'name');

      if (typeAttr?.value === 'hidden' && nameAttr) {
        const name = nameAttr.value.toLowerCase();
        const sensitiveKeywords = ['password', 'secret', 'token', 'key', 'api'];

        if (sensitiveKeywords.some(keyword => name.includes(keyword))) {
          issues.push(new Issue({
            severity: SEVERITY.HIGH,
            category: CATEGORY.SECURITY,
            subcategory: 'forms',
            title: 'Dados sensíveis em hidden input',
            description: `<input type="hidden" name="${nameAttr.value}"> contém palavra sensível.`,
            file: file.path,
            line: input.line,
            column: input.col,
            code: `<input type="hidden" name="${nameAttr.value}">`,
            evidence: `Nome "${nameAttr.value}" indica dado sensível`,
            suggestion: 'NUNCA armazene senhas, tokens ou secrets em HTML. Use sessões server-side.',
            impact: 'ALTO RISCO DE SEGURANÇA: Dados sensíveis expostos no HTML são visíveis no código fonte.'
          }));
        }
      }
    });
  });

  console.log(`[FormsAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
