# Access Revocation Management System (ARMS)

A comprehensive backend system for managing user access with JWT-based authentication, role-based access control (RBAC), and complete audit logging. The system ensures that once access is revoked by an admin, users **cannot self-restore access**.

## 🎯 Project Overview

This system provides a robust access management solution with:

- **Secure Authentication**: JWT-based authentication with HTTP-only cookies
- **Role-Based Access Control**: USER and ADMIN roles with distinct permissions
- **Access Revocation Enforcement**: Real-time database validation ensures revoked users are immediately blocked
- **Immutable Audit Logs**: Complete audit trail of all access-related actions
- **Database Persistence**: All operations persisted in MongoDB

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (ES6 Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

### Key Dependencies
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "cookie-parser": "^1.4.6",
  "express-validator": "^7.0.1"
}
```

## 👥 User Roles and Permissions

### USER Role
✅ Register and create an account  
✅ Log in to the system  
✅ View their current access status  
❌ Cannot grant or revoke access  
❌ Cannot view other users  
❌ **Cannot self-restore revoked access**

### ADMIN Role
✅ Register with admin code  
✅ Log in to the system  
✅ View all users and their access status  
✅ Grant access to pending users  
✅ Revoke access from users  
✅ View complete access history (audit logs)  
✅ Re-grant access to previously revoked users  
❌ Cannot modify other admin accounts

## 🔑 Critical Business Rule

> **⚠️ IMPORTANT**: Once access is revoked by an admin, the user **CANNOT** restore it themselves. The system enforces this through:
> 
> 1. **Database-driven validation**: Every protected API request checks `accessStatus` from the database
> 2. **No self-service endpoints**: Users have no API access to modify their own `accessStatus`
> 3. **Login prevention**: Revoked users are blocked at login with a clear error message
> 4. **JWT invalidation**: Even with a valid JWT, revoked users receive 403 Forbidden on all protected routes
> 5. **Admin-only restoration**: Only admins can call the grant-access endpoint

## 📡 API Endpoints

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user (access: pending) |
| POST | `/register-admin` | Public | Register admin with admin code (access: granted) |
| POST | `/login` | Public | Login with email/password |
| GET | `/me` | Private | Get current user info |
| GET | `/status` | Private | Get current user's access status |
| POST | `/logout` | Private | Logout and clear cookies |

### Admin Endpoints (`/api/admin`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin Only | Get all users with access status |
| GET | `/users/:userId` | Admin Only | Get specific user details |
| POST | `/grant-access/:userId` | Admin Only | Grant access to a user |
| POST | `/revoke-access/:userId` | Admin Only | Revoke user access |
| GET | `/access-history` | Admin Only | Get complete audit log (with filters) |
| GET | `/access-history/:userId` | Admin Only | Get user-specific audit history |

### Request/Response Examples

#### 1. Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully. Awaiting admin approval.",
  "user": {
    "id": "65f8a1b2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user",
    "accessStatus": "pending"
  }
}
```

#### 2. Login (Pending User)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (403)**:
```json
{
  "success": false,
  "message": "Access pending: Awaiting admin approval"
}
```

#### 3. Grant Access (Admin)
```http
POST /api/admin/grant-access/65f8a1b2c3d4e5f6g7h8i9j0
Authorization: Bearer <admin_jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Access granted successfully",
  "user": {
    "id": "65f8a1b2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "accessStatus": "granted",
    "accessGrantedAt": "2026-01-31T09:00:00.000Z",
    "accessGrantedBy": "Admin Name"
  }
}
```

#### 4. Revoke Access (Admin)
```http
POST /api/admin/revoke-access/65f8a1b2c3d4e5f6g7h8i9j0
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "reason": "Policy violation"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Access revoked successfully",
  "user": {
    "id": "65f8a1b2c3d4e5f6g7h8i9j0",
    "name": "John Doe",
    "email": "john@example.com",
    "accessStatus": "revoked",
    "accessRevokedAt": "2026-01-31T10:00:00.000Z",
    "accessRevokedBy": "Admin Name"
  }
}
```

#### 5. Access History
```http
GET /api/admin/access-history?action=revoked&limit=50&page=1
Authorization: Bearer <admin_jwt_token>
```

**Response (200)**:
```json
{
  "success": true,
  "count": 10,
  "total": 10,
  "page": 1,
  "pages": 1,
  "logs": [
    {
      "_id": "65f8a1b2c3d4e5f6g7h8i9j1",
      "userId": {
        "_id": "65f8a1b2c3d4e5f6g7h8i9j0",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user"
      },
      "action": "revoked",
      "performedBy": {
        "_id": "65f8a1b2c3d4e5f6g7h8i9j2",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "ipAddress": "192.168.1.100",
      "metadata": {
        "previousStatus": "granted",
        "newStatus": "revoked",
        "reason": "Policy violation"
      },
      "createdAt": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

## 🗄️ Database Schema

### User Collection
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed, select: false),
  phone: String,
  role: String (enum: ['user', 'admin'], default: 'user'),
  
  // Access Control Fields
  accessStatus: String (enum: ['pending', 'granted', 'revoked'], default: 'pending'),
  accessGrantedAt: Date,
  accessGrantedBy: ObjectId (ref: 'User'),
  accessRevokedAt: Date,
  accessRevokedBy: ObjectId (ref: 'User'),
  
  createdAt: Date,
  updatedAt: Date
}
```

