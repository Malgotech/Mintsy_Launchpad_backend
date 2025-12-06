import { Request, Response } from 'express';


import { PrismaClient } from '@prisma/client';
import { Banner } from '../types/banner.types';

const prisma = new PrismaClient();

export const getBanner = async (req: Request, res: Response): Promise<void> => {
    try {
        // Fetch banner data from database using Prisma
        const bannerData = await prisma.banner.findFirst({
            orderBy: {
                id: 'desc'
            }
        });

        if (!bannerData) {
            // Default banner data if no data exists in database
            const defaultBanner: Banner = {
                success: true,
                data: {
                    metadata: {
                        lastUpdated: new Date().toISOString(),
                        version: "1.0"
                    },
                    createCoinBanner: {
                        title: "Create Your Own Coin",
                        buttonText: "Get Started",
                        coinImageUrl: "https://cdn.yourapp.com/images/banner-coin.png",
                        backgroundGradient: "radial-gradient(82.8% 600.31% at 85.09% 35.31%, #0D0900 0%, #000000 100%)",
                        ctaLink: "/create-coin"
                    },
                    searchBar: {
                        placeholder: "Search for coins, tokens, or projects...",
                        buttonText: "Search",
                        recentSearches: ["SOLANA", "BITCOIN", "MEME COIN"],
                        popularSearches: ["DOGE", "PEPE", "SHIBA"]
                    }
                }
            };
            
            res.status(200).json(defaultBanner);
            return;
        }

        res.status(200).json({
            success: true,
            data: bannerData
        });

    } catch (error) {
        console.error('Error fetching banner:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
export const createBanner = async (req: Request, res: Response): Promise<void> => {
    try {
        // Verify if user is admin (implement your admin check logic here)
        const user = req.body.user; // Assuming user info is passed in request body
        if (!user.isAdmin) {
            res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
            return;
        }

        const bannerData = req.body;

        const newBanner = await prisma.banner.create({
            data: bannerData
        });

        res.status(201).json({
            success: true,
            data: newBanner
        });

    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};