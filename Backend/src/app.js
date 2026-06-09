const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const noteRoutes = require('./routes/noteRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { sendSuccess } = require('./utils/response');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  return sendSuccess(res, 'API is running');
});

app.get('/health', (req, res) => {
  return sendSuccess(res, 'Server is healthy');
});

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notes', noteRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
