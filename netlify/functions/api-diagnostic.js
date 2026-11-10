const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async () => {
  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY);

  if (!hasKey) {
    return json(200, {
      success: false,
      functions: true,
      deepseekKeyConfigured: false,
      deepseekReachable: false,
      message: 'Netlify Function publicada, mas DEEPSEEK_API_KEY nao esta configurada no Netlify.'
    });
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
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

    return json(200, {
      success: response.ok,
      functions: true,
      deepseekKeyConfigured: true,
      deepseekReachable: response.ok,
      status: response.status,
      model: data.model || null,
      message: response.ok
        ? 'Netlify Function e DeepSeek funcionando.'
        : 'Netlify Function publicada, mas DeepSeek retornou erro.',
      details: response.ok ? undefined : (data?.error?.message || data?.message || `HTTP ${response.status}`)
    });
  } catch (error) {
    return json(200, {
      success: false,
      functions: true,
      deepseekKeyConfigured: true,
      deepseekReachable: false,
      message: 'Netlify Function publicada, mas houve falha de rede ao chamar DeepSeek.',
      details: error.message
    });
  }
};
