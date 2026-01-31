# Render Deployment Guide for Access Revocation Management System

This guide will help you deploy the backend to Render.com with MongoDB Atlas.

---

## Prerequisites

1. **GitHub Repository**: ✅ Already done - https://github.com/LokeshKrishna01/fsd_backend.git
2. **Render Account**: Sign up at https://render.com (free)
3. **MongoDB Atlas Account**: Sign up at https://www.mongodb.com/cloud/atlas (free)

---

## Step 1: Set Up MongoDB Atlas (Free Tier)

### 1.1 Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" and create an account
3. Choose the **Free M0 tier** (512 MB storage)

### 1.2 Create a Cluster
1. Click "Create a Cluster"
2. Choose **FREE** tier (M0)
3. Select a cloud provider (AWS recommended)
4. Choose a region (closest to your users)
5. Click "Create Cluster" (takes 3-5 minutes)

### 1.3 Create Database User
1. Click "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `admin` (or your choice)
5. Password: Generate a strong password and **SAVE IT**
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 1.4 Whitelist IP Address
1. Click "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Note: For production, restrict to Render's IP ranges
4. Click "Confirm"

### 1.5 Get Connection String
1. Click "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string - it looks like:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace** `<password>` with your actual database password
7. **Add database name** before the `?`:
   ```
   mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/access-revocation-db?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy to Render

### 2.1 Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)

### 2.2 Create New Web Service

#### Option A: Using Blueprint (Recommended)
1. From Render Dashboard, click "New +"
2. Select "Blueprint"
3. Connect your GitHub repository: `LokeshKrishna01/fsd_backend`
4. Render will detect the `render.yaml` file
5. Give your blueprint a name: `access-revocation-system`
6. Click "Apply"

#### Option B: Manual Setup
1. From Render Dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub account
4. Select repository: `LokeshKrishna01/fsd_backend`
5. Fill in the details:
   - **Name**: `access-revocation-backend`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 2.3 Add Environment Variables

Click "Advanced" and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Sets production mode |
| `PORT` | `8080` | Render will override this automatically |
| `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `<generate-strong-random-secret>` | Generate a strong random string (min 32 chars) |
| `JWT_EXPIRE` | `7d` | Token expiration (7 days) |
| `ADMIN_CODE` | `<your-secure-admin-code>` | Secret code for admin registration |
| `CORS_ORIGIN` | `*` | Or specify your frontend URL |

**Generate Strong JWT_SECRET:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Online
Visit: https://www.random.org/strings/
Length: 64, Characters: Alphanumeric
```

### 2.4 Deploy
1. Click "Create Web Service"
2. Render will:
   - Clone your repository
   - Install dependencies
   - Start your server
3. Wait 3-5 minutes for deployment
4. Your app will be live at: `https://your-app-name.onrender.com`

---

## Step 3: Verify Deployment

### 3.1 Check Deployment Logs
1. Go to your service dashboard on Render
2. Click on "Logs" tab
3. You should see:
   ```
   🚀 Server running on port 8080
   📍 Environment: production
   ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
   ```

### 3.2 Test API Endpoints

#### Test Root Endpoint
```bash
curl https://your-app-name.onrender.com
```

Expected response:
```json
{
  "success": true,
  "message": "🔐 Access Revocation Management System API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "admin": "/api/admin"
  }
}
```

#### Register an Admin
```bash
curl -X POST https://your-app-name.onrender.com/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "phone": "9876543210",
    "adminCode": "your-admin-code-from-env"
  }'
```

#### Login as Admin
```bash
curl -X POST https://your-app-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

---

## Step 4: Update GitHub README

Once deployed, update your README.md with the live URL:

```markdown
### Live Deployment Links
**GitHub Repository**: https://github.com/LokeshKrishna01/fsd_backend.git
**Backend API**: https://your-app-name.onrender.com
**API Documentation**: https://your-app-name.onrender.com
```

---

## Troubleshooting

### Issue: "MongoDB connection failed"
**Solution**: 
- Verify MongoDB Atlas connection string is correct
- Check database user password
- Ensure IP whitelist includes 0.0.0.0/0
- Database name is included in connection string

### Issue: "Application failed to start"
**Solution**:
- Check Render logs for specific error
- Verify all environment variables are set
- Ensure `package.json` has correct start script

### Issue: "502 Bad Gateway"
**Solution**:
- Service is still deploying (wait 3-5 minutes)
- Check logs for application errors
- Restart the service from Render dashboard

### Issue: "Free instance will spin down with inactivity"
**Note**: Render free tier sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to paid plan for always-on service
- Or use a cron job to ping your API every 10 minutes

---

## Post-Deployment Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Render web service deployed successfully
- [ ] All environment variables set correctly
- [ ] API endpoints tested and working
- [ ] Admin user registered
- [ ] Test user registration and access grant/revoke flow
- [ ] Update README.md with live deployment URL
- [ ] (Optional) Set up custom domain

---

## Render Free Tier Limits

✅ **Included:**
- 750 hours/month (enough for 24/7)
- Automatic HTTPS
- Auto-deploy from GitHub
- Environment variables
- Basic DDoS protection

⚠️ **Limitations:**
- Spins down after 15 min inactivity
- 512 MB RAM
- Shared CPU
- Limited build minutes

For production, consider upgrading to Starter plan ($7/month) for:
- Always-on service
- More RAM and CPU
- Faster deployments

---

## Security Recommendations

🔒 **Before Production:**
1. Change `ADMIN_CODE` to a strong random string
2. Generate a new `JWT_SECRET` (min 64 characters)
3. Set `CORS_ORIGIN` to your frontend domain only
4. Enable MongoDB Atlas IP whitelist for Render IPs only
5. Enable MongoDB Atlas database encryption
6. Set up monitoring and alerts
7. Review error logging (don't expose sensitive data)

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **GitHub Issues**: https://github.com/LokeshKrishna01/fsd_backend/issues

---

**Your backend is ready for deployment!** 🚀
