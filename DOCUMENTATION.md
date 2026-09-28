# Orion PLG Platform - Technical Documentation

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
6. [Authentication & Authorization](#authentication--authorization)
7. [State Management](#state-management)
8. [API Integration](#api-integration)
9. [Real-time Communication](#real-time-communication)
10. [Routing & Navigation](#routing--navigation)
11. [Styling & Theming](#styling--theming)
12. [Environment Configuration](#environment-configuration)
13. [Build & Deployment](#build--deployment)
14. [Development Guidelines](#development-guidelines)
15. [Troubleshooting](#troubleshooting)

---

## 📖 Project Overview

**Orion PLG (Product-Led Growth)** is a comprehensive React-based platform designed to manage and optimize order processing, personnel shifts, handovers, and performance tracking in a global, 24x7 support environment.

### Key Capabilities

- **Global Order Management**: FIFO-based order processing with dynamic reprioritization
- **Follow-the-Sun Operations**: Philippines → India → Estonia → Argentina → Philippines
- **Real-time Collaboration**: WebSocket-based live updates and notifications
- **Performance Tracking**: Comprehensive analytics and reporting
- **Multi-tenant Support**: Workspace-based isolation with role-based access control

### Applications (Monorepo)

| Package | NPM workspace | Purpose | PWA |
|---------|---------------|---------|-----|
| **Internal** | `@orion/internal` | Main PLG operations UI (orders, kanban, settings, dashboards) | Yes |
| **Branding portal** | `@orion/branding-portal` | Public branding guidelines preview | No |
| **Shared** | `@orion/shared` | Cross-app components, API client, icons, fonts, hooks | — |

Unless noted otherwise, paths like `src/pages/...` in this document refer to **`apps/internal/src/`**.

---

## 🏗️ Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐       │
│  │   React UI   │  │  State Mgmt  │  │   Routing     │       │
│  │  Components  │  │   (Context)  │  │ (React Router)│       │
│  └──────────────┘  └──────────────┘  └───────────────┘       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Azure MSAL (B2B & B2C)                              │   │
│  │  - Token Management                                  │   │
│  │  - Session Handling                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                    Communication Layer                     │
│  ┌──────────────┐                 ┌──────────────┐         │
│  │  HTTP/REST   │                 │  WebSocket   │         │
│  │  (Axios)     │                 │  (Real-time) │         │
│  └──────────────┘                 └──────────────┘         │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                      Backend Services                      │
│  ┌──────────────┐                 ┌──────────────┐         │
│  │  PLG API     │                 │ Notification │         │
│  │  Gateway     │                 │   Service    │         │
│  └──────────────┘                 └──────────────┘         │
└────────────────────────────────────────────────────────────┘
```

### Component Architecture

Internal app source layout (`apps/internal/src/`):

```
apps/internal/src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components (buttons, inputs, modals)
│   ├── kanban/         # Kanban board specific components
│   └── layout/         # Layout components (header, footer, sidenav)
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── services/           # API service layer (extends @orion/shared)
├── store/              # State management (Context + Reducers)
├── utils/              # Utility functions
└── styles/             # App SCSS (vendor + pages; icons in @orion/shared)
```

Shared library (`packages/shared/src/`) provides Toast, Spinner, `plgBaseAPI`, IcoMoon fonts, and other cross-app modules consumed via the `@orion/shared` alias.

---

## 🛠️ Tech Stack

### Frontend Framework
- **React 18.2.0** - UI library
- **React Router DOM 6.14.1** - Client-side routing
- **Vite 8.x** - Dev server and production bundler (replaces Create React App / Webpack)
- **@vitejs/plugin-react-swc** - Fast React refresh and JSX transform

### Authentication
- **@azure/msal-browser 2.39.0** - Microsoft Authentication Library
- **@azure/msal-react 1.5.13** - React wrapper for MSAL

### State Management
- **React Context API** - Global state management
- **Custom Reducers** - State update logic

### UI Components & Styling
- **Bootstrap 5.3.3** - CSS framework
- **React Bootstrap 2.10.6** - Bootstrap components for React
- **SCSS/Sass 1.89.2** - CSS preprocessor
- **@euroland/react 3.0.2** - Custom component library

### Data Handling
- **Axios 1.5.0** - HTTP client
- **@tanstack/react-table 8.20.5** - Table management
- **@tanstack/react-virtual 3.10.9** - Virtual scrolling

### Rich Text & Forms
- **Quill 1.3.7** - Rich text editor
- **React Quill 2.0.0** - React wrapper for Quill
- **React Datetime 3.2.0** - Date/time picker

### Workflow & Visualization
- **ReactFlow 11.11.4** - Flow diagram library
- **Dagre 0.8.5** - Graph layout engine

### Utilities
- **i18next 23.16.8** - Internationalization
- **react-i18next 14.1.3** - React bindings for i18next
- **Lodash 4.17.21** - Utility library
- **DayJS 1.11.13** - Date manipulation
- **Moment 2.30.1** - Date/time library
- **DOMPurify 3.2.2** - XSS sanitization

### Build & Optimization
- **PostCSS** + **Autoprefixer** - CSS processing
- **PurgeCSS 7.0.2** - Production-only unused CSS removal (app SCSS only; vendor CSS excluded)
- **Lightning CSS** (via Vite) - Minification with legacy vendor tolerance
- **env-cmd 10.1.0** - Environment variable management for dev/build
- **gzip-all 1.0.0** - Post-build asset compression
- **rollup-plugin-visualizer** - Interactive bundle treemap (`npm run analyze:*`)
- **vite-plugin-pwa** + **Workbox** - Service worker and offline caching (**internal app only**)

---

## 📁 Project Structure

```
orion-plg/                              # NPM workspaces root
├── apps/
│   ├── internal/                       # Main PLG app (@orion/internal)
│   │   ├── index.html                  # Vite HTML entry (replaces public/index.html)
│   │   ├── vite.config.js              # Vite + PWA + manual chunks
│   │   ├── postcss.config.js           # → postcss/createAppPostcssConfig.cjs
│   │   ├── public/
│   │   │   ├── env-config.js           # Runtime config (overwritten in Docker)
│   │   │   └── manifest.json           # PWA manifest (internal only)
│   │   ├── build/                      # Production output (served by nginx)
│   │   └── src/                        # Application source (see Component Architecture)
│   │
│   └── branding-portal/                # Branding guidelines app (@orion/branding-portal)
│       ├── index.html
│       ├── vite.config.js
│       ├── postcss.config.js
│       ├── public/
│       └── src/
│
├── packages/
│   └── shared/                         # @orion/shared
│       └── src/
│           ├── components/             # Toast, Spinner, shared inputs, branding UI
│           ├── hooks/                  # useToast, useGlobalMaster, …
│           ├── services/               # plgBaseAPI, logger
│           └── styles/
│               ├── icons/              # IcoMoon font (single source — see README there)
│               ├── fonts/              # Inter
│               └── variables.scss
│
├── postcss/
│   └── createAppPostcssConfig.cjs      # Shared PurgeCSS factory for both apps
├── vite/
│   └── createAnalyzePlugin.cjs         # rollup-plugin-visualizer when ANALYZE=true
│
├── server-conf/default.conf            # nginx SPA + static files
├── docker-entrypoint.sh                # Injects env-config.js at container start
├── Dockerfile                          # nginx image; COPY apps/<app>/build
│
├── .env.testing                        # Default for `npm run start:internal`
├── .env.analyze                        # ANALYZE=true for bundle reports
├── .env.development / .env.beta / …    # Per-environment builds (via env-cmd)
├── package.json                        # Workspace scripts (start/build/analyze)
└── DOCUMENTATION.md                    # This file
```

**Path aliases (internal `vite.config.js`):** `styles`, `pages`, `components`, `hooks`, `services`, `store`, `utils`, `assets`, `constant`, `authConfig`, and `@orion/shared` → `packages/shared`.

---

## 🎯 Core Features

### 1. Order Processing Workflow

#### FIFO-based Processing
- Orders processed in First-In-First-Out sequence
- Dynamic reprioritization for priority customers
- Parallel tool processing within each order

#### Global Follow-the-Sun Operations
```
Philippines (UTC+8) → India (UTC+5:30) → Estonia (UTC+2) → Argentina (UTC-3) → Philippines
```

#### Task Management
- Task assignment and reassignment
- Handover note tracking
- Status transitions with audit trail

**Key Components:**
- `src/components/kanban/KanbanBoard.jsx` - Main board view
- `src/components/kanban/KanbanCard.jsx` - Individual order cards
- `src/components/kanban/KanbanColumn.jsx` - Status columns
- `src/pages/OrderOrion/` - Order management pages

**Detailed guide:** [Orders: Create and Complete](docs/orders-create-and-complete.md) — create drawer, multi-step enrichment, Process Order handoff, and completion status.

### 2. Personnel Activity & Shift Management

#### Activity Tracking
- Active log tracking to indicate online/offline state
- Idle and waiting periods
- Active task listing with work hours

#### Performance Metrics
- Actual vs Expected work hours
- Staff utilization analysis
- Task completion rates

**Key Components:**
- `src/components/common/WorkAllocation.jsx` - Work assignment
- `src/components/kanban/AssignMember.jsx` - Member assignment

### 3. Handover & Communication

#### Handover Interface
- Leave handover notes
- View historical handovers
- Communicate next steps
- Identify next assignees

#### Features
- Rich text editor for detailed notes
- File attachments support
- @mentions for team members
- Timestamped transitions

**Key Components:**
- `src/components/common/RichTextEditor/` - Rich text editing
- `src/components/common/AttachmentUpload.jsx` - File uploads

### 4. Order Requirements Intake (PLG Form)

#### Intake Process
- Detailed order metadata capture
- Tool requirements specification
- Delivery timeline definition
- Approval workflow

#### Validation
- Required field enforcement
- Data validation rules
- Approval gates before processing

**Key Components:**
- `src/pages/OrderOrion/Ticket/Form.jsx` - Order intake form
- `src/components/common/Dynamic/` - Dynamic form fields

---

## 🔐 Authentication & Authorization

### Authentication Providers

The application supports two authentication methods via Azure MSAL:

#### 1. B2B (Organization) Authentication
```javascript
// Configuration in src/authConfig.js
export const msalConfigORG = {
  auth: {
    clientId: REACT_APP_PLG_B2B_CLIENT_ID,
    authority: REACT_APP_MSAL_AUTHORITY_URL,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  }
};
```

#### 2. B2C (Consumer) Authentication
```javascript
export const msalConfigB2C = {
  auth: {
    clientId: REACT_APP_PLG_B2C_CLIENT_ID,
    authority: REACT_APP_MSAL_B2C_AUTHORITY_URL,
    knownAuthorities: [REACT_APP_MSAL_B2C_KNOWN_AUTHORITIES],
    redirectUri: window.location.origin,
  }
};
```

### Authentication Flow

```
┌─────────────┐
│   User      │
│  Accesses   │
│    App      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Check Authentication       │
│  (useIsAuthenticated)       │
└──────┬──────────────────────┘
       │
       ├─── Not Authenticated ──► Redirect to Login
       │
       └─── Authenticated ──────► Acquire Token
                                   │
                                   ▼
                          ┌────────────────────┐
                          │  Token Available?  │
                          └────────┬───────────┘
                                   │
                          ├─── Yes ──► Continue
                          │
                          └─── No ──► Silent Token Refresh
                                      │
                                      ├─── Success ──► Continue
                                      │
                                      └─── Fail ──► Interactive Login
```

### Token Management

**Location:** `src/hooks/useAuth.js`

```javascript
// Auto-refresh token on expiry
useLayoutEffect(() => {
  if (authState?.activeUser?.data && !authState?.activeUser?.data.accessToken) {
    acquireTokenWithFallback(activeInstance, accounts[0], activeLoginRequest)
      .then((response) => {
        setAuth(response.accessToken);
        setExpiresOn(response.idTokenClaims.exp);
      })
      .catch((error) => {
        // Handle token refresh failure
        logoutUser();
      });
  }
}, [authState]);
```

### Authorization Levels

1. **Super Admin** (`isSuperAdmin: true`)
   - Full system access
   - Workspace management
   - Workflow configuration
   - User management

2. **Admin** (`user_type_code: "ADM"`)
   - Workspace-level administration
   - User management within workspace
   - Settings access

3. **Regular User**
   - Order management
   - Task execution
   - Personal settings

### Protected Routes

```javascript
// apps/internal/src/App.jsx
{(isSuperAdmin || isAdmin) && (
  <>
    <Route path="users" element={<SettingsHome />}>
      <Route index path="general" element={<WorkSpaceUser />} />
      <Route path="admin" element={<WorkspaceAdmin />} />
      <Route path="inActive" element={<InActiveUser />} />
    </Route>

    {isSuperAdmin && (
      <Route path="master" element={<SettingsHome />}>
        <Route path="workspace" element={<WorkSpaceManagement />} />
        <Route path="workflow" element={<WorkFlowManagement />} />
      </Route>
    )}
  </>
)}
```

### Session Management

**Session Expiry Handling:**
```javascript
// src/services/plgBaseAPI.js - Response Interceptor
axiosBase.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isSessionExpired) {
      isSessionExpired = true;
      
      // Clear user state
      logoutUserFn();
      setAuthFn("");
      setExpiresOn("");
      
      // Redirect to login
      await msalInstance.logoutPopup({
        postLogoutRedirectUri: "/",
      });
    }
    return Promise.reject(error);
  }
);
```

---

## 🗄️ State Management

### Global State Architecture

The application uses **React Context API** with a reducer pattern for centralized state management.

**Location:** `src/store/context/GlobalProvider.jsx`

### State Structure

```javascript
const initialState = {
  authState: initialAuthState,              // User authentication
  toastState: initialToastState,            // Toast notifications
  orderListState: initialOrderListState,    // Order management
  filterState: initialFilterState,          // Filter values
  workSpaceFilterState: initialWorkSpaceFilterState,
  masterState: masterDataState,             // Master data
  orderCountState: initialOrderCountState,  // Order counts
  workspaceState: initialWorkspaceState,    // Workspace data
  notificationState: initialNotificationState,
  companySearchState: initialCompanySearchState,
  ticketDetails: initialTicketDetailState, // Ticket details
  taskDetails: initialTaskDetailState,      // Task details
  activeCommentsTab: initialActiveCommentsTabState,
  instrumentData: initialInstrumentState,
  attachmentData: initialAttachmentState,
  brandingAttachmentData: initialBrandingAttachmentState,
  userBoardPermission: initialUserBoardPermission,
  workSpaceUserList: initialUserListState,
};
```

### Reducers

Each state slice has its own reducer:

```javascript
// src/store/reducers/authReducer.js
export const authReducer = (state = initialAuthState, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: true };
    
    case "SET_AUTH":
      return {
        ...state,
        activeUser: { data: { ...state.activeUser.data, accessToken: action.payload } },
        loading: false,
      };
    
    case "SET_USER_DETAILS":
      return {
        ...state,
        activeUser: { data: { ...state.activeUser.data, details: action.payload } },
        loading: false,
      };
    
    case "LOGOUT":
      return initialAuthState;
    
    default:
      return state;
  }
};
```

### Using Global State

```javascript
// In any component
import { useGlobalContext } from 'store/context/GlobalProvider';

function MyComponent() {
  const { authState, orderListState, dispatch } = useGlobalContext();
  
  // Read state
  const user = authState?.activeUser?.data?.details;
  
  // Update state
  const updateOrders = (newOrders) => {
    dispatch({ 
      type: 'SET_ORDERS', 
      payload: newOrders 
    });
  };
  
  return <div>{user?.name}</div>;
}
```

### Custom Hooks for State

**useAuth Hook:**
```javascript
// src/hooks/useAuth.js
const useAuth = () => {
  const { authState, dispatch } = useGlobalContext();
  
  const setAuth = useCallback((token) => {
    dispatch({ type: "SET_AUTH", payload: token });
  }, [dispatch]);
  
  const getUserInfoData = useCallback(async (params) => {
    dispatch({ type: "SET_USER_DETAILS_LOADING" });
    try {
      const res = await getUserInfo(params);
      dispatch({ type: "SET_USER_DETAILS", payload: res.data });
    } catch (error) {
      dispatch({ type: "SET_USER_DETAILS_ERROR", payload: error });
    }
  }, [dispatch]);
  
  return [
    { data: authState?.activeUser?.data, loading: authState.loading },
    { setAuth, getUserInfoData, logoutUser }
  ];
};
```

**useToast Hook:**
```javascript
// src/hooks/useToast.js
const useToast = () => {
  const { toastState, dispatch } = useGlobalContext();
  
  const showToast = ({ message, variant = 'info' }) => {
    dispatch({
      type: 'SHOW_TOAST',
      payload: { message, variant, show: true }
    });
  };
  
  const hideToast = () => {
    dispatch({ type: 'HIDE_TOAST' });
  };
  
  return { showToast, hideToast, toastState };
};
```

---

## 🌐 API Integration

### Base API Configuration

**Location:** `src/services/plgBaseAPI.js`

### Axios Instance Setup

```javascript
import axios from "axios";
import Config from "../config";

export const axiosBase = axios.create({
  baseURL: Config.plgBaseUrl,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});
```

### Request Interceptor

**Features:**
- Automatic token injection
- Workspace ID header
- User type header
- Request deduplication

```javascript
axiosBase.interceptors.request.use(
  async (config) => {
    // Wait for token to be available
    const token = await waitForToken();
    
    // Add authorization header
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      config.headers["User-From-Frontend"] = "true";
    }
    
    // Add workspace header
    if (issetActiveWorkSpace()) {
      config.headers["WorkspaceId"] = getActiveWorkSpace();
    }
    
    // Add user type header
    if (issetAuthType()) {
      config.headers["UserType"] = getAuthType();
    }
    
    // Request deduplication
    const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
    if (requestTracker[requestKey]) {
      return Promise.resolve(requestTracker[requestKey]);
    }
    
    requestTracker[requestKey] = axiosBase(config);
    return config;
  }
);
```

### Response Interceptor

**Features:**
- Request tracker cleanup
- 401 error handling (session expiry)
- Automatic logout on authentication failure

```javascript
axiosBase.interceptors.response.use(
  (response) => {
    // Clean up request tracker
    const requestKey = `${response.config.method}-${response.config.url}`;
    delete requestTracker[requestKey];
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !isSessionExpired) {
      isSessionExpired = true;
      
      logoutUserFn();
      toastFn({ message: "Session expired", variant: "danger" });
      
      await msalInstance.logoutPopup({
        postLogoutRedirectUri: "/",
      });
    }
    
    return Promise.reject(error);
  }
);
```

### API Request Methods

```javascript
// GET request
export const request = async (method, path, httpParams, body) => {
  switch (method) {
    case 'GET':
      return axiosBase.get(path, { params: httpParams })
        .then(response => processResponseData("success", path, response))
        .catch(error => {
          processResponseData("failure", path, error);
          throw error;
        });
    
    case 'POST':
      return axiosBase.post(path, body, { params: httpParams });
    
    case 'PUT':
      return axiosBase.put(path, body, { params: httpParams });
    
    case 'DELETE':
      return axiosBase.delete(path, { data: body, params: httpParams });
  }
};
```

### File Upload Handler

```javascript
export const doFileUpload = async (url, params) => {
  const formData = new FormData();
  
  // Append files
  if (Array.isArray(params[0].files)) {
    params[0].files.forEach((file) => {
      formData.append("files", file);
    });
  }
  
  // Append metadata
  formData.append("module", params[0].body.module);
  formData.append("referenceId", params[0].body.referenceId);
  
  const token = AppStore?.authState?.activeUser?.data?.accessToken;
  
  return axios.post(url, formData, {
    baseURL: Config.plgBaseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      "User-From-Frontend": true,
      Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
};
```

### File Download Handler

```javascript
export const doFileDownload = async (path, httpParams, body) => {
  return axiosBase.get(path, {
    params: httpParams,
    responseType: "blob",
  }).then((res) => {
    const blob = new Blob([res.data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", body?.fileName || "downloaded_file");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
};
```

### Service Layer

**Location:** `src/services/index.js`

```javascript
import API from './plgBaseAPI';

// User services
export const getUserInfo = (params) => API.GET('/User/api/UserManagement/user-info', params);
export const getUserDetailsById = (params) => API.GET('/User/api/UserManagement/user-details', params);
export const logout = () => API.POST('/Auth/api/Authentication/logout');

// Order services
export const getOrderList = (params) => API.GET('/Order/api/OrderManagement/orders', params);
export const createOrder = (body) => API.POST('/Order/api/OrderManagement/create', body);
export const updateOrder = (body) => API.PUT('/Order/api/OrderManagement/update', body);

// Workspace services
export const getWorkspaces = () => API.GET('/Workspace/api/WorkspaceManagement/list');
export const createWorkspace = (body) => API.POST('/Workspace/api/WorkspaceManagement/create', body);
```

---

## 🔌 Real-time Communication

### WebSocket Integration

**Location:** `src/store/context/SocketProvider.jsx`

### Connection Setup

```javascript
const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const [{ data: auth }] = useAuth();
  const regId = auth?.details?.regId;
  
  useEffect(() => {
    if (!regId) return;
    
    const connect = () => {
      const wsUrl = `${Config.socketUrl}?regid=${regId}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.payload?.subject === "KANBAN_UPDATE") {
          handleKanbanUpdate(JSON.parse(data.payload.messageJson));
        } else {
          setLastMessage(data);
        }
      };
      
      socket.onclose = () => {
        console.warn("WebSocket disconnected. Reconnecting...");
        setIsConnected(false);
        setTimeout(connect, 2000);
      };
      
      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    };
    
    connect();
    
    return () => {
      socketRef.current?.close();
    };
  }, [regId]);
  
  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, lastMessage }}>
      {children}
    </SocketContext.Provider>
  );
};
```

### Real-time Updates

#### Kanban Board Updates

```javascript
const handleKanbanUpdate = (tickets) => {
  setLoading(true);
  
  tickets.forEach((ticketItem) => {
    const { action, level, data } = ticketItem;
    
    dispatch({
      type: "UPDATE_KANBAN_TICKETS",
      payload: {
        actionType: action,  // 'CREATE', 'UPDATE', 'DELETE'
        level: level,        // 'TICKET', 'TASK', 'SUBTASK'
        ...data
      },
    });
  });
  
  setTimeout(() => setLoading(false), 800);
};
```

#### Message Types

1. **KANBAN_UPDATE**
   - Ticket creation
   - Status changes
   - Assignment updates
   - Task updates

2. **NOTIFICATION**
   - New notifications
   - Mentions
   - System alerts

3. **USER_STATUS**
   - Online/offline status
   - Activity updates

### Using WebSocket in Components

```javascript
import { useContext } from 'react';
import { SocketContext } from 'store/context/SocketProvider';

function MyComponent() {
  const { socket, isConnected, lastMessage } = useContext(SocketContext);
  
  useEffect(() => {
    if (lastMessage?.type === 'NOTIFICATION') {
      // Handle notification
      showNotification(lastMessage.data);
    }
  }, [lastMessage]);
  
  return (
    <div>
      Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

---

## 🧭 Routing & Navigation

### Router Configuration

**Location:** `apps/internal/src/App.jsx`

```javascript
import { Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<UserLayout />}>
          {/* Home/Orders */}
          <Route path="orders/*" element={<HomePage />}>
            <Route path="details/:orderId" element={<OrderView />} />
            <Route path="update/:id" element={<OrderOrionForm />} />
          </Route>
          
          {/* Admin Routes */}
          {(isSuperAdmin || isAdmin) && (
            <Route path="users" element={<SettingsHome />}>
              <Route path="general" element={<WorkSpaceUser />} />
              <Route path="admin" element={<WorkspaceAdmin />} />
              <Route path="inActive" element={<InActiveUser />} />
            </Route>
          )}
          
          {/* Super Admin Only */}
          {isSuperAdmin && (
            <Route path="master" element={<SettingsHome />}>
              <Route path="workspace" element={<WorkSpaceManagement />} />
              <Route path="workflow" element={<WorkFlowManagement />} />
            </Route>
          )}
          
          {/* Fallback */}
          <Route path="access-required" element={<AccessRequired />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
```

### Route Structure

```
/                           → Login page
/orders                     → Order list (Kanban board)
/orders/details/:orderId    → Order detail view
/orders/update/:id          → Edit order form
/users/general              → General users (Admin+)
/users/admin                → Admin users (Admin+)
/users/inActive             → Inactive users (Admin+)
/master/workspace           → Workspace management (SuperAdmin)
/master/workflow            → Workflow management (SuperAdmin)
/access-required            → No workspace access page
/*                          → 404 Not Found
```

### Lazy Loading

All route components are lazy-loaded for better performance:

```javascript
const HomePage = lazy(() => import("pages/HomePage/index"));
const OrderOrionForm = lazy(() => import("pages/OrderOrion/Ticket/Form"));
const SettingsHome = lazy(() => import("pages/Settings"));
```

### Navigation Guards

```javascript
// Check workspace access
const hasWorkspaces = 
  data?.details?.workspaceDTO?.length > 0 &&
  data?.details?.workspaceDTO[0]?.boardList?.length > 0;

// Redirect if no access
useEffect(() => {
  if (location.pathname === "/access-required" && hasWorkspaces) {
    navigate("/orders");
  }
}, [hasWorkspaces]);
```

### Programmatic Navigation

```javascript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleOrderClick = (orderId) => {
    navigate(`/orders/details/${orderId}`);
  };
  
  const goBack = () => {
    navigate(-1);
  };
  
  return <button onClick={handleOrderClick}>View Order</button>;
}
```

---

## 🎨 Styling & Theming

### SCSS architecture (Vite)

Styles are split so **PurgeCSS only scans application SCSS** in production. Vendor CSS is never purged.

| Layer | File | Purged in prod? |
|-------|------|-----------------|
| Vendor | `apps/internal/src/styles/vendor.scss` | No |
| Icons | `@orion/shared/src/styles/icons/style.scss` | No |
| App | `apps/internal/src/styles/index.scss` | Yes |

Load order in `apps/internal/src/App.jsx`:

```javascript
import "styles/vendor.scss";
import "@orion/shared/src/styles/icons/style.scss";
import "styles/index.scss";
```

Icons must be imported from `App.jsx` (not only `index.scss`) so Vite resolves font URLs under `packages/shared/src/styles/icons/fonts/`.

**IcoMoon updates:** single source at `packages/shared/src/styles/icons/` — see `README.md` in that folder.

### CSS Variables

**Location:** `apps/internal/src/styles/variables.scss` (app) and `packages/shared/src/styles/variables.scss` (shared)

```scss
// Fonts
$fontInter: "Inter";
$fontSans: "Public Sans";
$baseFont: var(--default-font);

// Colors
$color-white: var(--color-white);
$color-black: var(--color-black);
$color-primary: var(--color-primary);
$color-blue: var(--color-blue);
$color-red: var(--color-red);
$color-green: var(--color-dark-green);
$color-gray: var(--color-gray);

// Component-specific colors
$color-primary-light-1: var(--color-primary-light-1);
$color-primary-dark: var(--color-primary-dark);
```

### Global Styles

```scss
body {
  margin: 0;
  font-family: $baseFont;
  font-size: 13px;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
    background-color: var(--color-light-light-gray);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: var(--color-oldSilver);
  }
}
```

### Component Styles

**Structure:**
```
apps/internal/src/styles/
├── vendor.scss              # Third-party CSS (not purged)
├── index.scss               # App components + pages (purged in prod)
├── variables.scss
├── components/
└── pages/
```

### Bootstrap integration

Bootstrap 5.3.3 is loaded from `vendor.scss`. React-Bootstrap components use prop-based APIs (e.g. `<Col md={3}>`); PurgeCSS must not strip Bootstrap utility classes — that is why vendor CSS is excluded from purging.

Vite resolves `~bootstrap` via alias in `vite.config.js`.

### Dynamic Theme Loading

**Location:** `src/utils/loadCSS.js`

```javascript
export const loadVariableStyles = () => {
  // Load CSS variables from external source
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/path/to/theme.css';
  document.head.appendChild(link);
};
```

### Utility Classes

```scss
// Input validation
.input-error {
  border: 1px solid red !important;
}

// Required field indicator
.mandatory {
  margin-left: 3px;
  color: $color-light-red;
}
```

---

## ⚙️ Environment Configuration

### Environment Files

The project supports multiple environments:

```
.env                      # Default/fallback values
.env.development         # Development environment
.env.testing             # Testing environment (default for npm run start:internal)
.env.beta                # Beta/staging environment
.env.production          # Production environment
.env.production.clone    # Production clone
.env.analyze             # ANALYZE=true — bundle visualizer builds only
```

### Environment Variables

#### Authentication (B2B/Organization)
```bash
REACT_APP_PLG_B2B_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_MSAL_AUTHORITY_URL=https://login.microsoftonline.com/[tenant-id]
REACT_APP_MSAL_API_SCOPE=api://[api-id]/Api.Read
```

#### Authentication (B2C/Consumer)
```bash
REACT_APP_PLG_B2C_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REACT_APP_MSAL_B2C_AUTHORITY_URL=https://[tenant].b2clogin.com/[tenant].onmicrosoft.com/[policy]
REACT_APP_MSAL_B2C_KNOWN_AUTHORITIES=https://[tenant].b2clogin.com
REACT_APP_MSAL_B2C_API_SCOPE=https://[tenant].onmicrosoft.com/[app-id]/b2c.api.read.react
```

#### API Configuration
```bash
PORT=3000
REACT_APP_MODE=development
REACT_APP_PLG_API_BASE_URL=https://plg-gateway-dev.euroland.com/ELOrion/
REACT_APP_SOCKET_URL=wss://plg-api-notification-dev.euroland.com/ws
```

### Runtime Configuration

**Location:** `apps/internal/public/env-config.js` (and branding portal equivalent)

This file allows environment variables to be injected at runtime (useful for Docker deployments):

```javascript
window._env_ = {
  REACT_APP_PLG_B2B_CLIENT_ID: "runtime-value",
  REACT_APP_PLG_API_BASE_URL: "https://api.example.com",
  // ... other variables
};
```

### Accessing Environment Variables

```javascript
// In code
const apiUrl = window._env_?.REACT_APP_PLG_API_BASE_URL || 
               process.env.REACT_APP_PLG_API_BASE_URL;

// In config file
import Config from './config';

export default {
  plgBaseUrl: window._env_?.REACT_APP_PLG_API_BASE_URL || 
              process.env.REACT_APP_PLG_API_BASE_URL,
  socketUrl: window._env_?.REACT_APP_SOCKET_URL || 
             process.env.REACT_APP_SOCKET_URL,
  mode: process.env.REACT_APP_MODE,
};
```

### Configuration Object

**Location:** `src/config/index.js`

```javascript
const Config = {
  plgBaseUrl: window._env_?.REACT_APP_PLG_API_BASE_URL || 
              process.env.REACT_APP_PLG_API_BASE_URL,
  socketUrl: window._env_?.REACT_APP_SOCKET_URL || 
             process.env.REACT_APP_SOCKET_URL,
  mode: process.env.REACT_APP_MODE,
  log: process.env.REACT_APP_MODE === 'development',
  trackHttpResponseInConsole: process.env.REACT_APP_MODE === 'development',
  trackHttpTimeInConsole: false,
};

export default Config;
```

---

## 🚀 Build & Deployment

### NPM scripts (workspace root)

```json
{
  "scripts": {
    "start:internal": "npm start -w @orion/internal",
    "start:branding": "npm start -w @orion/branding-portal",
    "build:internal": "npm run build -w @orion/internal && gzip-all \"apps/internal/build/**/*.{...}\"",
    "build:branding": "npm run build -w @orion/branding-portal && gzip-all \"apps/branding-portal/build/**/*.{...}\"",
    "analyze:internal": "env-cmd -f .env.analyze npm run build -w @orion/internal",
    "analyze:branding": "env-cmd -f .env.analyze npm run build -w @orion/branding-portal",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,css,scss,json,md}\""
  }
}
```

Per-app scripts (`apps/internal/package.json`):

```json
{
  "start": "env-cmd -f ../../.env.testing vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Environment-specific production builds (run from repo root, same pattern as before):

```bash
env-cmd -f .env.production npm run build -w @orion/internal
env-cmd -f .env.beta npm run build -w @orion/internal
# … .env.development, .env.testing, .env.production.clone
```

### Development

```bash
# Install all workspace dependencies (include devDependencies for Vite)
npm install --include=dev

# Internal app (default .env.testing, port 3000)
npm run start:internal

# Branding portal
npm run start:branding

# Preview production build locally
npm run build -w @orion/internal
npm run preview -w @orion/internal
```

> **Note:** If `NODE_ENV=production` is set globally, run `npm install --include=dev` so Vite and plugins are installed.

### Production build

```bash
npm run build:internal
npm run build:branding
```

`build:internal` / `build:branding` run Vite, then **gzip-all** on static assets under each app’s `build/` folder.

### Bundle analysis

Replaces the former **webpack-bundle-analyzer** (Webpack-only). Uses **rollup-plugin-visualizer** when `ANALYZE=true` (`.env.analyze`):

```bash
npm run analyze:internal    # → apps/internal/build/stats.html (opens in browser)
npm run analyze:branding    # → apps/branding-portal/build/stats.html
```

Analyze builds enable **source maps** for accurate module sizing. PWA assets are still generated but the report focuses on JS/CSS chunks.

### Build output (Vite)

```
apps/internal/build/
├── index.html
├── manifest.json
├── env-config.js
├── sw.js                    # Service worker (internal PWA only)
├── workbox-*.js
├── static/
│   ├── index-[hash].js
│   ├── vendor-react-[hash].js
│   ├── vendor-msal-[hash].js
│   ├── index-[hash].css
│   └── …                    # fonts, images, lazy route chunks
└── stats.html               # only after npm run analyze:internal
```

Manual chunks in `vite.config.js`: `vendor-react`, `vendor-msal`, `vendor-bootstrap` (internal).

### Progressive Web App (internal only)

- **Manifest:** `apps/internal/public/manifest.json`
- **Plugin:** `vite-plugin-pwa` (Workbox `generateSW`)
- **Registration:** `virtual:pwa-register` in `apps/internal/src/index.jsx` (production only, `autoUpdate`)
- **Runtime:** SPA fallback to `index.html`; `/api/*` and `/env-config.js` excluded from navigation fallback
- **Branding portal:** no service worker, no web app manifest link

Verify after build: Chrome DevTools → **Application** → Service Workers / Manifest.

### Docker deployment

The image is **nginx-only**; the app must be built on the host or in CI before `docker build`.

**Dockerfile** (simplified):

```dockerfile
FROM nginx:1.24.0-alpine
ARG BUILD_PATH=apps/internal/build
COPY ${BUILD_PATH}/ /usr/share/nginx/html
COPY server-conf/ /etc/nginx/conf.d
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

**Typical flow:**

```bash
# 1. Build static assets
env-cmd -f .env.production npm run build:internal

# 2. Build image (defaults to internal build output)
docker build -t orion-plg:latest .

# Branding portal image
npm run build:branding
docker build --build-arg BUILD_PATH=apps/branding-portal/build -t orion-branding:latest .

# 3. Run with runtime env (entrypoint writes env-config.js)
docker run -p 80:80 \
  -e REACT_APP_PLG_API_BASE_URL=https://api.example.com \
  -e REACT_APP_SOCKET_URL=wss://notifications.example.com/ws \
  orion-plg:latest
```

### Nginx Configuration

**Location:** `server-conf/default.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Build optimization

**PostCSS** — each app’s `postcss.config.js` delegates to `postcss/createAppPostcssConfig.cjs`:

- **Autoprefixer** on all CSS
- **PurgeCSS** only when `NODE_ENV=production` and the file is app SCSS (not `vendor.scss`, `node_modules`, shared icons/fonts, or Euroland packages)
- **Safelist** for Quill, React Flow, react-datetime runtime classes

**Vite** — `manualChunks` for large vendors; `css.lightningcss.errorRecovery` for legacy Bootstrap/Euroland rules; SVGs and assets emitted under `build/static/`.

### Performance optimization

1. **Code splitting** — `React.lazy` routes in `App.jsx`; vendor chunks in `vite.config.js`
2. **CSS** — PurgeCSS on app SCSS only; vendor CSS shipped in full
3. **Assets** — gzip-all after build; hashed filenames for cache busting
4. **PWA (internal)** — Workbox precache + stale-while-revalidate for images/fonts; `env-config.js` included in precache for Docker runtime config

---

## 👨‍💻 Development Guidelines

### Code Organization

#### Component Structure
```javascript
// MyComponent.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './MyComponent.scss';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.title - Title text
 * @param {Function} props.onAction - Action callback
 */
const MyComponent = ({ title, onAction }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onAction: PropTypes.func,
};

MyComponent.defaultProps = {
  onAction: () => {},
};

export default MyComponent;
```

#### Custom Hook Pattern
```javascript
// useCustomHook.js
import { useState, useEffect, useCallback } from 'react';

const useCustomHook = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiCall();
      setValue(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { value, loading, error, refetch: fetchData };
};

export default useCustomHook;
```

### Naming Conventions

#### Files & Folders
- **Components:** PascalCase (e.g., `UserProfile.jsx`)
- **Hooks:** camelCase with 'use' prefix (e.g., `useAuth.js`)
- **Utils:** camelCase (e.g., `formatDate.js`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.js`)
- **Styles:** kebab-case (e.g., `user-profile.scss`)

#### Variables & Functions
```javascript
// Constants
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// Variables
const userName = 'John Doe';
const isActive = true;
const userList = [];

// Functions
const getUserById = (id) => { /* ... */ };
const handleSubmit = (event) => { /* ... */ };

// Components
const UserCard = () => { /* ... */ };
const NavigationBar = () => { /* ... */ };

// Boolean variables/functions
const isLoading = false;
const hasPermission = true;
const canEdit = () => { /* ... */ };
```

### State Management Best Practices

#### Local State
```javascript
// Use for component-specific state
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({});
```

#### Global State
```javascript
// Use for shared state across components
const { authState, dispatch } = useGlobalContext();

dispatch({
  type: 'UPDATE_USER',
  payload: userData
});
```

#### Derived State
```javascript
// Compute from existing state instead of storing
const filteredItems = useMemo(() => {
  return items.filter(item => item.status === 'active');
}, [items]);
```

### Error Handling

```javascript
// API calls
const fetchData = async () => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    showToast({
      message: error.message || 'An error occurred',
      variant: 'danger'
    });
    throw error;
  }
};

// Component error boundaries
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Performance Optimization

```javascript
// Memoization
const expensiveCalculation = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// Callback memoization
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// Component memoization
const MemoizedComponent = React.memo(MyComponent);

// Lazy loading
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Accessibility

```javascript
// Semantic HTML
<button onClick={handleClick}>Submit</button>
<nav aria-label="Main navigation">...</nav>

// ARIA attributes
<div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
  <h2 id="dialog-title">Dialog Title</h2>
</div>

// Keyboard navigation
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
>
  Action
</button>
```

### Testing Guidelines

```javascript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent onAction={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// Hook testing
import { renderHook, act } from '@testing-library/react-hooks';
import useCustomHook from './useCustomHook';

describe('useCustomHook', () => {
  it('updates value correctly', () => {
    const { result } = renderHook(() => useCustomHook());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

### Git Workflow

```bash
# Feature development
git checkout -b feature/order-management
git add .
git commit -m "feat: add order filtering functionality"
git push origin feature/order-management

# Bug fixes
git checkout -b fix/login-redirect
git commit -m "fix: resolve login redirect issue"

# Commit message format
# <type>: <description>
# 
# Types: feat, fix, docs, style, refactor, test, chore
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Issues

**Problem:** User gets logged out unexpectedly

**Solution:**
```javascript
// Check token expiry
const expiresOn = localStorage.getItem('expiresOn');
const now = Math.floor(Date.now() / 1000);

if (expiresOn && now > expiresOn) {
  // Token expired, refresh it
  acquireTokenWithFallback(msalInstance, account, loginRequest);
}
```

**Problem:** MSAL redirect loop

**Solution:**
```javascript
// Ensure proper redirect URI configuration
redirectUri: window.location.origin,  // Not window.location.href

// Handle redirect promise
msalInstance.handleRedirectPromise()
  .then(response => {
    if (response) {
      // Handle successful login
    }
  })
  .catch(error => {
    console.error('Redirect error:', error);
  });
```

#### 2. WebSocket Connection Issues

**Problem:** WebSocket disconnects frequently

**Solution:**
```javascript
// Implement exponential backoff
let reconnectDelay = 2000;
const maxDelay = 30000;

socket.onclose = () => {
  setTimeout(() => {
    connect();
    reconnectDelay = Math.min(reconnectDelay * 1.5, maxDelay);
  }, reconnectDelay);
};

socket.onopen = () => {
  reconnectDelay = 2000; // Reset on successful connection
};
```

**Problem:** Messages not received

**Solution:**
```javascript
// Check connection status
if (socket.readyState === WebSocket.OPEN) {
  socket.send(JSON.stringify(message));
} else {
  console.warn('WebSocket not connected');
  // Queue message for retry
}
```

#### 3. State Management Issues

**Problem:** State not updating

**Solution:**
```javascript
// Don't mutate state directly
// ❌ Wrong
state.user.name = 'New Name';

// ✅ Correct
dispatch({
  type: 'UPDATE_USER',
  payload: { ...state.user, name: 'New Name' }
});
```

**Problem:** Stale closure in useEffect

**Solution:**
```javascript
// Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]); // Add userId to dependencies

// Or use callback ref
const fetchDataRef = useRef(fetchData);
useEffect(() => {
  fetchDataRef.current = fetchData;
});
```

#### 4. API Request Issues

**Problem:** Duplicate requests

**Solution:**
```javascript
// Already handled in plgBaseAPI.js via request tracker
// To bypass for specific endpoints:
const allowDuplicateEndpoints = [
  '/api/specific-endpoint'
];
```

**Problem:** CORS errors

**Solution:**
```javascript
// Ensure backend allows origin
// Check headers in request
headers: {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// Backend should respond with:
// Access-Control-Allow-Origin: https://your-domain.com
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE
// Access-Control-Allow-Headers: Content-Type, Authorization
```

#### 5. Build issues (Vite)

**Problem:** `'vite' is not recognized` or devDependencies missing

**Solution:**
```bash
npm install --include=dev
# Run builds from repo root, not only inside apps/internal
npm run build:internal
```

**Problem:** Build fails with memory error

**Solution:**
```bash
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build -w @orion/internal

# Linux/macOS
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build -w @orion/internal
```

**Problem:** `Cannot find module 'autoprefixer'` during CSS build

**Solution:** Install from repo root — `autoprefixer` is a root `devDependency` used by `postcss/createAppPostcssConfig.cjs`.

**Problem:** Icons missing or 404 on `Orion-plg.woff` in production

**Solution:**
- Confirm `import "@orion/shared/src/styles/icons/style.scss"` is in `App.jsx`
- Do not copy fonts into `apps/*/public/fonts`; use shared package only
- Ensure PurgeCSS is not applied to icon SCSS (handled by `SKIP_PURGE_PATTERNS` in PostCSS factory)

**Problem:** Bootstrap layout broken in production only (`col-md-*`, offcanvas, tabs)

**Solution:** Vendor CSS must load via `vendor.scss` and stay out of PurgeCSS. React-Bootstrap props do not appear as string literals in JSX, so purging Bootstrap from app CSS breaks layouts.

**Problem:** Module not found errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --include=dev
```

#### 6. Styling Issues

**Problem:** Styles not applying

**Solution:**
```javascript
// Check import order in index.scss
// Bootstrap should be imported before custom styles
@import "~bootstrap/scss/bootstrap.scss";
@import "./variables.scss";
@import "./components";

// Ensure CSS modules are imported
import './MyComponent.scss';
```

**Problem:** CSS variables not working

**Solution:**
```javascript
// Ensure variables are loaded
import { loadVariableStyles } from './utils';
loadVariableStyles();

// Check if variables are defined
:root {
  --color-primary: #007bff;
}

// Use correctly
.element {
  color: var(--color-primary);
}
```

### Debugging Tools

#### React DevTools
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

#### Redux DevTools (for Context debugging)
```javascript
// Add to GlobalProvider
const [state, dispatch] = useReducer(
  rootReducer,
  initialState,
  (initial) => {
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
      window.__REDUX_DEVTOOLS_EXTENSION__();
    }
    return initial;
  }
);
```

#### Network Debugging
```javascript
// Enable request/response logging
// In src/config/index.js
const Config = {
  trackHttpResponseInConsole: true,
  trackHttpTimeInConsole: true,
};
```

#### Console Logging
```javascript
// Conditional logging
const log = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG]', ...args);
  }
};

// Structured logging
import loggerService from 'services/logger.service';
loggerService.showLog('Request Url', url);
loggerService.showLog('Response', data);
```

### Performance monitoring

```bash
# Interactive bundle treemap (replaces webpack-bundle-analyzer)
npm run analyze:internal
npm run analyze:branding
# Output: apps/<app>/build/stats.html
```

Use **React DevTools Profiler** for runtime render performance. Use browser **Network** and **Lighthouse** for load metrics.

---

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [React Router Documentation](https://reactrouter.com/)
- [Azure MSAL Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Bootstrap Documentation](https://getbootstrap.com/docs/5.3/)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)

### Internal Resources
- API Documentation: `[Internal API Docs URL]`
- Design System: `[https://www.figma.com/design/XDogY2BeJGZ5t3UELKs44L/Orion-Test-File]`
- DevOps Board: `[https://dev.azure.com/EurolandIndia/Orion%20V2/_boards/board/t/Orion%20V2%20Team/Stories]`

### Support
- **Product Owner:** [Sanjay Manimaran / Sanjay.Manimaran@euroland.com]

---

## 📝 Changelog

### Version 1.9.x (Current)
- **Build:** Migrated from Create React App / Webpack / Craco to **Vite 8** (npm workspaces monorepo)
- **PWA:** Internal app only — `vite-plugin-pwa` + Workbox; branding portal is not a PWA
- **CSS:** Split vendor vs app styles; shared PostCSS/PurgeCSS factory; IcoMoon centralized in `@orion/shared`
- **Tooling:** Bundle analysis via `rollup-plugin-visualizer` (`analyze:internal` / `analyze:branding`)
- **Docker:** Pre-built static assets copied into nginx image; runtime config via `docker-entrypoint.sh`

### Version 1.7.7
- Enhanced WebSocket real-time updates
- Improved Kanban board performance
- Bug fixes and stability improvements

### Version 1.7.x
- Added workspace management
- Implemented role-based access control
- Enhanced notification system

### Version 1.6.x
- Initial production release
- Core order management features
- Azure MSAL authentication integration

---

## 📄 License

Proprietary - Euroland Internal Use Only

---

**Last Updated:** 20 May 2026  
**Maintained By:** Orion PLG Development Team