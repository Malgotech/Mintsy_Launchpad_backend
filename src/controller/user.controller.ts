import { Request, Response, Router } from "express";

import { PrismaClient } from "@prisma/client"; // adjust relative path accordingly
const prisma = new PrismaClient();

export class UserController {
  async createUser(req: Request, res: Response) {
    const { walletAddress, name, avatarUrl, bio, referralCode } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    try {
      const existingUser = await prisma.user.findUnique({
        where: { userAccount: walletAddress },
      });
      if (existingUser) {
        return res.json({ newUser: false, user: existingUser });
      }
      const user = await prisma.user.create({
        data: {
          userAccount: walletAddress,
          name,
          avatarUrl,
          bio,
          referralCode,
        },
      });
      // Create default watchlist for the user
      const watchlist = await prisma.watchlist.create({
        data: {
          userId: user.id,
          name: "My Watchlist",
        },
      });
      res.json({ newUser: true, user, watchlist });
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    const users = await prisma.user.findMany();
    res.json(users);
  }

  async getUserById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { followers: true, following: true },
          },
          tokens: true,
        },
      });

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        ...user,
        followers: undefined,
        following: undefined,

        // followersCount: user._count.followers,
        // followingCount: user._count.following,
        // tokensCreated: user.tokens.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    try {
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data,
      });
      res.json(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: errorMessage });
    }
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await prisma.user.delete({ where: { id: parseInt(id) } });
      res.json({ message: "User deleted" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: errorMessage });
    }
  }

  async updateUserByAccount(req: Request, res: Response) {
    const { userAccount } = req.params;
    const data = req.body;
    try {
      const user = await prisma.user.update({
        where: { userAccount },
        data,
      });
      res.json(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getUserByAccount(req: Request, res: Response) {
    const { userAccount } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { userAccount },
        include: {
          _count: {
            select: { followers: true, following: true },
          },
          tokens: true,
        },
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        ...user,
        followers: undefined,
        following: undefined,

        // followersCount: user._count.followers,
        // followingCount: user._count.following,
        // tokensCreated: user.tokens.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getUserTokens(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }
    try {
      const userTokens = await prisma.userToken.findMany({
        where: { userId: parseInt(id) },
        select: {
          solAmount: true,
          tokenAmount: true,
          token: {
            select: {
              id: true,
              name: true,
              symbol: true,
              cid: true,
              mintAccount: true,
            },
          },
        },
      });
      res.json(userTokens);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  }

  // --- FOLLOW FUNCTIONALITY ---
  async followUser(req: Request, res: Response) {
    const followerId = parseInt(req.body.followerId);
    const followingId = parseInt(req.params.id);
    if (!followerId || !followingId || followerId === followingId) {
      return res
        .status(400)
        .json({ error: "Invalid follower or following id" });
    }
    try {
      await prisma.follow.create({
        data: { followerId, followingId },
      });
      res.json({ message: "Followed successfully" });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Already following" });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async unfollowUser(req: Request, res: Response) {
    const followerId = parseInt(req.body.followerId);
    const followingId = parseInt(req.params.id);
    if (!followerId || !followingId || followerId === followingId) {
      return res
        .status(400)
        .json({ error: "Invalid follower or following id" });
    }
    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      res.json({ message: "Unfollowed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // async getFollowers(req: Request, res: Response) {
  //   const userId = parseInt(req.params.id);
  //   try {
  //     const followers = await prisma.follow.findMany({
  //       where: { followingId: userId },
  //       include: { follower: true }
  //     });
  //     res.json(followers.map(f => f.follower));
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  // }

  // async getFollowing(req: Request, res: Response) {
  //   const userId = parseInt(req.params.id);
  //   try {
  //     const following = await prisma.follow.findMany({
  //       where: { followerId: userId },
  //       include: { following: true }
  //     });
  //     res.json(following.map(f => f.following));
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  async getTopFollowedUsers(req: Request, res: Response) {
    const userId = parseInt(req.params.id);
    try {
      const topFollowed = await prisma.follow.groupBy({
        by: ["followingId"],
        _count: {
          followerId: true,
        },
        where: {
          followingId: { not: userId }, // Exclude the user calling the API
        },
        orderBy: {
          _count: {
            followerId: "desc",
          },
        },
        take: 5,
      });

      // If no users have followers, get 5 random users instead
      if (topFollowed.length === 0) {
        const randomUsers = await prisma.user.findMany({
          where: {
            id: { not: userId }, // Exclude the user calling the API
          },
          take: 5,
        });

        // Get the current user's following relationships for these random users
        const userIds = randomUsers.map((u: { id: any }) => u.id);
        const currentUserFollowing = await prisma.follow.findMany({
          where: {
            followerId: userId,
            followingId: { in: userIds },
          },
          select: {
            followingId: true,
          },
        });

        const followingIds = currentUserFollowing.map(
          (f: { followingId: any }) => f.followingId,
        );

        const result = randomUsers.map((user: { id: any }) => ({
          ...user,
          followerCount: 0,
          isFollowing: followingIds.includes(user.id),
        }));

        return res.status(200).json(result);
      }

      const userIds = topFollowed.map(
        (f: { followingId: any }) => f.followingId,
      );

      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
      });

      // Get the current user's following relationships
      const currentUserFollowing = await prisma.follow.findMany({
        where: {
          followerId: userId,
          followingId: { in: userIds },
        },
        select: {
          followingId: true,
        },
      });

      const followingIds = currentUserFollowing.map(
        (f: { followingId: any }) => f.followingId,
      );

      const result = users.map((user: { id: any }) => {
        const count =
          topFollowed.find(
            (f: { followingId: any }) => f.followingId === user.id,
          )?._count.followerId || 0;
        return {
          ...user,
          followerCount: count,
          isFollowing: followingIds.includes(user.id),
        };
      });

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch top followed users" });
    }
  }
}
