/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* global User */
/* global PointsOfCanvas  */

const Meals = require('../lib/Meals.js');
const canvasWidth = 1000;
const canvasHeight = 800;

var users = [];
var meals = [];
var userIndex;
var tempScore = 0;
var reset = 1;

module.exports = {
  register(req, res) {
    const userData = req.param('userData');
    var user = {
      id : 0,
      x: 50,
      y:50,
      score: 20,
    };

    var meal = {
      x : 0,
      y: 0,
    };

    var i;
    if (!users) {
      id = 0;
    } else id = users[users.length-1].id + 1;
    user.id = id;
    req.session.userId = id;
    res.cookie('userId', id)
    res.json(user);
  },

  login (req, res) {
    User.find({
      nickname: req.param('nickname'),
      password: req.param('password'),
    })
    .then((result) => {
      if (result && result.length) {
        req.session.userId = result[0].id;
        res.cookie('userId', result[0].id);
        result[0].score = 20;

        var user = {
          x : result[0].x,
          y : result[0].y,
          score : result[0].score,
          radius : 20,
        }

        users.push(result[0]);
        sails.sockets.blast('new_user', { user });
        return res.json({
          status: 'ok',
          userName: result[0].nickname,
        })
      }

      return res.json({
        status: 'error',
      });

    })
  },

  /*get data from one user*/
  ws(req, res) {
    if (req.param("occupation") == "loading") {
      this.wsLoadingInitialDots();
    } else {

      const userId = req.cookies.userId;
      const x = req.param('x');
      const y = req.param('y');

      var occupation = req.param('occupation');
      var self = this;
      users.forEach(function(user, i) {
        if (user.id == userId) {
          userIndex = i;
          user.x = x;
          user.y = y;

          self.wsblast(req, res);
        }

      })

    }
  },

  /*send data */
  wsblast(req, res) {
    const countOfUsers = 1;
    const x = req.param('x');
    const y = req.param('y');
    var score = users[userIndex].score;
    var radius = req.param('radius');

    var i = 0;
    var j = 0;
    var removingPoints = [];
    var newPoints = [];

    while (i < meals.length) {

      if (Math.pow((x - meals[i].x), 2) + Math.pow((y - meals[i].y), 2) <= Math.pow(radius, 2)) {
        removingPoints.push(meals[i]);
        meals.splice(i, 1);
        score++;
        tempScore++;
        users[userIndex].score = score;
        if (reset <= tempScore) {
          reset += reset % 2;
          radius++;
          tempScore = 0;
        }
        //radius = 20 + Math.round(score / 10);
        return sails.sockets.blast('move_of_user', {newPoints, removingPoints, score, radius});

      } else {
        i++;
      }
    }

    var newPoints = [];
    i = 0;
    if (!removingPoints.length) {
      //generate new points if this is necessary
      while (countOfUsers * 35 > meals.length) {
        var point = Meals.generateMeal(canvasWidth, canvasHeight);
        newPoints[i] = point;
        meals[i + meals.length] = point;
        i++;
        return sails.sockets.blast('move_of_user', {newPoints: newPoints, removingPoints: removingPoints, score, radius});
      }
    }

  },

  wsLoadingInitialDots(req, res) {
    const countOfUsers = 1;
    var i = 0;
    var msg = "";
    var newPoints = [];
    console.log('meals.length' + meals.length);

    console.log('users.length' + users.length);
    while (countOfUsers * 100 > meals.length) {
      msg = "create new points";
      var point = Meals.generateMeal(canvasWidth, canvasHeight);
      meals[i] = point;
      newPoints.push(point);
      i++;
    }

    sails.sockets.blast('load', { msg, points: meals});
    sails.sockets.blast('points_for_new_user', { msg, newPoints: newPoints});
  },
  exit(req, res) {
    userId = req.cookies.userId;
    var iToDelete;
    users.forEach(function(user, i) {
      if (user.id == userId){
        iToDelete = i;
      }
    })
    sails.sockets.blast('exit', { user: users[iToDelete]});
    users.splice(iToDelete, 1);
    req.cookies = null;
    req.session = null;

    return res.json({
      status: 'ok',
    })
  }
};

