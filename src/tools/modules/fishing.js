/**
 * Tools: FISHING — fishing_conditions
 * Consulta condicoes de pesca em Garopaba/SC via APIs gratuitas.
 */
const { execSync } = require('child_process');
const path = require('path');

const definitions = [
  {
    type: 'function',
    function: {
      name: 'fishing_conditions',
      description: `Consulta condicoes de pesca em Garopaba/SC em tempo real.
Retorna: temperatura, vento, ondas, pressao, qualidade da pesca (0-100), dicas.
APIs: Open-Meteo Weather + Marine (gratuitas, sem key).
Pode enviar o relatorio no Telegram com send_telegram=true.
Formato JSON com --json ou texto legivel por padrao.`,
      parameters: {
        type: 'object',
        properties: {
          send_telegram: {
            type: 'boolean',
            description: 'Enviar relatorio no Telegram. Padrao: false',
          },
          format: {
            type: 'string',
            enum: ['text', 'json'],
            description: 'Formato da saida. Padrao: text',
          },
        },
        required: [],
      },
    },
  },
];

const handlers = {
  async fishing_conditions(args) {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'fishing.py');
    const flags = [];

    if (args.send_telegram) flags.push('--telegram');
    if (args.format === 'json') flags.push('--json');

    try {
      const cmd = `python -X utf8 "${scriptPath}" ${flags.join(' ')}`;
      const output = execSync(cmd, {
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      if (args.format === 'json') {
        try {
          return JSON.parse(output.trim());
        } catch {
          return { raw: output.trim() };
        }
      }

      return output.trim();
    } catch (err) {
      return { error: `Erro ao executar script de pesca: ${err.message}` };
    }
  },
};

module.exports = { definitions, handlers };
