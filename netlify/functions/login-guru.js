const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Method tidak diizinkan.',
      }),
    };
  }

  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Request tidak valid.',
      }),
    };
  }

  const GURU_PASSWORD = process.env.GURU_PASSWORD;

  if (!GURU_PASSWORD) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'GURU_PASSWORD belum diatur di Environment Variables Netlify.',
      }),
    };
  }

  const password = String(body.password || '');

  if (!password || password !== GURU_PASSWORD) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Password guru salah.',
      }),
    };
  }

  const token =
    'guru-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2, 10);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: true,
      token,
      role: 'guru',
      name: 'Guru',
    }),
  };
};