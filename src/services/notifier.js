/**
 * NOTIFIER MODULE - Sistema de notificações webhook
 *
 * Envia notificações sobre eventos de tarefas
 * para webhook configurado.
 */

const storage = require('./storage');

/**
 * Envia notificação para o webhook configurado
 *
 * @param {string} event - Tipo do evento (task:success ou task:failed)
 * @param {object} data - Dados do evento
 * @returns {Promise<boolean>} - true se enviou com sucesso
 */
async function notify(event, data) {
  const config = storage.getConfig();
  const notifConfig = config.notifications || {};

  console.log(`[Notifier][${new Date().toISOString()}] INFO: Verificando notificação`, {
    event,
    enabled: notifConfig.enabled,
    webhook: notifConfig.webhook ? 'configurado' : 'não configurado'
  });

  // Verificar se notificações estão habilitadas
  if (!notifConfig.enabled) {
    console.log(`[Notifier][${new Date().toISOString()}] INFO: Notificações desabilitadas`);
    return false;
  }

  // Verificar se webhook está configurado
  if (!notifConfig.webhook) {
    console.log(`[Notifier][${new Date().toISOString()}] WARN: Webhook não configurado`);
    return false;
  }

  // Verificar se deve notificar este tipo de evento
  const shouldNotify =
    (event === 'task:success' && notifConfig.onSuccess) ||
    (event === 'task:failed' && notifConfig.onFailure);

  if (!shouldNotify) {
    console.log(`[Notifier][${new Date().toISOString()}] INFO: Notificação desabilitada para evento ${event}`, {
      onSuccess: notifConfig.onSuccess,
      onFailure: notifConfig.onFailure
    });
    return false;
  }

  // Construir payload da notificação
  const payload = buildNotificationPayload(event, data);

  console.log(`[Notifier][${new Date().toISOString()}] INFO: Enviando notificação`, {
    event,
    webhook: notifConfig.webhook,
    taskName: payload.task.name
  });

  // Enviar notificação
  try {
    const response = await fetch(notifConfig.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Task-Scheduler/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Webhook retornou ${response.status}: ${responseText}`);
    }

    console.log(`[Notifier][${new Date().toISOString()}] INFO: Notificação enviada com sucesso`, {
      event,
      status: response.status,
      responseLength: responseText.length
    });

    return true;

  } catch (error) {
    console.error(`[Notifier][${new Date().toISOString()}] ERROR: Falha ao enviar notificação`, {
      event,
      webhook: notifConfig.webhook,
      error: error.message
    });
    return false;
  }
}

/**
 * Constrói o payload da notificação
 */
function buildNotificationPayload(event, data) {
  const { task, execution } = data;

  // Limitar output a 500 caracteres
  let output = execution.output || '';
  if (output.length > 500) {
    output = output.substring(0, 500) + '... (truncado)';
  }

  const payload = {
    event,
    task: {
      id: task.id,
      name: task.name,
      type: task.type
    },
    execution: {
      id: execution.id,
      status: execution.status,
      duration: execution.duration,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt
    },
    output,
    error: execution.error || null,
    timestamp: new Date().toISOString()
  };

  console.log(`[Notifier][${new Date().toISOString()}] DEBUG: Payload construído`, {
    event,
    taskId: payload.task.id,
    executionId: payload.execution.id,
    payloadSize: JSON.stringify(payload).length
  });

  return payload;
}

/**
 * Envia notificação de teste
 */
async function sendTestNotification(webhookUrl) {
  console.log(`[Notifier][${new Date().toISOString()}] INFO: Enviando notificação de teste`, {
    webhook: webhookUrl
  });

  const payload = {
    event: 'test',
    message: 'Esta é uma notificação de teste do Claude Task Scheduler',
    task: {
      id: 'test-task-id',
      name: 'Tarefa de Teste',
      type: 'command'
    },
    execution: {
      id: 'test-execution-id',
      status: 'success',
      duration: 1234,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    },
    output: 'Esta é uma saída de teste.\nTudo funcionando corretamente!',
    error: null,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Task-Scheduler/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    const responseText = await response.text();

    console.log(`[Notifier][${new Date().toISOString()}] INFO: Resposta do webhook de teste`, {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou ${response.status}: ${responseText}`);
    }

    return {
      success: true,
      status: response.status,
      response: responseText
    };

  } catch (error) {
    console.error(`[Notifier][${new Date().toISOString()}] ERROR: Falha no teste de notificação`, {
      webhook: webhookUrl,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  notify,
  sendTestNotification
};
