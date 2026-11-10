const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('chat function invoked');

  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: 'Metodo nao permitido' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return json(500, {
      success: false,
      error: 'Chave DEEPSEEK_API_KEY nao configurada'
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { success: false, error: 'JSON invalido' });
  }

  const { messages, context } = payload;
  if (!Array.isArray(messages)) {
    return json(400, {
      success: false,
      error: 'Formato invalido: envie um array em messages'
    });
  }

  const systemMessage = {
    role: 'system',
    content: `Você é um assistente especialista em geologia, prevenção de desastres naturais e análise de risco geológico/hidrológico.
Você tem acesso a dados de declividade e mapeamento de riscos.
Responda de forma técnica, porém acessível, ajudando na prevenção de deslizamentos, enchentes e outros desastres.
Quando o usuário perguntar sobre um local específico, use as informações de contexto fornecidas.
Contexto selecionado no mapa: ${context || 'nenhum contexto selecionado.'}`
  };

  try {
    console.log('calling DeepSeek chat endpoint');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek chat error', response.status, data);

      return json(response.status, {
        success: false,
        error: 'Erro ao consultar DeepSeek',
        details: data?.error?.message || data?.message || `HTTP ${response.status}`
      });
    }

    return json(200, {
      success: true,
      message: data.choices?.[0]?.message?.content || '',
      usage: data.usage
    });
  } catch (error) {
    console.error('chat function exception', error);

    return json(500, {
      success: false,
      error: 'Erro ao processar sua solicitacao',
      details: error.message
    });
  }
};
