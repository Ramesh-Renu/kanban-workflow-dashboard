# Orion (`plg_testing`) → Kanban schema analysis

Source: `backend/db/orion_schema.sql` (schema-only `pg_dump` of `plg_testing`).
Target: the `kanban` database (`backend/app/models.py`, 13 tables).

## 1. What is in the Orion dump

| Object | Count | Notes |
|---|---|---|
| Schemas | 8 + public | `attachments, board, customers, knowledgebase, master, notification, tickets, users` |
| Tables | 168 | ~105 real tables; the rest are junk (§6) |
| Primary keys / foreign keys | 114 / 107 | Many ID columns have **no** FK (§5) |
| Functions / procedures | 192 / 81 | Business logic in PL/pgSQL, called by the .NET API |
| Views / materialized views | 1 / 2 | `customers.usw_newcustomers`, `users.mv_workspace_roles`, `users.participants_info_matview` |
| Types | 2 | `master.rolesetting_type`, `public.rolearray` |

**Orion conventions:**
- Mixed naming: `"BoardID"`, `"RegId"` and `"LabelID"` are quoted PascalCase, while the rest is snake_case.
- Every table carries `is_active, created_date, created_by (text), last_updated_date, updated_by`.
- Deletes are soft (`is_active = false`).
- Users are keyed by **UUID** (`users.registereduser."RegId"`, originally the Azure AD object id).

## 2. Table-by-table: what Kanban already has

| Kanban table | Orion equivalent | Status | Missing in Kanban (to add) |
|---|---|---|---|
| `users` | `users.registereduser` + `users.userprofile` | **Reuse + extend** | `given_name, surname, mobile_phone, office_location, preferred_language, employee_id, department (text), photo_url, previous_user_type_id, main_board_filter jsonb, sub_board_filter jsonb, last_active_at`. Kanban-only (keep): `username, password_hash, failed_login_count, locked_until, password_changed_at` for DB login. **Key type differs: int vs UUID** (decision D1) |
| `refresh_tokens` | none (Orion keeps `token_expiry_time` / `logout` on the user row) | **Keep** | none |
| `status_master` | `master.status_code_master` | **Reuse + extend** | `colour_code, back_ground_colour, parent_code`; same `type` + `code` model, served by `status-type?type=` |
| `teams` | `master.team` | **Reuse + extend** | `code`, `is_active` |
| `designations` | `master.designation` | **Reuse + extend** | `code`, `team_id → teams`, `is_active` |
| `countries` | `master.country_detail` **and** `master.country` (duplicates in Orion) | **Reuse + extend, one table** | `dial_code, currency_code, region_id → regions`, `is_active` |
| `roles` | `master.role` | **Reuse + extend** | `is_active`. Permission matrix → new `role_permissions` (from `master.rolesetting`) |
| `apps` | `master.app_master` | **Reuse + extend** | `description, prod_url, preprod_url, testing_url, logo_path, colour_code, is_active` |
| `workspaces` | `master.work_space_master` | **Reuse + extend** | `code` (Kanban already has `workflow_type_id` = `work_flow_type`) |
| `boards` | `board.board` | **Reuse + extend** | `main_board_id → boards` (self-reference: sub-task board to main board) |
| `board_labels` | `board.boardstatus` | **Reuse + extend** | `code, description, wip_limit, is_expanded, is_default, is_move_state, is_final_stage` |
| `user_board_permissions` | `users.user_board_permission` (+ `users.userboard`, `users.user_default_board`) | **Reuse + extend** | `is_default` (default board per workspace). Orion's `workspace_id` column is derivable from the board, so it is **not** copied |
| `user_app_permissions` | `users.user_app_permission` | **Reuse** | none; Kanban already has more (`permission`, `granted_by`, `notes`) |

**Overlapping Orion tables folded into existing Kanban tables (no new table):**
- `users.user_work_space`: a user's workspaces are derived from `user_board_permissions`.
- `master.user_default_work_space_mapping`: becomes `users.default_workspace_id`.
- `users.user_default_board`: becomes `user_board_permissions.is_default`.
- `users.userboard`: superseded by `user_board_permissions`.
- `public.user_type`: a copy of `master.common_flag`.
- `public."Department"`: duplicates `master.department`.

## 3. Orion-only entities (genuinely new for Kanban)

