/*
 * ============================================
 *  TTB SPOTS DATA - Easy to update!
 * ============================================
 *
 *  TO ADD A NEW SPOT:
 *  1. Copy one of the objects below
 *  2. Fill in the details
 *  3. Add it to the array
 *  4. The site will automatically update:
 *     - TikTok carousel on homepage
 *     - Interactive food map
 *     - Food reviews page
 *
 *  REQUIRED FIELDS:
 *    name        - Restaurant name
 *    tiktokId    - The video ID from TikTok URL
 *                  (the number at the end of the TikTok URL)
 *    lat / lng   - GPS coordinates (Google Maps > right-click > copy coordinates)
 *    location    - City, State text
 *
 *  OPTIONAL FIELDS:
 *    discount    - e.g. "15% Off" (leave empty string "" if none)
 *    logoImage   - path to logo in /Images/ folder
 *    tags        - array of tags like ["pizza", "italian", "byob"]
 *    rating      - TTB rating out of 10
 *    snippet     - Short one-line description
 */

const TTB_SPOTS = [
    {
        name: "Pic-a-Lilli",
        tiktokId: "7262868213384400171",
        lat: 39.8390,
        lng: -74.9540,
        location: "Shamong, NJ",
        discount: "15% Off",
        logoImage: "/Images/picLogo.png",
        tags: ["pub", "american", "classic"],
        rating: 8.5,
        snippet: "A South Jersey classic with great pub grub and vibes"
    },
    {
        name: "Lillos Tomato Pies",
        tiktokId: "7231695429392682286",
        lat: 39.7937,
        lng: -75.2251,
        location: "Runnemede, NJ",
        discount: "20% Off",
        logoImage: "/Images/lillosLogo.png",
        tags: ["pizza", "italian", "tomato pie"],
        rating: 9.0,
        snippet: "Incredible tomato pies that you have to taste to believe"
    },
    {
        name: "Friendly Food Mart",
        tiktokId: "7203508461517425963",
        lat: 39.7460,
        lng: -75.1076,
        location: "Woodbury, NJ",
        discount: "20% Off (with food item)",
        logoImage: "/Images/foodMartLogo.png",
        tags: ["deli", "sandwiches", "local gem"],
        rating: 8.0,
        snippet: "Hidden gem deli with massive portions and fresh ingredients"
    },
    {
        name: "Pizza Villa",
        tiktokId: "6974164228458548485",
        lat: 39.8021,
        lng: -75.0363,
        location: "Bellmawr, NJ",
        discount: "10% Off",
        logoImage: "/Images/pizzaVillaLogo.png",
        tags: ["pizza", "italian"],
        rating: 8.0,
        snippet: "Old-school pizza joint with a loyal following"
    },
    {
        name: "Bank Bar",
        tiktokId: "7322637556959431978",
        lat: 39.9440,
        lng: -75.1198,
        location: "Philadelphia, PA",
        discount: "10% Off",
        logoImage: "/Images/bankBarLogo.png",
        tags: ["bar", "cocktails", "philly"],
        rating: 8.5,
        snippet: "A cool Philly bar scene with great drinks and atmosphere"
    },
    {
        name: "Holy City",
        tiktokId: "7330419649441516843",
        lat: 39.9497,
        lng: -75.1495,
        location: "Philadelphia, PA",
        discount: "10% Off",
        logoImage: "/Images/holyCityLogo.png",
        tags: ["southern", "comfort food", "philly"],
        rating: 8.5,
        snippet: "Southern-inspired comfort food in the heart of Philly"
    },
    {
        name: "Keg and Kitchen",
        tiktokId: "7262868213384400171",
        lat: 39.8027,
        lng: -75.0230,
        location: "Westmont, NJ",
        discount: "15% Off",
        logoImage: "/Images/kegAndKitchenLogo.png",
        tags: ["gastropub", "craft beer", "burgers"],
        rating: 9.0,
        snippet: "Upscale gastropub with killer craft beer selection"
    },
    {
        name: "Kid Rips",
        tiktokId: "7302216662042955050",
        lat: 39.8649,
        lng: -75.0571,
        location: "Haddon Heights, NJ",
        discount: "10% Off",
        logoImage: "/Images/kidRipsLogo.png",
        tags: ["bar", "wings", "sports"],
        rating: 8.0,
        snippet: "Great wings and a solid sports bar atmosphere"
    },
    {
        name: "Mount Royal Inn",
        tiktokId: "7120744992095685931",
        lat: 39.8102,
        lng: -75.0497,
        location: "Mount Royal, NJ",
        discount: "10% Off",
        logoImage: "/Images/mriLogo.png",
        tags: ["bar", "comfort food", "local"],
        rating: 7.5,
        snippet: "Neighborhood bar with comfort food done right"
    },
    {
        name: "Wilson's Pub",
        tiktokId: "7055090515661983023",
        lat: 39.8531,
        lng: -75.0611,
        location: "Haddon Heights, NJ",
        discount: "10% Off",
        logoImage: "/Images/wilsonsLogo.png",
        tags: ["pub", "burgers", "neighborhood"],
        rating: 8.0,
        snippet: "Neighborhood pub with great burgers and a welcoming crowd"
    },
    {
        name: "Peter and Sons",
        tiktokId: "7262868213384400171",
        lat: 39.7020,
        lng: -75.1119,
        location: "Glassboro, NJ",
        discount: "",
        logoImage: "/Images/qotdImages/peterAndSons.jpeg",
        tags: ["italian", "family", "glassboro"],
        rating: 8.5,
        snippet: "Family-owned Italian spot beloved by the Glassboro community"
    }
];
