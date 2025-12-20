"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controller/user.controller");
// Router Configuration
const userRouter = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
userRouter.post('/login', userController.createUser);
userRouter.get('/', userController.getAllUsers);
//@ts-ignore
userRouter.get('/:id', userController.getUserById);
userRouter.put('/:id', userController.updateUser);
userRouter.put('/account/:userAccount', userController.updateUserByAccount);
userRouter.delete('/:id', userController.deleteUser);
userRouter.get('/account/:userAccount', userController.getUserByAccount);
userRouter.get('/:id/tokens', userController.getUserTokens);
userRouter.post('/:id/follow', userController.followUser.bind(userController));
userRouter.post('/:id/unfollow', userController.unfollowUser.bind(userController));
// userRouter.get('/:id/followers', userController.getFollowers.bind(userController));
// userRouter.get('/:id/following', userController.getFollowing.bind(userController));
userRouter.get('/top/followers/:id', userController.getTopFollowedUsers.bind(userController));
exports.default = userRouter;
