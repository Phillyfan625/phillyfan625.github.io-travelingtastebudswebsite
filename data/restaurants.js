/**
 * Traveling Tastebuds - Central Restaurant Database
 * This file contains all restaurant data used across the site.
 *
 * Each restaurant object should include:
 * - id: Unique identifier (number)
 * - name: Restaurant name (string)
 * - city: City and state location (string)
 * - lat: Latitude for map (number)
 * - lng: Longitude for map (number)
 * - type: Category/type of food (string): "Pizza", "Wings", "Pub", "Deli", etc.
 * - discount: Discount offer (string or null): e.g., "15% OFF"
 * - desc: Short description (string)
 * - logo: Path to logo image (string)
 * - tiktokId: TikTok video ID (string or empty string)
 * - featured: Whether to feature in carousel (boolean)
 * - tiktokHeadline: Catchy headline for featured items (string or null)
 */

const DEFAULT_RESTAURANTS = [
    {
        id: 1,
        name: "Pic-A-Lilli Inn",
        city: "Shamong, NJ",
        lat: 39.8026,
        lng: -74.7299,
        type: "Wings",
        discount: "15% OFF",
        desc: "The undisputed king of wings in the Pine Barrens. Get the 'Smoked' sauce.",
        logo: "/Images/picLogo.png",
        tiktokId: "7262868213384400171",
        featured: true,
        tiktokHeadline: "This spot has 50 different wing flavors 🍗"
    },
    {
        id: 2,
        name: "Lillo's Tomato Pies",
        city: "Hainesport, NJ",
        lat: 39.9835,
        lng: -74.8632,
        type: "Pizza",
        discount: "20% OFF",
        desc: "Authentic Trenton style tomato pies. Thin, crispy, and sauce on top.",
        logo: "/Images/lillosLogo.png",
        tiktokId: "7231695429392682286",
        featured: true,
        tiktokHeadline: "Trying the wildest pizza in Jersey! 🍕🤯"
    },
    {
        id: 3,
        name: "Friendly Food Mart",
        city: "Runnemede, NJ",
        lat: 39.8500,
        lng: -75.0700,
        type: "Deli",
        discount: "20% OFF",
        desc: "Hidden gem inside a convenience store. The breakfast sandwiches are legendary.",
        logo: "/Images/foodMartLogo.png",
        tiktokId: "7203508461517425963",
        featured: false,
        tiktokHeadline: null
    },
    {
        id: 4,
        name: "Pizza Villa",
        city: "Clayton, NJ",
        lat: 39.6600,
        lng: -75.0800,
        type: "Pizza",
        discount: "10% OFF",
        desc: "Classic local slices that define the South Jersey flavor profile.",
        logo: "/Images/pizzaVillaLogo.png",
        tiktokId: "6974164228458548485",
        featured: false,
        tiktokHeadline: null
    },
    {
        id: 5,
        name: "Holy City Publick House",
        city: "Gloucester City, NJ",
        lat: 39.8912,
        lng: -75.1177,
        type: "Pub",
        discount: "10% OFF",
        desc: "Great vibes, better burgers, and a solid craft beer selection.",
        logo: "/Images/holyCityLogo.png",
        tiktokId: "7330419649441516843",
        featured: true,
        tiktokHeadline: "Is this the best burger in NJ? 🍔🔥"
    },
    {
        id: 6,
        name: "Wilson's Pub",
        city: "Gibbstown, NJ",
        lat: 39.8200,
        lng: -75.2800,
        type: "Pub",
        discount: "10% OFF",
        desc: "Your neighborhood spot for comfort food and good times.",
        logo: "/Images/wilsonsLogo.png",
        tiktokId: "7055090515661983023",
        featured: true,
        tiktokHeadline: "Secret Menu Item Unlocked! 🤫🌮"
    },
    {
        id: 7,
        name: "Bank Bar",
        city: "Clayton, NJ",
        lat: 39.6650,
        lng: -75.0850,
        type: "Pub",
        discount: "10% OFF",
        desc: "Historic bar with modern eats and a great atmosphere.",
        logo: "/Images/bankBarLogo.png",
        tiktokId: "7322637556959431978",
        featured: false,
        tiktokHeadline: null
    },
    {
        id: 8,
        name: "Keg and Kitchen",
        city: "Sewell, NJ",
        lat: 39.7640,
        lng: -75.1050,
        type: "Pub",
        discount: "15% OFF",
        desc: "Craft beers and elevated pub fare in a lively setting.",
        logo: "/Images/kegAndKitchenLogo.png",
        tiktokId: "",
        featured: false,
        tiktokHeadline: null
    },
    {
        id: 9,
        name: "Kid Rips",
        city: "Clementon, NJ",
        lat: 39.8100,
        lng: -74.9830,
        type: "Pizza",
        discount: "10% OFF",
        desc: "Unique pizza creations that push the boundaries of flavor.",
        logo: "/Images/kidRipsLogo.png",
        tiktokId: "7302216662042955050",
        featured: false,
        tiktokHeadline: null
    },
    {
        id: 10,
        name: "Mount Royal Inn",
        city: "Clementon, NJ",
        lat: 39.8120,
        lng: -74.9850,
        type: "Pub",
        discount: "10% OFF",
        desc: "Local favorite for wings, burgers, and cold beer.",
        logo: "/Images/mriLogo.png",
        tiktokId: "7120744992095685931",
        featured: false,
        tiktokHeadline: null
    }
];

