const passport = require("passport");
const passportJWT = require("passport-jwt");
const ExtractJWT = passportJWT.ExtractJwt;
const LocalStrategy = require("passport-local").Strategy;
const JWTStrategy = passportJWT.Strategy;
const jwt_secret = "your_jwt_secret"; // FIXME:
const bcrypt = require("bcrypt");

const models = require(global.models);
const User = models.User;

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, next) => {
      try {
        const user = await User.scope("auth").findOne({ where: { email } });
        if (user && bcrypt.compareSync(password, user.password)) {
          return next(null, user, { message: "Logged In Successfully." });
        }
        return next(null, false, { message: "Incorrect email or password." });
      } catch (e) {
        return next(null, false, { message: `Error: ${e}` });
      }
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwt_secret,
    },
    async (jwtPayload, next) => {
      try {
        const user = await User.scope("auth").findByPk(jwtPayload.id);
        return next(null, user);
      } catch (e) {
        return next(e);
      }
    }
  )
);