### AccessAudit Collection (Immutable)
```javascript
{
  userId: ObjectId (ref: 'User', required),
  action: String (enum: ['granted', 'revoked', 'login_success', 'login_failed', 'access_denied'], required),
  performedBy: ObjectId (ref: 'User'),  // null for self-initiated actions
  ipAddress: String,
  userAgent: String,
  metadata: Mixed,  // Additional context
  createdAt: Date (immutable)
}
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)

### Installation

1. **Clone/Navigate to the project directory**:
   ```bash
   cd C:\Users\rohit\Downloads\fsd
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Edit the `.env` file:
   ```env
   PORT=8080
   MONGO_URI=mongodb://localhost:27017/access-revocation-db
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_xyz123abc456
   JWT_EXPIRE=7d
   ADMIN_CODE=admin_secret_2026_xyz789
   NODE_ENV=development
   ```

   **Important**: 
   - Change `JWT_SECRET` to a strong random string in production
   - Update `MONGO_URI` with your MongoDB connection string
   - Keep `ADMIN_CODE` secret and change it before deployment

4. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

5. **Run the server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Verify server is running**:
   ```
   Visit: http://localhost:8080
   ```

## 🧪 Testing the System

### Using Postman/Thunder Client/cURL

#### 1. Register an Admin
```bash
curl -X POST http://localhost:8080/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "phone": "9876543210",
    "adminCode": "admin_secret_2026_xyz789"
  }'
```

#### 2. Login as Admin
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```
Save the `token` from the response.

#### 3. Register a Regular User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "user@example.com",
    "password": "user123",
    "phone": "1234567890"
  }'
```

#### 4. Try Login as User (Should Fail - Pending)
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "user123"
  }'
```
Expected: `403 Forbidden - Access pending`

#### 5. Grant Access (As Admin)
```bash
curl -X POST http://localhost:8080/api/admin/grant-access/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -b cookies.txt
```

#### 6. Login as User (Should Succeed)
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c user_cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "user123"
  }'
```

#### 7. Revoke Access (As Admin)
```bash
curl -X POST http://localhost:8080/api/admin/revoke-access/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"reason": "Testing revocation"}'
```

#### 8. Try Accessing Protected Route (Should Fail)
```bash
curl -X GET http://localhost:8080/api/auth/status \
  -b user_cookies.txt
```
Expected: `403 Forbidden - Access revoked`

## 📊 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=<generate-strong-random-secret>
JWT_EXPIRE=7d
ADMIN_CODE=<secure-admin-code>
CORS_ORIGIN=https://your-frontend-domain.com
```

### Deployment Platforms

- **Render**: Connect GitHub repo, set environment variables
- **Railway**: Deploy with `railway up`
- **Cyclic**: Connect GitHub and auto-deploy
- **Heroku**: Use `Procfile` with `web: node server.js`

### Live Deployment Links
**GitHub Repository**: https://github.com/LokeshKrishna01/fsd_backend.git  
**Backend API**: `<To be deployed>`  
**API Documentation**: `<To be deployed>`

## 📝 Project Structure

```
fsd/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── adminController.js   # Admin access management
├── middleware/
│   ├── auth.js             # JWT verification & access validation
│   └── validation.js       # Request validation
├── models/
│   ├── User.js             # User schema with access fields
│   └── AccessAudit.js      # Immutable audit log schema
├── routes/
│   ├── authRoutes.js       # Auth endpoints
│   └── adminRoutes.js      # Admin endpoints
├── utils/
│   └── jwt.js              # Token generation utilities
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies
├── server.js              # Main application entry
└── README.md              # This file
```

## 🔒 Security Features

✅ **Password Hashing**: bcryptjs with salt rounds  
✅ **JWT Authentication**: Secure token-based auth  
✅ **HTTP-Only Cookies**: Prevents XSS attacks  
✅ **Input Validation**: express-validator for all inputs  
✅ **Access Status Validation**: Database check on every request  
✅ **Immutable Audit Logs**: Cannot be modified after creation  
✅ **Role-Based Authorization**: Middleware-enforced RBAC  
✅ **Environment Variables**: Secure configuration management

## 📖 License

ISC

## 👨‍💻 Author

Developed as part of Full Stack Development Assignment

---

**Last Updated**: January 31, 2026