/**
 * Restaurant Database Manager
 * Handles loading and saving restaurant data with localStorage persistence
 */
class RestaurantDatabase {
    constructor() {
        this.storageKey = 'ttb_restaurants';
        this.restaurants = this.loadRestaurants();
    }

    /**
     * Load restaurants from localStorage or use defaults
     */
    loadRestaurants() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validate that it's an array
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Error loading stored restaurants:', e);
        }
        return [...DEFAULT_RESTAURANTS];
    }

    /**
     * Save restaurants to localStorage
     */
    saveRestaurants() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.restaurants));
            return true;
        } catch (e) {
            console.error('Error saving restaurants:', e);
            return false;
        }
    }

    /**
     * Get all restaurants
     */
    getAll() {
        return [...this.restaurants];
    }

    /**
     * Get restaurant by ID
     */
    getById(id) {
        return this.restaurants.find(r => r.id === id);
    }

    /**
     * Get featured restaurants
     */
    getFeatured() {
        return this.restaurants.filter(r => r.featured);
    }

    /**
     * Get restaurants by type
     */
    getByType(type) {
        return this.restaurants.filter(r => r.type === type);
    }

    /**
     * Get all unique types
     */
    getTypes() {
        const types = new Set(this.restaurants.map(r => r.type));
        return Array.from(types).sort();
    }

    /**
     * Add new restaurant
     */
    add(restaurant) {
        // Generate new ID
        const maxId = Math.max(0, ...this.restaurants.map(r => r.id));
        const newRestaurant = {
            ...restaurant,
            id: maxId + 1
        };
        this.restaurants.push(newRestaurant);
        this.saveRestaurants();
        return newRestaurant;
    }

    /**
     * Update restaurant
     */
    update(id, updates) {
        const index = this.restaurants.findIndex(r => r.id === id);
        if (index !== -1) {
            this.restaurants[index] = {
                ...this.restaurants[index],
                ...updates,
                id // Preserve ID
            };
            this.saveRestaurants();
            return this.restaurants[index];
        }
        return null;
    }

    /**
     * Delete restaurant
     */
    delete(id) {
        const index = this.restaurants.findIndex(r => r.id === id);
        if (index !== -1) {
            const deleted = this.restaurants.splice(index, 1)[0];
            this.saveRestaurants();
            return deleted;
        }
        return null;
    }

    /**
     * Reset to default data
     */
    reset() {
        this.restaurants = [...DEFAULT_RESTAURANTS];
        this.saveRestaurants();
        return this.restaurants;
    }

    /**
     * Export data as JSON
     */
    exportJSON() {
        return JSON.stringify(this.restaurants, null, 2);
    }

    /**
     * Import data from JSON
     */
    importJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                this.restaurants = parsed;
                this.saveRestaurants();
                return true;
            }
        } catch (e) {
            console.error('Error importing JSON:', e);
        }
        return false;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.restaurantDB = new RestaurantDatabase();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RestaurantDatabase, DEFAULT_RESTAURANTS };
}