| Group | Orion tables | Proposed Kanban tables | Needed by UI area |
|---|---|---|---|
| **A. Org structure** | `master.department, work_space_department, board.departmentboard, users.userdepartment, master.rolesetting, users.reportmanager, master.shift, master.location, users.userlocation, master.language, users.userlanguage, master.region, master.organization` | `departments, workspace_departments, department_boards, user_departments, role_permissions, user_managers, shifts, locations, user_locations, languages, user_languages, regions, organizations` | Settings, user profile |
| **B. Workflow config** | `board.flow, board.tool_flow, board.board_status_workflow, master.board_status_master, master.board_status_movements, master.tool_stage_sla, master.common_flag, master.master_configuration, master.label` | `workflows (flow_details jsonb), tool_workflows, stage_transitions, stage_templates, tool_stage_slas, workspace_flags, app_configuration (jsonb), order_labels` | Settings → Workflow / Formulas / Master data |
| **C. Product catalogue** | `master.tool, toolcategory, toolversion, tool_template(_master), users.toolplatform, toolsubscription, toolcountryregion, master.platform, subscriptiontype, package, agency_package, currency, fontfamily, corecolor, "Tag", customer_language, customer_market, time_zone_detail, status, users.usertool` | `tools, tool_categories, tool_versions, tool_templates, tool_platforms, tool_subscriptions, tool_countries, platforms, subscription_types, packages, currencies, font_families, colors, tags, customer_languages, customer_markets, time_zones, tool_statuses, user_tools` | Order form, branding |
| **D. Customers** | `customers.customer, customer_order` | `customers, customer_orders` | Order form, company search |
| **E. Tickets / tasks (the Kanban cards)** | `tickets.ticket, ticket_assignee, ticket_attachment, ticket_comments, comments_type, ticket_company, ticket_history, ticket_status, ticket_status_track, ticket_board_tracker, ticket_work_log, ticket_detail, tool_detail, tool_assignee, tool_attachment, tool_board_log, tool_comments, tool_delete_reason, tool_duedate_log, tool_history, tool_work_log, ticket_tool_info` | `tickets, ticket_assignees, ticket_attachments, ticket_comments, comment_types, ticket_companies, ticket_history, ticket_status_log, ticket_stage_log, ticket_work_log, subtasks (tool_detail), subtask_assignees, subtask_attachments, subtask_stage_log, subtask_comments, subtask_delete_reasons, subtask_due_date_log, subtask_history, subtask_work_log, subtask_links (ticket_tool_info)` | Kanban boards, OrderView, dashboards |
| **E2. Branding guidelines** | `tickets.ticket_customer_branding, _attachment, _extraction, _feedback, _notes` | `branding_sections, branding_attachments, branding_extractions, branding_feedback, branding_notes` | Branding portal |
| **F. Knowledge base** | `knowledgebase.*` (6) | `kb_bases, kb_folders, kb_attachments, kb_links, kb_issues, user_kb_permissions` | Knowledge base |
| **G. Notifications** | `master.notification, notification.notification, notification_log, master.mailtemplate, mail_sender_list` | `notifications (in-app), outbound_messages, outbound_message_log, mail_templates, mail_recipients` | Notification drawer, e-mails |
| **H. Attachments** | `attachments.attachment` (generic `module` + `reference_id`) | `attachments` | Uploads |
| **I. Agency** | `master.agency, users.agency_user` | `agencies`; agency users become rows in `users` with a user type (Orion stores a separate `password` column for them, which DB login now covers) | Agency sign-up |
| **J. Audit / logs** | `public.logdetail, public.sslogs, users.usertracking` | `app_logs, user_activity` (optional) | Ops |

## 4. Relationships (target, after integration)

The core graph already in Kanban, which stays:

```
users 1─* user_board_permissions *─1 boards *─1 workspaces
users 1─* user_app_permissions  *─1 apps
users *─1 teams / designations / countries / status_master(user type)
boards 1─* board_labels ; roles 1─* user_board_permissions
```

What integration adds (FK = enforced foreign key):

| From | To | Kind |
|---|---|---|
| `boards.main_board_id` | `boards` | self many-to-one |
| `users.default_workspace_id` | `workspaces` | many-to-one |
| `designations.team_id` | `teams` | many-to-one |
| `countries.region_id` | `regions` | many-to-one |
| `user_departments`, `user_locations`, `user_languages`, `user_tools` | `users` × lookup | many-to-many junctions, `UNIQUE(user_id, x_id)` |
| `workspace_departments`, `department_boards` | `workspaces`/`boards` × `departments` | many-to-many junctions |
| `role_permissions` | `roles`, `departments` | one role → many permission rows |
| `user_managers` | `users` → `users` | self many-to-many (report-to) |
| `tickets` | `customers`, `status_master`, `users` (added_by, assigned_to) | many-to-one |
| `subtasks` | `tickets`, `tools`, `boards`, `board_labels`, `workflows`, `status_master`, `users` | many-to-one |
| `ticket_*` / `subtask_*` logs, comments, attachments | parent ticket / subtask (**CASCADE**), `users` | one-to-many |
| `kb_folders.parent_folder_id` | `kb_folders` | self tree |

