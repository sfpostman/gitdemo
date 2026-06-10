const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = parseInt(process.env.PORT || '3000', 10);
const POKEMON_SERVICE_URL = process.env.POKEMON_SERVICE_URL || 'http://localhost:3001';
const TYPES_SERVICE_URL = process.env.TYPES_SERVICE_URL || 'http://localhost:3002';

const app = express();

app.use('/pokemon', createProxyMiddleware({
  target: POKEMON_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => '/pokemon' + path,
}));

app.use('/types', createProxyMiddleware({
  target: TYPES_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => '/types' + path,
}));

app.get('/', (req, res) => {
  res.json({
    name: 'Pokemon API Gateway',
    version: '1.0.0',
    routes: {
      'GET    /pokemon': 'List all Pokemon (supports ?limit=&offset=)',
      'GET    /pokemon/:id': 'Get Pokemon by Pokedex number',
      'POST   /pokemon': 'Create a new Pokemon',
      'PATCH  /pokemon/:id': 'Update a Pokemon',
      'DELETE /pokemon/:id': 'Delete a Pokemon',
      'GET    /types': 'List all types',
      'GET    /types/:type/pokemon': 'Get Pokemon by type (supports ?limit=&offset=)',
    },
  });
});

app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
