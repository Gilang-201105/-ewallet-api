const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
