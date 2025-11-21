/**
 * GitHub Configuration for Traveling Tastebuds Admin
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a GitHub Personal Access Token:
 *    - Go to https://github.com/settings/tokens
 *    - Click "Generate new token" > "Generate new token (classic)"
 *    - Give it a name like "Traveling Tastebuds Admin"
 *    - Set expiration (recommend 90 days or No expiration)
 *    - Select scopes: Check "repo" (Full control of private repositories)
 *    - Click "Generate token"
 *    - COPY THE TOKEN IMMEDIATELY (you won't see it again!)
 *
 * 2. Fill in your details below
 *
 * 3. SECURITY NOTE: Keep this file secure! Don't share your token publicly.
 *    Consider adding this file to .gitignore if you want extra security,
 *    though for a private repo it's generally safe.
 */

const GITHUB_CONFIG = {
    // Your GitHub username
    owner: 'Phillyfan625',

    // Your repository name
    repo: 'phillyfan625.github.io-travelingtastebudswebsite',

    // The branch to commit to
    branch: 'claude/redesign-tastebuds-site-01AqcGZQkoCafFsST4dqy8Fk',

    // Your GitHub Personal Access Token
    // IMPORTANT: Replace 'YOUR_GITHUB_TOKEN_HERE' with your actual token
    token: 'YOUR_GITHUB_TOKEN_HERE',

    // File path in the repo to update
    filePath: 'data/restaurants.js',

    // Commit message template
    commitMessage: 'Update restaurant database via admin panel'
};

/**
 * Admin Users Configuration
 *
 * To add users, add entries to the ADMIN_USERS array below.
 * Passwords are hashed using SHA-256 for security.
 *
 * TO CREATE A NEW USER:
 * 1. Go to: https://emn178.github.io/online-tools/sha256.html
 * 2. Enter the desired password
 * 3. Click "Hash"
 * 4. Copy the hash and use it below
 *
 * DEFAULT USERS (CHANGE THESE PASSWORDS!):
 * - Username: admin, Password: admin123
 * - Username: buddy, Password: buddy123
 */

const ADMIN_USERS = [
    {
        username: 'admin',
        // Password: admin123 (CHANGE THIS!)
        passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
    },
    {
        username: 'buddy',
        // Password: buddy123 (CHANGE THIS!)
        passwordHash: '6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090'
    }
];

// Session timeout (in milliseconds) - 2 hours
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

// Export configuration
if (typeof window !== 'undefined') {
    window.GITHUB_CONFIG = GITHUB_CONFIG;
    window.ADMIN_USERS = ADMIN_USERS;
    window.SESSION_TIMEOUT = SESSION_TIMEOUT;
}
