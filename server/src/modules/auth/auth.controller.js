const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.sub);
    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, me };
