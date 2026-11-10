const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async () => {
  console.log('chat-status function invoked');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return json(500, {
      success: false,
      server: true,
      configured: false,
      provider: false,
      message: 'Chave DEEPSEEK_API_KEY nao configurada'
    });
  }

  try {
    console.log('calling DeepSeek status probe');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Responda apenas OK.' }
        ],
        temperature: 0,
        max_tokens: 5,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek status error', response.status, data);

      return json(502, {
        success: false,
        server: true,
        configured: true,
        provider: false,
        message: 'Backend ativo, mas a API do chatbot nao respondeu corretamente',
        details: data?.error?.message || data?.message || `HTTP ${response.status}`
      });
    }

    return json(200, {
      success: true,
      server: true,
      configured: true,
      provider: true,
      model: data.model || 'deepseek-chat',
      message: 'API do chatbot operacional'
    });
  } catch (error) {
    console.error('chat-status function exception', error);

    return json(502, {
      success: false,
      server: true,
      configured: true,
      provider: false,
      message: 'Backend ativo, mas a API do chatbot nao respondeu corretamente',
      details: error.message
    });
  }
};
