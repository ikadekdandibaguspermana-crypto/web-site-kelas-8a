exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: 'Method tidak diizinkan.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'Request tidak valid.' }),
    };
  }

  const GURU_PASSWORD = process.env.GURU_PASSWORD;

  if (!GURU_PASSWORD) {

    return {
      statusCode: 500,
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
      body: JSON.stringify({ ok: false, error: 'Password guru salah.' }),
    };
  }

  const token = 'guru-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, token, role: 'guru', name: 'Guru' }),
  };
};