Orion stores several many-to-many links as **integer arrays** with no integrity:
- `tickets`: `order_category[]`, `order_type[]`, `primary_market[]`, `priority_id[]`, `industory_id[]`, `order_label_id[]`, …
- `ticket_company`: `region_id[]`, `country_id[]`, `language_id[]`, …

Proposal: keep them as `integer[]` for now, so the UI payloads map one-to-one. Normalise to junction tables only if we need to query or report on them.

## 5. Problems in the Orion schema that should not be copied

1. **Missing FKs** on user references:
   - `tickets.ticket.added_by / assign_to`
   - `tool_detail.assign_to`
   - `tool_board_log.moved_by`
   - `master.notification.notified_to`
   - `users.userprofile.user_id`
   - `user_default_board.board_id`
   - and ~30 more.

   In Kanban these become real FKs to `users`.
2. **Duplicate tables:**
   - `master.country` and `master.country_detail`
   - `public."Department"` and `master.department`
   - `users.userboard`, `users.user_board_permission` and `users.user_default_board`
   - `public.user_type` and `master.common_flag`
3. **Typos in column names:**
   - `tartget_dept_code`
   - `industory_id`
   - `contect_info`
   - `attachement_id`
   - the `order-histroy` endpoint

   Kanban uses the correct spelling; the API serializers keep the old JSON keys the UI expects.
4. **Audit columns:** `created_by` is `text` in 125 tables, but `uuid` elsewhere. In Kanban it becomes `created_by_id → users`.
5. **Timestamps** are `timestamp without time zone`. Kanban uses `timestamptz`.
6. **Quoted PascalCase identifiers.** Kanban uses snake_case only.

## 6. Excluded (junk / obsolete — not migrated)

- **~45 single-column `public.*` tables** that procedures leaked, for example:
  - `bid, boardid, completed_count, gen_uuid, json_result, labelid, result, result1, t_board_id, total_count, usertype, v_*, watchlist`
  - `max_comment_id, new_dates, p_label_id_tmp, status_name, board_status_names, check_agency_user, …`
- **Leftovers:** `public."__EFMigrationsHistory"` (.NET EF) and `master.execution` / `master.stored_request` (.NET DB config and debug).
- **Test / temp tables:** `master.tool_template_tmp`, `master.role_hierarchy_test`, `notification.testing`.
- **Replaced by newer tables:** `public."IRAPPBoardTicketTrackers"` (use `tickets.ticket_board_tracker`); `tickets.ticket_detail` (id + ticket_id only).
- **Stored procedures and functions (273):** not ported to SQL. Their logic moves into the Python API, module by module, as each module's endpoints are built.

## 7. Migration plan

| Step | Change | Destructive? |
|---|---|---|
| 0 | Introduce **Alembic**; baseline the current 13 tables as revision `0001` | No |
| 1 | Extend the existing 13 tables with the columns in §2 (all nullable or defaulted) | No |
| 2 | Group A + B tables (org structure, workflow config) | No, new tables |
| 3 | Groups C, D, E, E2 (catalogue, customers, tickets/subtasks, branding) | No, new tables |
| 4 | Groups F, G, H, I (knowledge base, notifications, attachments, agency) | No, new tables |
| 5 | Seed lookups: users; SQLAlchemy models + Python endpoints per module | No |
| 6 | *(Optional)* **Data import** from `plg_testing`, matching users by e-mail and mapping `RegId` → user id | Writes data, needs a read-only connection to `plg_testing` |
| — | **D1: switch `users.id` from integer to UUID** | **Yes**, it rewrites the PK and 6 FK columns. Only 1 row (`admin`) exists today, so risk is minimal |

Every step is an Alembic revision with a `downgrade()`, and each one is run against `kanban_test` first.

## 8. Implementation result (2026-09-28)

**Decisions:**
- User ids are now **UUID**.
- **All** real Orion entities were added.
- **Kanban-style** naming: `public` schema, snake_case, real FKs.
- **Data import is deferred.**

**Final schema:**
- 99 tables: 13 extended plus 86 new.
- 328 foreign keys.
- Every table has a primary key.
- Tables DDL: `db/schema.sql`. Models: `app/models/`.

