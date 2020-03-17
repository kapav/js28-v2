import createError from 'http-errors';
import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
// Импортировать модуль mongoose
import mongoose from 'mongoose';

import indexRouter from './routes/index.mjs';
import usersRouter from './routes/users.mjs';
import catalogRouter from './routes/catalog.mjs' // Импорт маршрутов для сегмента «catalog» сайта
import compression from 'compression'
import helmet from 'helmet'

const __dirname = path.dirname(new URL(import.meta.url).pathname).slice(3);
const app = express();

// Задание подключения к базе данных по умолчанию
const devDbUrl = 'mongodb://localhost:27017/my_database'
const mongoDB = process.env.MONGODB_URI || devDbUrl;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
// Предоставление mongoos'у возможности использовать глобальную библиотеку промисов
mongoose.Promise = global.Promise;
// Получение подключения по умолчанию
const db = mongoose.connection;
// Привязывание подключения к событию ошибки, чтобы получать сообщения об ошибках подключения
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(helmet()) // Защита от известных уязвимостей.
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression()) // Сжатие всех маршрутов.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter) // Добавление маршрутов для сегмента «catalog» в цепочку промежуточного слоя

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404, 'Введённая страница не найдена или не существует'));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
