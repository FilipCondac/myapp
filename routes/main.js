const bcrypt = require("bcrypt");
const { response } = require("express");
const e = require("express");

module.exports = function (app, appName) {
  //Redirect to login page if not logged in
  const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
      res.redirect("./login");
    } else {
      next();
    }
  };

  //Validation function
  const { check, validationResult } = require("express-validator");

  //Home page
  app.get("/", function (req, res) {
    res.render("index.ejs", appName);
  });

  //About page
  app.get("/about", function (req, res) {
    res.render("about.ejs", appName);
  });

  //Register
  app.get("/register", function (req, res) {
    res.render("register.ejs", appName);
  });

  //Registering user
  app.post(
    "/registered",
    [
      //Validation of input
      check("email").isEmail().notEmpty(),
      check("password").isLength({ min: 8 }).matches(/\d/).notEmpty(), //Doesn't allow to continue unless password has a lenght of 8 + a number
      check("first").notEmpty().isLength({ min: 2 }),
      check("last").notEmpty().isLength({ min: 2 }),
      check("username").notEmpty().isLength({ min: 5 }),
    ],
    function (req, res) {
      //Validates and runs code if there are no errors in form
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Wrong credentials");
        res.redirect("./register");
      } else {
        const saltRounds = 10;
        const plainPassword = req.body.password;

        //Hash password with 10 salt rounds
        bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
          //Grab all user Data
          const username = req.sanitize(req.body.username);
          const password = hashedPassword;
          const email = req.sanitize(req.body.email);
          const lastName = req.sanitize(req.body.last);
          const firstName = req.sanitize(req.body.first);

          //Inserting all user data into the db
          db.query(
            "INSERT INTO users (username,hashedPassword,email,lastName,firstName) VALUES (?,?,?,?,?)",
            [username, password, email, lastName, firstName],
            (error, result) => {
              if (error) {
                return console.log(error);
              }
              //Send a result with all the info to show its done
              result =
                "Hello " +
                req.sanitize(req.body.first) +
                " " +
                req.sanitize(req.body.last) +
                " you are now registered! We will send an email to you at " +
                req.sanitize(req.body.email);
              result +=
                " Your password is: " +
                req.sanitize(req.body.password) +
                " and your hashed password is: " +
                hashedPassword;
              res.send(result + " <a href=" + "./" + ">Home</a>");
            }
          );
        });
      }
    }
  );

  //Login page
  app.get("/login", function (req, res) {
    res.render("login.ejs", appName);
  });

  //Login post
  app.post("/loggedin", function (req, res) {
    let email = req.sanitize(req.body.email);
    //Query to get the hashed password from the db
    let sqlQuery =
      "SELECT hashedPassword FROM users WHERE email = '" + email + "'";

    db.query(sqlQuery, (error, result) => {
      if (error) {
        res.redirect("./");
      }
      //Check if there are results to prevent crash
      if (result.length > 0) {
        let userData = Object.assign({}, appName, {
          matchingUsers: result[0].hashedPassword,
        });

        let hashedPassword = userData.matchingUsers;
        console.log(userData.matchingUsers);

        //Compare the hashed password with the one from the form
        bcrypt.compare(
          req.body.password,
          hashedPassword,
          function (err, result) {
            if (err) {
              res.send(err);
            } else if (result == true) {
              req.session.userId = req.body.email;
              res.redirect(req.session.returnTo || "/");
            } else {
              return res.send("User doesnt exist");
            }
          }
        );
      } else {
        //If there are no results
        return res.send(
          "User doesn't exist or wrong password" +
            " <a href=" +
            "/login" +
            ">Try Again</a>"
        );
      }
    });
  });

  //Logout
  app.get("/logout", redirectLogin, (req, res) => {
    //Terminate session
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("./");
      }
      res.send("You are now logged out. <a href=" + "./" + ">Home</a>");
    });
  });

  //Add food page
  app.get("/addfood", redirectLogin, function (req, res) {
    res.render("addfood.ejs", appName);
  });

  //Post for add food
  app.post(
    //Input validation for books
    "/foodadded",
    [
      check("foodName").notEmpty(),
      check("foodWeight").notEmpty().isInt(),
      check("foodMeasurement").notEmpty(),
      check("foodCarbs").notEmpty().isFloat(),
      check("foodFat").notEmpty().isFloat(),
      check("foodProtein").notEmpty().isFloat(),
      check("foodSalt").notEmpty().isFloat(),
      check("foodSugar").notEmpty().isFloat(),
    ],
    function (req, res) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Wrong input");
        res.redirect("./addfood");
      } else {
        // saving data in database
        let sqlquery =
          "INSERT INTO food (foodName,foodWeight, foodMeasurement, foodCarbs, foodFat, foodProtein, foodSalt, foodSugar, foodUser) VALUES (?,?,?,?,?,?,?,?,?)";
        // execute sql query
        let newrecord = [
          req.sanitize(req.body.foodName),
          req.sanitize(req.body.foodWeight),
          req.sanitize(req.body.foodMeasurement),
          req.sanitize(req.body.foodCarbs),
          req.sanitize(req.body.foodFat),
          req.sanitize(req.body.foodProtein),
          req.sanitize(req.body.foodSalt),
          req.sanitize(req.body.foodSugar),
          req.sanitize(req.session.userId),
        ];
        db.query(sqlquery, newrecord, (err, result) => {
          if (err) {
            return console.error(err.message);
          } else
            res.send(
              "This food has been added to the database: " +
                req.sanitize(req.body.foodName) +
                "</br> Typical Values per: " +
                req.sanitize(req.body.foodWeight) +
                " </br> Unit of Measurement(g/ml): " +
                req.sanitize(req.body.foodMeasurement) +
                "</br> Carbohydrates: " +
                req.sanitize(req.body.foodCarbs) +
                "g" +
                "</br> Fat: " +
                req.sanitize(req.body.foodFat) +
                "g" +
                "</br> Protein: " +
                req.sanitize(req.body.foodProtein) +
                "g" +
                "</br> Salt: " +
                req.sanitize(req.body.foodSalt) +
                "g" +
                "</br> Sugar: " +
                req.sanitize(req.body.foodSugar) +
                "g" +
                " <a href=" +
                "./" +
                ">Home</a>"
            );
        });
      }
    }
  );

  //Search page
  app.get("/search", redirectLogin, function (req, res) {
    res.render("search.ejs", appName);
  });

  //Search result page
  app.get("/search-result", function (req, res) {
    let sqlquery =
      "SELECT * FROM food WHERE foodName LIKE '%" +
      req.sanitize(req.query.keyword) +
      "%'";
    // execute sql query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      //If there are results save them to an object and render the list page
      if (result.length > 0) {
        let newData = Object.assign({}, appName, { availableFood: result });
        return res.render("list.ejs", newData);
      }
      //If there are no results
      return res.send(
        "No results found " + " <a href=" + "/search" + ">Try again</a>"
      );
    });
  });

  //Update page
  app.get("/update", redirectLogin, function (req, res) {
    res.render("update.ejs", appName);
  });

  //Update result page
  app.get("/search-result-update", function (req, res) {
    //Search for the food in the database
    let sqlquery = "SELECT * FROM food WHERE foodName = ?";
    // execute sql query
    db.query(sqlquery, [req.sanitize(req.query.keyword)], (err, result) => {
      if (err) {
        res.redirect("./");
      }
      //If there are results save them to an object and render the list page
      if (result.length > 0) {
        let newData = Object.assign({}, appName, { availableFood: result });
        return res.render("list-update.ejs", newData);
      }
      return res.send(
        "No results found " + " <a href=" + "/search" + ">Try again</a>"
      );
    });
  });

  //Post for update food
  app.post(
    "/foodupdate",
    [
      //Input validation for food
      check("foodNameUpdated").notEmpty(),
      check("foodWeightUpdated").notEmpty().isInt(),
      check("foodMeasurementUpdated").notEmpty(),
      check("foodCarbsUpdated").notEmpty().isFloat(),
      check("foodFatUpdated").notEmpty().isFloat(),
      check("foodProteinUpdated").notEmpty().isFloat(),
      check("foodSaltUpdated").notEmpty().isFloat(),
      check("foodSugarUpdated").notEmpty().isFloat(),
    ],
    function (req, res) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.send("Wrong input" + " <a href=" + "./update" + ">Back</a>");
      } else {
        //Update the food in the database
        let sqlquery =
          "UPDATE food SET foodName = ?, foodWeight = ?, foodMeasurement = ?, foodCarbs = ?, foodFat = ?, foodProtein = ?, foodSalt = ?, foodSugar = ? WHERE foodID = ?";

        //Check if the user has entered a value for each field
        if (req.body.foodNameUpdated != "") {
          foodName = req.body.foodNameUpdated;
        } else {
          return res.send(
            "Please enter a value for food name " +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodWeightUpdated != "") {
          foodWeight = req.body.foodWeightUpdated;
        } else {
          return res.send(
            "Please enter a value for food weight" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodMeasurementUpdated != "") {
          foodMeasurement = req.body.foodMeasurementUpdated;
        } else {
          return res.send(
            "Please enter a value for food measurement" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodCarbsUpdated != "") {
          foodCarbs = req.body.foodCarbsUpdated;
        } else {
          return res.send(
            "Please enter a value for food carbs" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodFatUpdated != "") {
          foodFat = req.body.foodFatUpdated;
        } else {
          return res.send(
            "Please enter a value for food fat" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodProteinUpdated != "") {
          foodProtein = req.body.foodProteinUpdated;
        } else {
          return res.send(
            "Please enter a value for food protein" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodSaltUpdated != "") {
          foodSalt = req.body.foodSaltUpdated;
        } else {
          return res.send(
            "Please enter a value for food salt" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodSugarUpdated != "") {
          foodSugar = req.body.foodSugarUpdated;
        } else {
          return res.send(
            "Please enter a value for food sugar" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }

        if (req.body.foodIDUpdated != "") {
          foodID = req.body.foodIDUpdated;
        } else {
          return res.send(
            "Please enter a value for food ID" +
              " <a href=" +
              "./update" +
              ">Back</a>"
          );
        }
        //Create an array with the new values and sanitize them
        let newrecord = [
          req.sanitize(foodName),
          req.sanitize(foodWeight),
          req.sanitize(foodMeasurement),
          req.sanitize(foodCarbs),
          req.sanitize(foodFat),
          req.sanitize(foodProtein),
          req.sanitize(foodSalt),
          req.sanitize(foodSugar),
          req.sanitize(foodID),
        ];
        //Check if the user is logged in
        if (req.body.foodUser == req.session.userId) {
          db.query(sqlquery, newrecord, (err, result) => {
            if (err) {
              return console.error(err.message);
            } //Inform user that the food has been updated
            else
              res.send(
                "This food has been updated to the database: " +
                  req.sanitize(foodName) +
                  "</br> Typical Values per: " +
                  req.sanitize(foodWeight) +
                  " </br> Unit of Measurement(g/ml): " +
                  req.sanitize(foodMeasurement) +
                  "</br> Carbohydrates: " +
                  req.sanitize(foodCarbs) +
                  "g" +
                  "</br> Fat: " +
                  req.sanitize(foodFat) +
                  "g" +
                  "</br> Protein: " +
                  req.sanitize(foodProtein) +
                  "g" +
                  "</br> Salt: " +
                  req.sanitize(foodSalt) +
                  "g" +
                  "</br> Sugar: " +
                  req.sanitize(foodSugar) +
                  "g" +
                  " <a href=" +
                  "./" +
                  ">Home</a>"
              );
          });
        } else {
          //Inform user that they cannot update the food as they are not the user who created it
          res.send(
            "You cannot update this food as you are not the user who created it" +
              " <a href=" +
              "./" +
              ">Home</a>"
          );
        }
      }
    }
  );

  //Delete
  app.get("/delete", redirectLogin, function (req, res) {
    res.render("delete.ejs", appName);
  });

  //Delete result page
  app.get("/search-result-delete", redirectLogin, function (req, res) {
    //Search for the food in the database
    let sqlquery = "SELECT * FROM food WHERE foodName = ?";
    // execute sql query
    db.query(sqlquery, [req.sanitize(req.query.keyword)], (err, result) => {
      if (err) {
        res.redirect("./");
      }
      //If there are results save them to an object and render the list page
      if (result.length > 0) {
        let newData = Object.assign({}, appName, { availableFood: result });
        return res.render("list-delete.ejs", newData);
      }
      return res.send(
        "No results found " + " <a href=" + "/search" + ">Try again</a>"
      );
    });
  });

  //Delete food from database
  app.post("/deletefood", redirectLogin, (req, res) => {
    //Create a query to delete the food from the database
    let sqlquery = "DELETE FROM food WHERE foodID = ?";
    let newrecord = [req.sanitize(req.body.foodID)];
    //Check if the user is logged in
    if (req.body.foodUser == req.session.userId) {
      db.query(sqlquery, newrecord, (err, result) => {
        if (err) {
          return console.error(err.message);
        } else {
          res.send(
            "This food has been deleted from the database" +
              " <a href=" +
              "./" +
              ">Home</a>"
          );
        }
      });
    } else {
      res.send(
        "You cannot delete the item as you are not the user who created it" +
          " <a href=" +
          "./" +
          ">Home</a>"
      );
    }
  });
  //List all food in database
  app.get("/allfood", redirectLogin, function (req, res) {
    let sqlquery = "SELECT * FROM food";
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      //Render the list.ejs page with the results from the database
      let newData = Object.assign({}, appName, { availableFood: result });
      return res.render("list.ejs", newData);
    });
  });

  //Api
  app.get("/api", function (req, res) {
    // Query database to get all the food

    let sqlquery = "SELECT * FROM food";

    // Execute the sql query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }
      // Return results as a JSON object
      res.json(result);
    });
  });
};