| Module (`app/models/…`) | Tables |
|---|---|
| `core` | users, refresh_tokens, status_master, regions *(new)*, teams, designations, countries, roles, apps, workspaces, boards, board_labels, user_board_permissions, user_app_permissions |
| `org` | organizations, departments, workspace_departments, department_boards, user_departments, role_permissions, user_managers, shifts, locations, user_locations, languages, user_languages, user_countries |
| `workflow` | workflows, tool_workflows, stage_templates, stage_transitions, tool_stage_slas, workspace_flags, app_configuration, order_labels |
| `catalog` | tools, tool_categories, tool_statuses, tool_versions, tool_template_masters, tool_templates, platforms, tool_platforms, currencies, subscription_types, tool_subscriptions, tool_countries, user_tools, packages, font_families, colors, tags, customer_languages, customer_markets, time_zones |
| `tickets` | customers, customer_orders, comment_types, tickets, ticket_companies, ticket_assignees, ticket_comments, ticket_attachments, ticket_history, ticket_status_log, ticket_stage_log, ticket_work_log, subtasks, subtask_links, subtask_stage_log, subtask_assignees, subtask_work_log, subtask_comments, subtask_attachments, subtask_delete_reasons, subtask_due_date_log, subtask_history |
| `branding` | branding_sections, branding_attachments, branding_extractions, branding_feedback, branding_notes |
| `knowledge` | kb_bases, kb_folders, kb_attachments, kb_links, kb_issues, user_kb_permissions |
| `messaging` | notifications, outbound_messages, outbound_message_log, mail_templates, mail_recipients, attachments, agencies, agency_packages, agency_registrations, app_logs, user_activity |

**Columns added to existing tables:**
- `users`: given_name, surname, employee_id, mobile_phone, office_location, preferred_language, photo_url, previous_user_type_id, default_workspace_id, main_board_filter, sub_board_filter, last_active_at.
- `status_master`: colour_code, background_colour, parent_code.
- `teams`: code.
- `designations`: code, team_id.
- `countries`: dial_code, currency_code, region_id.
- `apps`: description, prod_url, preprod_url, testing_url, logo_path, colour_code.
- `workspaces`: code, updated_by_id.
- `boards`: main_board_id.
- `board_labels`: code, description, wip_limit, is_expanded, is_default, is_move_state, is_final_stage.
- `user_board_permissions`: is_default.
- Audit columns (`is_active, created_at, updated_at, created_by_id, updated_by_id`) on the lookups and board tables that lacked them.

**Consolidations** (duplicates in Orion, one table in Kanban):

| Orion tables | Kanban table |
|---|---|
| `master.country` + `master.country_detail` | `countries` |
| `board_status_workflow` + `board_status_movements` | `stage_transitions` |
| `ticket_status_track` + `ticket_board_tracker` | `ticket_stage_log` |
| `userboard` + `user_default_board` + `user_board_permission` | `user_board_permissions` |
| `user_default_work_space_mapping` | `users.default_workspace_id` |
| `agency_user.password` | dropped; login lives in `users` |

**Relationship rules:**
- Children of a ticket or subtask (comments, attachments, logs, history, assignees) are `ON DELETE CASCADE`.
- References to users, boards and stages from history rows are `ON DELETE SET NULL`, so history survives deletes.
- User junction rows cascade.
- Knowledge-base folders are `RESTRICT`, as in Orion.
- Junction tables have `UNIQUE` pairs.
- The cycles `tools ↔ tool_versions` and `users ↔ workspaces` are created as separate `ALTER`s.

**Migrations** (`backend/migrations/versions/`):

| Revision | What it does |
|---|---|
| `0001_baseline` | The original 13 tables |
| `0002_users_uuid` | Hand-written int → UUID conversion. Remaps 6 referencing columns and keeps all rows. Reversible |
| `0003_orion_integration` | Additive only. New NOT NULL columns all carry server defaults |

On start, `scripts.init_db` stamps a pre-Alembic database as `0001` and then upgrades it.

**Applied to the live `kanban` database:**
- A backup was taken first: `db/backups/kanban_before_orion_integration.sql` (git-ignored).
- The migration was rehearsed on a restored copy. The migrated copy's schema was identical to a fresh `upgrade head`.
- All rows were kept: 1 user (now a UUID), 2 refresh tokens (re-linked), 9 statuses.

**Tests:** 24 pass. They run against a database built by the migrations. `test_schema.py` checks:
- migrations exactly equal the models (autogenerate diff is empty);
- every table exists once with a PK;
- ticket → subtask → comment cascades;
- SET NULL on a deleted stage;
- junction de-duplication;
- the tools ↔ versions cycle.

**Not done yet:**
- Python API endpoints for the new modules (tickets, KB, dashboards, …). They still answer 501.
- Porting the 273 Orion procedures' logic.
- Data import from `plg_testing` (needs a read-only connection).
- Seed values for departments, tools, etc. (they come from that import).
