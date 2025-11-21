# 🔐 Traveling Tastebuds - Admin Panel Setup Guide

## Overview

Your admin panel is now secured with authentication and integrates directly with GitHub to automatically commit changes!

---

## 🚀 Quick Start

### Step 1: Create a GitHub Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `Traveling Tastebuds Admin`
4. Set expiration: **90 days** or **No expiration** (your choice)
5. Select scopes: ✅ **Check "repo"** (Full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### Step 2: Configure the Admin Panel

1. Open `/admin-config.js` in your code editor
2. Find this line:
   ```javascript
   token: 'YOUR_GITHUB_TOKEN_HERE',
   ```
3. Replace `'YOUR_GITHUB_TOKEN_HERE'` with your actual token:
   ```javascript
   token: 'ghp_abc123xyz...',  // Your real token
   ```
4. Save the file

###Step 3: Change Default Passwords (IMPORTANT!)

The admin panel comes with two default users:
- Username: `admin`, Password: `admin123`
- Username: `buddy`, Password: `buddy123`

**⚠️ YOU MUST CHANGE THESE!**

#### To Create New Passwords:

1. Go to this SHA-256 hash generator: https://emn178.github.io/online-tools/sha256.html
2. Enter your desired password (e.g., `MySecurePass123!`)
3. Click **"Hash"**
4. Copy the hash
5. Open `/admin-config.js` and replace the password hash:

```javascript
const ADMIN_USERS = [
    {
        username: 'admin',
        // Password: YourNewPassword (CHANGE THIS!)
        passwordHash: 'paste_your_new_hash_here'
    },
    {
        username: 'buddy',
        // Password: YourNewPassword (CHANGE THIS!)
        passwordHash: 'paste_your_new_hash_here'
    }
];
```

#### To Add More Users:

Just add another object to the array:

```javascript
const ADMIN_USERS = [
    {
        username: 'admin',
        passwordHash: '...'
    },
    {
        username: 'buddy',
        passwordHash: '...'
    },
    {
        username: 'newuser',  // Add new user here
        passwordHash: 'hash_of_newuser_password'
    }
];
```

### Step 4: Commit and Push

```bash
git add admin-config.js
git commit -m "Configure admin panel with GitHub token"
git push
```

**Note:** If you're concerned about security, you can add `admin-config.js` to `.gitignore`, but you'll need to manage it separately.

---

## 📖 How to Use the Admin Panel

### Accessing the Admin Panel

1. Go to: `https://yoursite.com/admin.html`
2. Login with your username and password
3. You'll see the admin dashboard!

### Making Changes

#### Add a New Restaurant:

1. Click the **"+"** button in the top-right of the restaurant list
2. Fill in all the required fields:
   - Restaurant Name *
   - City *
   - Latitude & Longitude (for map pins)
   - Type (Pizza, Wings, Pub, etc.)
   - Discount offer
   - Logo URL (path to the image)
   - Description *
   - TikTok Video ID
   - Featured checkbox (for homepage carousel)
   - TikTok Headline (if featured)
3. See a live preview at the bottom
4. Click **"Add Restaurant"**
5. Click **"Sync to GitHub"** at the top to publish changes

#### Edit an Existing Restaurant:

1. Click on a restaurant from the list on the left
2. Click **"Edit"**
3. Make your changes
4. Click **"Update Restaurant"**
5. Click **"Sync to GitHub"** to publish

#### Delete a Restaurant:

1. Click on a restaurant from the list
2. Click **"Delete"**
3. Confirm the deletion
4. Click **"Sync to GitHub"** to publish

### Syncing to GitHub

**Important:** Changes are saved locally in your browser until you click **"Sync to GitHub"**

When you click "Sync to GitHub":
1. The system commits your changes to the `data/restaurants.js` file
2. GitHub automatically rebuilds your site
3. Changes are live in 1-2 minutes!

---

## 🔒 Security Features

### Authentication
- ✅ **SHA-256 hashed passwords** - passwords are never stored in plain text
- ✅ **Session-based login** - no cookies, uses sessionStorage
- ✅ **Auto-logout after 2 hours** of inactivity
- ✅ **Login screen** before accessing admin panel

### Activity Tracking
- All commits include the username who made the change
- Full Git history shows who changed what and when

### Best Practices
1. **Change default passwords immediately**
2. **Use strong passwords** (at least 12 characters with mix of letters, numbers, symbols)
3. **Only share credentials with trusted people**
4. **Revoke GitHub tokens** if they're compromised
5. **Don't share your `admin-config.js`** file publicly

---

## 🛠️ Configuration Options

### In `admin-config.js`:

```javascript
const GITHUB_CONFIG = {
    owner: 'Phillyfan625',  // Your GitHub username
    repo: 'phillyfan625.github.io-travelingtastebudswebsite',  // Repo name
    branch: 'claude/redesign-tastebuds-site-01AqcGZQkoCafFsST4dqy8Fk',  // Branch to commit to
    token: 'YOUR_GITHUB_TOKEN_HERE',  // Your Personal Access Token
    filePath: 'data/restaurants.js',  // File to update
    commitMessage: 'Update restaurant database via admin panel'  // Commit message
};

const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;  // 2 hours in milliseconds
```

---

## 📋 Restaurant Data Fields

Each restaurant should include:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ | Restaurant name | "Pic-A-Lilli Inn" |
| `city` | ✅ | City and state | "Shamong, NJ" |
| `lat` | | Latitude for map | 39.8026 |
| `lng` | | Longitude for map | -74.7299 |
| `type` | ✅ | Food category | "Wings", "Pizza", "Pub" |
| `discount` | | Discount offer | "15% OFF" |
| `desc` | ✅ | Brief description | "The king of wings..." |
| `logo` | ✅ | Path to logo image | "/Images/picLogo.png" |
| `tiktokId` | | TikTok video ID | "7262868213384400171" |
| `featured` | | Show in carousel | true / false |
| `tiktokHeadline` | | Carousel headline | "50 wing flavors 🍗" |

---

## 🐛 Troubleshooting

### "GitHub Not Configured" Warning

- Check that you've added your token to `admin-config.js`
- Make sure the token is not `'YOUR_GITHUB_TOKEN_HERE'`
- Verify the token has **"repo"** scope

### "GitHub API error: 403 Forbidden"

- Your token may have expired - generate a new one
- The token might not have the correct permissions
- You might be hitting GitHub's rate limit (rare)

### "Invalid username or password"

- Double-check you've changed the default passwords
- Make sure you're using the correct SHA-256 hash
- Try generating the hash again

### Changes Not Appearing on Site

- Wait 1-2 minutes for GitHub Pages to rebuild
- Check your commit was successful on GitHub
- Clear your browser cache and refresh
- Make sure you clicked "Sync to GitHub" button

### Session Expires Too Quickly

- Change `SESSION_TIMEOUT` in `admin-config.js`:
  ```javascript
  const SESSION_TIMEOUT = 4 * 60 * 60 * 1000;  // 4 hours
  ```

---

## 📞 Need Help?

If you run into issues:
1. Check the browser console for errors (F12)
2. Verify your GitHub token is valid
3. Make sure all required fields are filled
4. Try exporting your data as backup before making changes

---

## 🎉 You're All Set!

Your admin panel is now secure and ready to use. You and your buddy can:
- ✅ Log in with unique credentials
- ✅ Add, edit, and delete restaurants
- ✅ See live previews before publishing
- ✅ Commit directly to GitHub with one click
- ✅ Have changes go live automatically

**Default Login Credentials (CHANGE THESE!):**
- Username: `admin` / Password: `admin123`
- Username: `buddy` / Password: `buddy123`

Access the admin panel at: **`/admin.html`**

Happy editing! 🍕🍔🍗
