const express = require('express')
const app = express()
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const bcrypt = require('bcrypt')

LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne({
      email: username
    }, (err, user) => {
      if (err) return done(err)
      if (!user) return done(null, false, { message: 'User not found!' });
      bcrypt.compare(password, user.password, function(err, res) {
        if (err) return done(err)
        if (res) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password!' });
        }
      })
    })
  }
));

function loggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    req.flash('error', 'You needed to be logged in to visit that page!');
    res.redirect('/login')
  }
}

var MongoDBStore = require('connect-mongodb-session')(session);

const mongoString = 'mongodb://localhost/express-passport-demo'

var store = new MongoDBStore({
  uri: mongoString,
  collection: 'mySessions'
});

/* ************ */
app.use(express.static(__dirname + '/public'));
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: 'This is a secret - Make sure to change!',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const mongoose = require('mongoose');
mongoose.connect(mongoString, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: String,
  password: String
});

const User = mongoose.model('users', userSchema);

app.post('/register', async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email
  })

  if (user) {
    req.flash('error', 'Sorry, that name is taken. Maybe you need to <a href="/login">login</a>?');
    res.redirect('/register');
  } else if (req.body.email == "" || req.body.password == "") {
    req.flash('error', 'Please fill out all the fields.');
    res.redirect('/register');
  } else {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) return next(err);
      bcrypt.hash(req.body.password, salt, function (err, hash) {
        if (err) return next(err);
        new User({
          email: req.body.email,
          password: hash
        }).save()
        req.flash('info', 'Account made, please log in...');
        res.redirect('/login');
      });
    });
  }
});

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }))

app.get('/', loggedIn, (req, res) => {
  res.render('index.ejs', { email: req.user.email })
})

app.get('/login', (req, res) => {
  res.render('login.ejs')
})

app.get('/register', (req, res) => {
  res.render('register.ejs')
})

app.get('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

app.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0');