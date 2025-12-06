import { Router } from "express";
import { UserController } from "../controller/user.controller";

// Router Configuration
const userRouter = Router();
const userController = new UserController();

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

export default userRouter;