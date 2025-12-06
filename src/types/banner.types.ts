export interface Banner {
    success: boolean;
    data: {
        metadata: {
            lastUpdated: string;
            version: string;
        };
        createCoinBanner: {
            title: string;
            buttonText: string;
            coinImageUrl: string;
            backgroundGradient: string;
            ctaLink: string;
        };
        searchBar: {
            placeholder: string;
            buttonText: string;
            recentSearches: string[];
            popularSearches: string[];
        };
    };
}