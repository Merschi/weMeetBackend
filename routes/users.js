var express = require('express');
var router = express.Router();
var User = require('../models/user');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');


async function checkInUse( user )
{
  let checkEmail = await User.findOne({email:user.email});

  if( checkEmail ) {
    return { 
      err: true, 
      message: "Die E-Mail Adresse wird bereits verwendet." 
    };
  }

  let checkUserName = await User.findOne({ username:user.username});

  if( checkUserName ) {
    return {
      err: true,
      message: "Der Benutzername wird bereits verwendet."
    };
  }

  return {
    err: false,
    message: ""
  }
}


router.post('/register',  async function(req,res,next){
  // _id wird autoamtisch zum Schema hinzugefügt!
  var user = new User({
    email: req.body.email,
    username: req.body.username,
    password: User.hashPassword(req.body.password),
    creation_dt: Date.now()
  }),
  errorMessageBase = 'Fehler bei der Registrierung: ';

  let check = await checkInUse(user);

  if ( check.err )
  {
    return res.status(501).json({message:  errorMessageBase + check.message});
  }

  let promise = user.save();
  let errorMessage = errorMessageBase;

  promise
    .then(function (doc) {
      console.log("User registered: ", doc.username);
      return res.status(201).json(doc);
    })
    .catch(function (err) {
      errorMessage += `${err.name}`;

      Object.keys(err.errors).forEach( function (e, i) {
        errorMessage += `\n${err.errors[e].message}`;
      });
      console.log("ERROR saving: ", JSON.stringify(err));
      return res.status(501).json({ message: errorMessage });
    })
})

router.post('/login', function(req,res,next){
   let promise = User.findOne({email:req.body.email}).exec();

   promise.then(function(doc){
    if(doc) {
      if(doc.isValid(req.body.password)){
          // generate token
          let token = jwt.sign({username:doc.username},'secret', {expiresIn : '3h'});

          return res.status(200).json(token);

      } else {
        return res.status(501).json({message:' Invalid Credentials'});
      }
    }
    else {
      return res.status(501).json({message:'User email is not registered.'})
    }
   });

   promise.catch(function(err){
     return res.status(501).json({message:'Some internal error'});
   })
})

router.get('/username', verifyToken, function(req,res,next){
  return res.status(200).json(decodedToken.username);
})

var decodedToken='';
function verifyToken(req,res,next){
  let token = req.query.token;

  jwt.verify(token,'secret', function(err, tokendata){
    if(err){
      return res.status(400).json({message:' Unauthorized request'});
    }
    if(tokendata){
      decodedToken = tokendata;
      next();
    }
  })
}

module.exports = router;