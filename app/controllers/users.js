/* eslint-disable func-names, prefer-arrow-callback, no-underscore-dangle */
/* eslint-disable no-var, vars-on-top, max-len */
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  User = mongoose.model('User');
var avatars = require('./avatars').all();

/**
 * Auth callback
 */
exports.authCallback = function (req, res, next) {
  res.redirect('/chooseavatars');
};

/**
 * Show login form
 */
exports.signin = function (req, res) {
  if (!req.user) {
    res.redirect('/#!/signin?error=invalid');
  } else {
    res.redirect('/#!/app');
  }
};

exports.playGame = function (req, res) {
  if (!req.user) {
    res.redirect('/#!/signin?error=invalid');
  } else {
    res.redirect('/#!/play-with');
  }
};
/**
 * Show sign up form
 */
exports.signup = function (req, res) {
  if (!req.user) {
    res.redirect('/#!/signup');
  } else {
    res.redirect('/#!/app');
  }
};

/**
 * Logout
 */
exports.signout = function (req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * Session
 */
exports.session = function (req, res) {
  const gameId = req.body.game;
  if (gameId) {
    res.redirect(`/#!/app?game=${gameId}`);
  } else {
    res.redirect('/#!/play-with');
  }
};

/**
 * Check avatar - Confirm if the user who logged in via passport
 * already has an avatar. If they don't have one, redirect them
 * to our Choose an Avatar page.
 */
exports.checkAvatar = function (req, res) {
  if (req.user && req.user._id) {
    User.findOne({
      _id: req.user._id
    })
      .exec(function (err, user) {
        if (user.avatar !== undefined) {
          res.redirect('/#!/');
        } else {
          res.redirect('/#!/choose-avatar');
        }
      });
  } else {
    // If user doesn't even exist, redirect to '/'
    res.redirect('/');
  }
};

/**
 * Create user
 */
exports.create = function (req, res) {
  if (req.body.name && req.body.password && req.body.email) {
    User.findOne({
      email: req.body.email
    }).exec(function (err, existingUser) {
      if (!existingUser) {
        var user = new User(req.body);
        // Switch the user's avatar index to an actual avatar url
        user.avatar = avatars[user.avatar];
        user.provider = 'local';
        user.save(function (err) {
          if (err) {
            return res.render('/#!/signup?error=unknown', {
              errors: err.errors,
              user: user
            });
          }
          req.logIn(user, function (err) {
            const gameId = req.body.game;
            if (err) return next(err);
            if (gameId) return res.redirect(`/#!/app?game=${gameId}`);
            return res.redirect('/#!/gametour');
          });
        });
      } else {
        return res.redirect('/#!/signup?error=existinguser');
      }
    });
  } else {
    return res.redirect('/#!/signup?error=incomplete');
  }
};

/**
 * Assign avatar to user
 */
exports.avatars = function (req, res) {
  // Update the current user's profile to include the avatar choice they've made
  if (req.user && req.user._id && req.body.avatar !== undefined &&
    /\d/.test(req.body.avatar) && avatars[req.body.avatar]) {
    User.findOne({
      _id: req.user._id
    })
      .exec(function (err, user) {
        user.avatar = avatars[req.body.avatar];
        user.save();
      });
  }
  return res.redirect('/#!/app');
};

exports.addDonation = function (req, res) {
  if (req.body && req.user && req.user._id) {
    // Verify that the object contains crowdrise data
    if (req.body.amount && req.body.crowdrise_donation_id && req.body.donor_name) {
      User.findOne({
        _id: req.user._id
      })
        .exec(function (err, user) {
          // Confirm that this object hasn't already been entered
          const duplicate = user.donations.some(donation => donation.crowdrise_donation_id === req.body.crowdrise_donation_id);
          if (!duplicate) {
            user.donations.push(req.body);
            user.premium = 1;
            user.save();
          }
        });
    }
  }
  res.send();
};

/**
 *  Show profile
 */
exports.show = function (req, res) {
  var user = req.profile;

  res.render('users/show', {
    title: user.name,
    user: user
  });
};

/**
 * Send User
 */
exports.me = function (req, res) {
  res.jsonp(req.user || null);
};

/**
 * Find user by id
 */
exports.user = function (req, res, next, id) {
  User
    .findOne({
      _id: id
    })
    .exec(function (err, user) {
      if (err) return next(err);
      if (!user) return next(new Error('Failed to load User ' + id));
      req.profile = user;
      next();
    });
};

/**
 * Authenticate the user
 */
exports.authenticate = function (req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/#!/signin?error=invalid');
    return;
  }
  next();
};
