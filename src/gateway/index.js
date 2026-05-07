const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/pokemon', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: (path, req) => '/pokemon' + path,
}));

app.use('/types', createProxyMiddleware({
  target: 'http://localhost:3002',
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

app.listen(3000, () => console.log('API Gateway running on port 3000'));
