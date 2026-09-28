# Orion PLG (Product-Led Growth) Platform

A robust React-based platform designed to manage and optimize order processing, personnel shifts, handovers, and performance tracking in a global, 24x7 support environment.

---

## 🚀 Features

### 🔁 Order Processing Workflow
- FIFO-based order processing, with dynamic reprioritization for priority customers.
- Supports global follow-the-sun operations:  
  **Philippines → India → Estonia → Argentina → back to Philippines**
- Parallel tool processing within each order.
- Task reassignment & pausing with handover note tracking.

### 👥 Personnel Activity & Shift Management
- Track support personnel activity:  
  Start/stop times, idle/waiting periods, breaks, handovers.
- Monitor performance with:
  - Actual vs Expected work hours  
  - Staff utilization analysis  
  - Task completion metrics

### 🔄 Handover & Communication
- Dedicated support handover interface:
  - Leave & view handover notes
  - Communicate next steps
  - Identify next assignees
- Seamless transitions logged and timestamped.

### 📊 Statistics & Performance Tracking
- Analyze time spent per task, per person, and per order.
- Visualize team performance, task balancing, and productivity trends.
- Optimize workload allocation with data-driven insights.

### 📅 Planning & Scheduling (Captain View)
- Overview of all active orders with EOTR (Estimated Order Time to Ready).
- Aggregated daily/weekly order timelines.
- Intelligent capacity planning dashboard using:
  - ETOW-PD (Expected Total Order Worktime Per Day)  
  - Team availability and bandwidth analysis

### 📝 Order Requirements Intake (PLG Form)
- Sales team enters detailed intake forms:
  - Order metadata, tool requirements, delivery timelines
- Orders cannot begin until all PLG inputs are verified and approved.

---

## 🛠️ Built With

- **ReactJS** — Frontend Framework  
- **Azure MSAL** — Authentication & SSO via Microsoft Identity Platform 

---

## ⚙️ Installation & Setup

1. **Clone the repository**
```bash
git clone https://gitlab.euroland.com/internal/orion-plg.git
cd orion-plg
```
2. Install dependencies
```bash
npm install
```
3. Set up environment variables
  
  Create a .env file and add your Azure AD configuration:
```bash
REACT_APP_CLIENT_ID=your-azure-client-id
REACT_APP_TENANT_ID=your-azure-tenant-id
REACT_APP_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
```
4. Start the app
```bash
npm start
```
