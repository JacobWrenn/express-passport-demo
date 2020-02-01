const express = require('express')
const app = express()
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne({
      email: username,
      password: password
    }, (err, user) => {
      if (err) return done(err)
      if (user) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Username or password was wrong.' });
      }
    })
  }
));

function loggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect('/login')
  }
}

var MongoDBStore = require('connect-mongodb-session')(session);

const mongoString = 'mongodb://localhost/nyg'

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
  secret: 'This is a secret',
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
    email: req.body.email,
    password: req.body.password
  })

  if (user) {
    res.redirect('/login');
  } else {
    new User({
      email: req.body.email,
      password: req.body.password
    }).save()
    res.redirect('/login');
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