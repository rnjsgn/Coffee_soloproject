var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./src/routes/index');
// var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'rnjsgn', // 비밀 키, 반드시 변경해야 합니다.
    resave: false,
    saveUninitialized: true
  }));

  app.use((req, res, next) => {
    // res.locals에 필요한 데이터를 설정합니다.
    res.locals.user_name = "";
    res.locals.user_tel = "";
    res.locals.is_admin = false; // 기본적으로는 관리자가 아닌 것으로 가정
  
    if (req.session.user) {
      res.locals.user_name = req.session.user.user_name;
      res.locals.user_tel = req.session.user.user_tel;
      res.locals.is_admin = req.session.is_admin || false; // 세션에 is_admin이 없으면 기본값은 false
    }
  
    next(); // 다음 미들웨어로 이동
});

app.use('/', indexRouter);
// app.use('/users', usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
