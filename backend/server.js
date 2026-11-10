// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const deepseekHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production'
});

// Middlewares
app.use(cors()); // Permite requisições do seu frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Rota de saúde da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor DeepSeek funcionando!' });
});

app.get('/api/geocode', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (query.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Digite pelo menos 3 caracteres para buscar um endereco'
      });
    }

    const localizedQuery = /juiz de fora|mg|minas gerais|brasil|brazil/i.test(query)
      ? query
      : `${query}, Juiz de Fora, MG, Brasil`;

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: localizedQuery,
        format: 'jsonv2',
        addressdetails: 1,
        limit: 5,
        countrycodes: 'br'
      },
      headers: {
        'User-Agent': 'meu-site-declividade/1.0 (local development)',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 10000
    });

    const results = response.data.map((item) => ({
      name: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: item.type,
      importance: item.importance
    }));

    res.json({ success: true, results });
  } catch (error) {
    console.error('Erro na geocodificacao:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar endereco'
    });
  }
});

app.get('/api/chat/status', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({
      success: false,
      server: true,
      configured: false,
      provider: false,
      message: 'Chave DEEPSEEK_API_KEY nao configurada'
    });
  }

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Responda apenas OK.' }
        ],
        temperature: 0,
        max_tokens: 5,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        httpsAgent: deepseekHttpsAgent,
        timeout: 15000
      }
    );

    res.json({
      success: true,
      server: true,
      configured: true,
      provider: true,
      model: response.data.model || 'deepseek-chat',
      message: 'API do chatbot operacional'
    });
  } catch (error) {
    console.error('Erro no status da DeepSeek:', error.response?.data || error.message);
    res.status(502).json({
      success: false,
      server: true,
      configured: true,
      provider: false,
      message: 'Backend ativo, mas a API do chatbot nao respondeu corretamente'
    });
  }
});

// Rota para chat com DeepSeek
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Chave DEEPSEEK_API_KEY nao configurada'
      });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Formato invalido: envie um array em messages'
      });
    }

    // Preparar mensagens para a API DeepSeek
    const systemMessage = {
      role: "system",
      content: `Você é um assistente especialista em geologia, prevenção de desastres naturais e análise de risco geológico/hidrológico. 
      Você tem acesso a dados de declividade e mapeamento de riscos.
      Responda de forma técnica, porém acessível, ajudando na prevenção de deslizamentos, enchentes e outros desastres.
      Quando o usuário perguntar sobre um local específico, use as informações de contexto fornecidas.
      Contexto selecionado no mapa: ${context || 'nenhum contexto selecionado.'}`
    };

    const apiMessages = [systemMessage, ...messages];

    // Chamada à API DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat", // ou "deepseek-reasoner" para modo raciocínio
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        httpsAgent: deepseekHttpsAgent
      }
    );

    // Enviar resposta de volta ao frontend
    res.json({
      success: true,
      message: response.data.choices[0].message.content,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('Erro na API DeepSeek:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao processar sua solicitação',
      details: error.response?.data || error.message
    });
  }
});

// Rota para modo streaming (opcional, mais avançado)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages } = req.body;

    // Configurar headers para streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemMessage = {
      role: "system",
      content: "Você é um especialista em geologia e prevenção de desastres."
    };

    const apiMessages = [systemMessage, ...messages];

    // Chamada com streaming
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        httpsAgent: deepseekHttpsAgent,
        responseType: 'stream'
      }
    );

    // Pipe do stream da DeepSeek para o cliente
    response.data.pipe(res);

  } catch (error) {
    console.error('Erro no streaming:', error);
    res.write(`data: ${JSON.stringify({ error: 'Erro no streaming' })}\n\n`);
    res.end();
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor DeepSeek rodando em http://localhost:${PORT}`);
  console.log(`🌎 Site: http://localhost:${PORT}`);
  console.log(`📡 Endpoint de chat: http://localhost:${PORT}/api/chat`);
});
