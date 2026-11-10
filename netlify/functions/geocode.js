const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const query = String(event.queryStringParameters?.q || '').trim();

  if (query.length < 3) {
    return json(400, {
      success: false,
      error: 'Digite pelo menos 3 caracteres para buscar um endereco'
    });
  }

  const localizedQuery = /juiz de fora|mg|minas gerais|brasil|brazil/i.test(query)
    ? query
    : `${query}, Juiz de Fora, MG, Brasil`;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', localizedQuery);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'br');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'meu-site-declividade/1.0 (Netlify Function)',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return json(response.status, {
        success: false,
        error: 'Erro ao buscar endereco',
        details: data
      });
    }

    const results = data.map((item) => ({
      name: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: item.type,
      importance: item.importance
    }));

    return json(200, { success: true, results });
  } catch (error) {
    return json(500, {
      success: false,
      error: 'Erro ao buscar endereco',
      details: error.message
    });
  }
};
