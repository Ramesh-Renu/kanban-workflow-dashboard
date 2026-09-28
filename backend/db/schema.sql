CREATE TABLE customer_languages (
	id SERIAL NOT NULL, 
	code VARCHAR(10) NOT NULL, 
	name VARCHAR(50) NOT NULL, 
	available_euroland BOOLEAN DEFAULT false NOT NULL, 
	CONSTRAINT customer_languages_pkey PRIMARY KEY (id), 
	CONSTRAINT customer_languages_code_key UNIQUE (code)
);

CREATE TABLE customer_markets (
	id SERIAL NOT NULL, 
	name VARCHAR(50) NOT NULL, 
	europe_market_number SMALLINT, 
	CONSTRAINT customer_markets_pkey PRIMARY KEY (id)
);

CREATE TABLE status_master (
	status_id SERIAL NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	sort_order INTEGER NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	colour_code VARCHAR(20), 
	background_colour VARCHAR(20), 
	parent_code VARCHAR(50), 
	CONSTRAINT status_master_pkey PRIMARY KEY (status_id), 
	CONSTRAINT status_master_type_code_key UNIQUE (type, code)
);

CREATE INDEX ix_status_master_type ON status_master (type);

CREATE TABLE regions (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT regions_pkey PRIMARY KEY (id), 
	CONSTRAINT regions_name_key UNIQUE (name)
);

CREATE TABLE teams (
	id SERIAL NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT teams_pkey PRIMARY KEY (id), 
	CONSTRAINT teams_name_key UNIQUE (name)
);

CREATE TABLE designations (
	id SERIAL NOT NULL, 
	code VARCHAR(100), 
	name VARCHAR(100) NOT NULL, 
	team_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT designations_pkey PRIMARY KEY (id), 
	CONSTRAINT designations_name_key UNIQUE (name)
);

CREATE TABLE countries (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(3) NOT NULL, 
	dial_code VARCHAR(10), 
	currency_code VARCHAR(10), 
	region_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT countries_pkey PRIMARY KEY (id), 
	CONSTRAINT countries_name_key UNIQUE (name)
);

CREATE TABLE users (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	display_name VARCHAR(200) NOT NULL, 
	given_name VARCHAR(100), 
	surname VARCHAR(100), 
	job_title VARCHAR(200), 
	employee_id VARCHAR(50), 
	mobile_phone VARCHAR(50), 
	office_location VARCHAR(200), 
	preferred_language VARCHAR(20), 
	photo_url VARCHAR(1000), 
	is_super_admin BOOLEAN NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	user_type_id INTEGER NOT NULL, 
	previous_user_type_id INTEGER, 
	has_profile BOOLEAN NOT NULL, 
	team_id INTEGER, 
	designation_id INTEGER, 
	country_id INTEGER, 
	default_workspace_id INTEGER, 
	shift_from VARCHAR(10), 
	shift_to VARCHAR(10), 
	main_board_filter JSONB, 
	sub_board_filter JSONB, 
	failed_login_count INTEGER NOT NULL, 
	locked_until TIMESTAMP WITH TIME ZONE, 
	last_login_at TIMESTAMP WITH TIME ZONE, 
	last_active_at TIMESTAMP WITH TIME ZONE, 
	password_changed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_username ON users (username);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE outbound_messages (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	type VARCHAR(50), 
	recipient TEXT, 
	subject TEXT, 
	message TEXT, 
	message_json JSONB, 
	status VARCHAR(20), 
	retry_count INTEGER DEFAULT '0' NOT NULL, 
	max_retries INTEGER DEFAULT '3' NOT NULL, 
	next_attempt_at TIMESTAMP WITH TIME ZONE, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT outbound_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX ix_outbound_messages_status ON outbound_messages (status);

CREATE INDEX ix_outbound_messages_next_attempt_at ON outbound_messages (next_attempt_at);

CREATE TABLE tool_categories (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_categories_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_categories_name_key UNIQUE (name), 
	CONSTRAINT tool_categories_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_categories_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE tool_statuses (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_statuses_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_statuses_name_key UNIQUE (name), 
	CONSTRAINT tool_statuses_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_statuses_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE tool_template_masters (
	id SERIAL NOT NULL, 
	template JSONB, 
	version VARCHAR(50), 
	template_type VARCHAR(50), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_template_masters_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_template_masters_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_template_masters_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE platforms (
	id SERIAL NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT platforms_pkey PRIMARY KEY (id), 
	CONSTRAINT platforms_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT platforms_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE currencies (
	id SERIAL NOT NULL, 
	code VARCHAR(10) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT currencies_pkey PRIMARY KEY (id), 
	CONSTRAINT currencies_code_key UNIQUE (code), 
	CONSTRAINT currencies_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT currencies_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE packages (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT packages_pkey PRIMARY KEY (id), 
	CONSTRAINT packages_code_key UNIQUE (code), 
	CONSTRAINT packages_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT packages_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE font_families (
	id SERIAL NOT NULL, 
	name VARCHAR(500) NOT NULL, 
	is_custom BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT font_families_pkey PRIMARY KEY (id), 
	CONSTRAINT font_families_name_key UNIQUE (name), 
	CONSTRAINT font_families_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT font_families_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE colors (
	id SERIAL NOT NULL, 
	code VARCHAR(100) NOT NULL, 
	name VARCHAR(250) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT colors_pkey PRIMARY KEY (id), 
	CONSTRAINT colors_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT colors_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE tags (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tags_pkey PRIMARY KEY (id), 
	CONSTRAINT tags_code_key UNIQUE (code), 
	CONSTRAINT tags_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tags_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE time_zones (
	id SERIAL NOT NULL, 
	name VARCHAR(100), 
	description VARCHAR(500), 
	utc_offset VARCHAR(20), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT time_zones_pkey PRIMARY KEY (id), 
	CONSTRAINT time_zones_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT time_zones_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE roles (
	id SERIAL NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT roles_pkey PRIMARY KEY (id), 
	CONSTRAINT roles_code_key UNIQUE (code), 
	CONSTRAINT roles_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT roles_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE apps (
	id INTEGER NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	prod_url VARCHAR(500), 
	preprod_url VARCHAR(500), 
	testing_url VARCHAR(500), 
	logo_path VARCHAR(1000), 
	colour_code VARCHAR(20), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT apps_pkey PRIMARY KEY (id), 
	CONSTRAINT apps_code_key UNIQUE (code), 
	CONSTRAINT apps_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT apps_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE refresh_tokens (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	user_agent VARCHAR(500), 
	CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id), 
	CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE workspaces (
	id SERIAL NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(200) NOT NULL, 
	workflow_type_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT workspaces_pkey PRIMARY KEY (id), 
	CONSTRAINT workspaces_workflow_type_id_fkey FOREIGN KEY(workflow_type_id) REFERENCES status_master (status_id), 
	CONSTRAINT workspaces_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT workspaces_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE kb_bases (
	id SERIAL NOT NULL, 
	code VARCHAR(100), 
	name VARCHAR(500) NOT NULL, 
	description VARCHAR(2000), 
	is_helpdesk BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT kb_bases_pkey PRIMARY KEY (id), 
	CONSTRAINT kb_bases_code_key UNIQUE (code), 
	CONSTRAINT kb_bases_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT kb_bases_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE notifications (
	id BIGSERIAL NOT NULL, 
	notified_to_id UUID, 
	notified_by_id UUID, 
	type VARCHAR(50) DEFAULT '' NOT NULL, 
	message VARCHAR(4000), 
	status INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT notifications_pkey PRIMARY KEY (id), 
	CONSTRAINT notifications_notified_to_id_fkey FOREIGN KEY(notified_to_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT notifications_notified_by_id_fkey FOREIGN KEY(notified_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT notifications_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT notifications_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_notifications_notified_to_id ON notifications (notified_to_id);

CREATE TABLE outbound_message_log (
	id SERIAL NOT NULL, 
	message_id UUID NOT NULL, 
	attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	status VARCHAR(20), 
	error TEXT, 
	CONSTRAINT outbound_message_log_pkey PRIMARY KEY (id), 
	CONSTRAINT outbound_message_log_message_id_fkey FOREIGN KEY(message_id) REFERENCES outbound_messages (id) ON DELETE CASCADE
);

CREATE INDEX ix_outbound_message_log_message_id ON outbound_message_log (message_id);

CREATE TABLE mail_templates (
	id SERIAL NOT NULL, 
	template_type VARCHAR(250) NOT NULL, 
	subject TEXT DEFAULT '' NOT NULL, 
	template TEXT, 
	description VARCHAR(250), 
	from_email VARCHAR(250), 
	to_email TEXT, 
	cc_email TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT mail_templates_pkey PRIMARY KEY (id), 
	CONSTRAINT mail_templates_template_type_key UNIQUE (template_type), 
	CONSTRAINT mail_templates_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT mail_templates_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE mail_recipients (
	id SERIAL NOT NULL, 
	mail_type VARCHAR(100), 
	to_user_id UUID, 
	cc_user_id UUID, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT mail_recipients_pkey PRIMARY KEY (id), 
	CONSTRAINT mail_recipients_to_user_id_fkey FOREIGN KEY(to_user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT mail_recipients_cc_user_id_fkey FOREIGN KEY(cc_user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT mail_recipients_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT mail_recipients_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_mail_recipients_mail_type ON mail_recipients (mail_type);

CREATE TABLE attachments (
	id BIGSERIAL NOT NULL, 
	module VARCHAR(100) NOT NULL, 
	reference_id BIGINT, 
	reference_id_1 BIGINT, 
	reference_id_2 BIGINT, 
	file_name TEXT NOT NULL, 
	file_type VARCHAR(200) NOT NULL, 
	file_size BIGINT NOT NULL, 
	blob_name TEXT NOT NULL, 
	blob_uri TEXT NOT NULL, 
	uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT attachments_pkey PRIMARY KEY (id), 
	CONSTRAINT attachments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT attachments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_attachments_reference_id ON attachments (reference_id);

CREATE INDEX ix_attachments_module ON attachments (module);

CREATE TABLE agency_packages (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT agency_packages_pkey PRIMARY KEY (id), 
	CONSTRAINT agency_packages_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT agency_packages_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE app_logs (
	id BIGSERIAL NOT NULL, 
	level VARCHAR(20), 
	message TEXT, 
	exception TEXT, 
	stack_trace TEXT, 
	user_id UUID, 
	input_data JSONB, 
	logged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT app_logs_pkey PRIMARY KEY (id), 
	CONSTRAINT app_logs_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_app_logs_logged_at ON app_logs (logged_at);

CREATE INDEX ix_app_logs_level ON app_logs (level);

CREATE TABLE user_activity (
	id BIGSERIAL NOT NULL, 
	user_id UUID, 
	action TEXT NOT NULL, 
	ticket_ref TEXT, 
	ticket_type TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT user_activity_pkey PRIMARY KEY (id), 
	CONSTRAINT user_activity_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_user_activity_created_at ON user_activity (created_at);

CREATE INDEX ix_user_activity_user_id ON user_activity (user_id);

CREATE TABLE organizations (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT organizations_pkey PRIMARY KEY (id), 
	CONSTRAINT organizations_name_key UNIQUE (name), 
	CONSTRAINT organizations_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT organizations_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE departments (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT departments_pkey PRIMARY KEY (id), 
	CONSTRAINT departments_code_key UNIQUE (code), 
	CONSTRAINT departments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT departments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE user_managers (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	manager_id UUID NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_managers_pkey PRIMARY KEY (id), 
	CONSTRAINT user_managers_user_id_manager_id_key UNIQUE (user_id, manager_id), 
	CONSTRAINT user_managers_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_managers_manager_id_fkey FOREIGN KEY(manager_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_managers_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_managers_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_managers_manager_id ON user_managers (manager_id);

CREATE INDEX ix_user_managers_user_id ON user_managers (user_id);

CREATE TABLE shifts (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	start_time VARCHAR(10) NOT NULL, 
	end_time VARCHAR(10) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT shifts_pkey PRIMARY KEY (id), 
	CONSTRAINT shifts_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT shifts_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE locations (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT locations_pkey PRIMARY KEY (id), 
	CONSTRAINT locations_code_key UNIQUE (code), 
	CONSTRAINT locations_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT locations_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE languages (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT languages_pkey PRIMARY KEY (id), 
	CONSTRAINT languages_code_key UNIQUE (code), 
	CONSTRAINT languages_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT languages_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE user_countries (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	country_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_countries_pkey PRIMARY KEY (id), 
	CONSTRAINT user_countries_user_id_country_id_key UNIQUE (user_id, country_id), 
	CONSTRAINT user_countries_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_countries_country_id_fkey FOREIGN KEY(country_id) REFERENCES countries (id) ON DELETE CASCADE, 
	CONSTRAINT user_countries_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_countries_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_countries_user_id ON user_countries (user_id);

CREATE TABLE comment_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT comment_types_pkey PRIMARY KEY (id), 
	CONSTRAINT comment_types_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT comment_types_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE app_configuration (
	id SERIAL NOT NULL, 
	type VARCHAR(100) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	value JSONB, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT app_configuration_pkey PRIMARY KEY (id), 
	CONSTRAINT app_configuration_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT app_configuration_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_app_configuration_type ON app_configuration (type);

CREATE TABLE order_labels (
	id SERIAL NOT NULL, 
	name VARCHAR(1000) NOT NULL, 
	color_code VARCHAR(50), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT order_labels_pkey PRIMARY KEY (id), 
	CONSTRAINT order_labels_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT order_labels_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE tools (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(250) NOT NULL, 
	about TEXT, 
	description TEXT, 
	key_highlight TEXT, 
	primary_owner_id UUID, 
	secondary_owner_id UUID, 
	status_id INTEGER, 
	category_id INTEGER, 
	current_version_id INTEGER, 
	is_dependency_required BOOLEAN DEFAULT false NOT NULL, 
	is_analyse_dependency BOOLEAN DEFAULT false NOT NULL, 
	is_tsr_dependency BOOLEAN DEFAULT false NOT NULL, 
	is_update_team_dependency BOOLEAN DEFAULT false NOT NULL, 
	is_data_dependency_priority BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tools_pkey PRIMARY KEY (id), 
	CONSTRAINT tools_code_key UNIQUE (code), 
	CONSTRAINT tools_primary_owner_id_fkey FOREIGN KEY(primary_owner_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tools_secondary_owner_id_fkey FOREIGN KEY(secondary_owner_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tools_status_id_fkey FOREIGN KEY(status_id) REFERENCES tool_statuses (id), 
	CONSTRAINT tools_category_id_fkey FOREIGN KEY(category_id) REFERENCES tool_categories (id), 
	CONSTRAINT tools_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tools_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE subscription_types (
	id SERIAL NOT NULL, 
	code VARCHAR(100), 
	name VARCHAR(100) NOT NULL, 
	complete_price NUMERIC(14, 2), 
	onetime_price NUMERIC(14, 2), 
	currency_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subscription_types_pkey PRIMARY KEY (id), 
	CONSTRAINT subscription_types_currency_id_fkey FOREIGN KEY(currency_id) REFERENCES currencies (id), 
	CONSTRAINT subscription_types_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subscription_types_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE boards (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	main_board_id INTEGER, 
	name VARCHAR(200) NOT NULL, 
	code VARCHAR(50), 
	type VARCHAR(50) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT boards_pkey PRIMARY KEY (id), 
	CONSTRAINT boards_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id), 
	CONSTRAINT boards_main_board_id_fkey FOREIGN KEY(main_board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT boards_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT boards_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_boards_workspace_id ON boards (workspace_id);

CREATE TABLE user_app_permissions (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	app_id INTEGER NOT NULL, 
	permission INTEGER NOT NULL, 
	granted_by_id UUID, 
	granted_on TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	notes TEXT, 
	CONSTRAINT user_app_permissions_pkey PRIMARY KEY (id), 
	CONSTRAINT user_app_permissions_user_id_app_id_key UNIQUE (user_id, app_id), 
	CONSTRAINT user_app_permissions_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_app_permissions_app_id_fkey FOREIGN KEY(app_id) REFERENCES apps (id), 
	CONSTRAINT user_app_permissions_granted_by_id_fkey FOREIGN KEY(granted_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_app_permissions_user_id ON user_app_permissions (user_id);

CREATE TABLE kb_folders (
	id SERIAL NOT NULL, 
	kb_id INTEGER NOT NULL, 
	parent_folder_id INTEGER, 
	name VARCHAR(500) NOT NULL, 
	description VARCHAR(2000), 
	is_manual BOOLEAN DEFAULT 'true' NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT kb_folders_pkey PRIMARY KEY (id), 
	CONSTRAINT kb_folders_kb_id_fkey FOREIGN KEY(kb_id) REFERENCES kb_bases (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_folders_parent_folder_id_fkey FOREIGN KEY(parent_folder_id) REFERENCES kb_folders (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_folders_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT kb_folders_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_kb_folders_kb_id ON kb_folders (kb_id);

CREATE INDEX ix_kb_folders_parent_folder_id ON kb_folders (parent_folder_id);

CREATE TABLE user_kb_permissions (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	kb_id INTEGER NOT NULL, 
	action_id INTEGER DEFAULT '0' NOT NULL, 
	is_admin BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_kb_permissions_pkey PRIMARY KEY (id), 
	CONSTRAINT user_kb_permissions_user_id_kb_id_key UNIQUE (user_id, kb_id), 
	CONSTRAINT user_kb_permissions_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_kb_permissions_kb_id_fkey FOREIGN KEY(kb_id) REFERENCES kb_bases (id) ON DELETE CASCADE, 
	CONSTRAINT user_kb_permissions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_kb_permissions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_kb_permissions_user_id ON user_kb_permissions (user_id);

CREATE TABLE workspace_departments (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	department_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT workspace_departments_pkey PRIMARY KEY (id), 
	CONSTRAINT workspace_departments_workspace_id_department_id_key UNIQUE (workspace_id, department_id), 
	CONSTRAINT workspace_departments_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE, 
	CONSTRAINT workspace_departments_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT workspace_departments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT workspace_departments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_workspace_departments_workspace_id ON workspace_departments (workspace_id);

CREATE TABLE user_departments (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	department_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_departments_pkey PRIMARY KEY (id), 
	CONSTRAINT user_departments_user_id_department_id_key UNIQUE (user_id, department_id), 
	CONSTRAINT user_departments_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_departments_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT user_departments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_departments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_departments_user_id ON user_departments (user_id);

CREATE TABLE role_permissions (
	id SERIAL NOT NULL, 
	role_id INTEGER NOT NULL, 
	department_id INTEGER, 
	permission VARCHAR(100) NOT NULL, 
	action VARCHAR(50) NOT NULL, 
	is_allowed BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT role_permissions_pkey PRIMARY KEY (id), 
	CONSTRAINT role_permissions_role_id_department_id_permission_action_key UNIQUE (role_id, department_id, permission, action), 
	CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
	CONSTRAINT role_permissions_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT role_permissions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT role_permissions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_role_permissions_role_id ON role_permissions (role_id);

CREATE TABLE user_locations (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	location_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_locations_pkey PRIMARY KEY (id), 
	CONSTRAINT user_locations_user_id_location_id_key UNIQUE (user_id, location_id), 
	CONSTRAINT user_locations_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_locations_location_id_fkey FOREIGN KEY(location_id) REFERENCES locations (id) ON DELETE CASCADE, 
	CONSTRAINT user_locations_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_locations_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_locations_user_id ON user_locations (user_id);

CREATE TABLE user_languages (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	language_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_languages_pkey PRIMARY KEY (id), 
	CONSTRAINT user_languages_user_id_language_id_key UNIQUE (user_id, language_id), 
	CONSTRAINT user_languages_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_languages_language_id_fkey FOREIGN KEY(language_id) REFERENCES languages (id) ON DELETE CASCADE, 
	CONSTRAINT user_languages_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_languages_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_languages_user_id ON user_languages (user_id);

CREATE TABLE workflows (
	id SERIAL NOT NULL, 
	unique_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	flow_details JSONB, 
	workflow_type_id INTEGER, 
	workspace_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT workflows_pkey PRIMARY KEY (id), 
	CONSTRAINT workflows_unique_id_key UNIQUE (unique_id), 
	CONSTRAINT workflows_workflow_type_id_fkey FOREIGN KEY(workflow_type_id) REFERENCES status_master (status_id), 
	CONSTRAINT workflows_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE, 
	CONSTRAINT workflows_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT workflows_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_workflows_workspace_id ON workflows (workspace_id);

CREATE TABLE stage_templates (
	id SERIAL NOT NULL, 
	department_id INTEGER, 
	code VARCHAR(250) NOT NULL, 
	name VARCHAR(250) NOT NULL, 
	color_code VARCHAR(20), 
	position INTEGER NOT NULL, 
	is_move_state BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT stage_templates_pkey PRIMARY KEY (id), 
	CONSTRAINT stage_templates_department_id_code_key UNIQUE (department_id, code), 
	CONSTRAINT stage_templates_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT stage_templates_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT stage_templates_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE stage_transitions (
	id SERIAL NOT NULL, 
	source_department_id INTEGER, 
	target_department_id INTEGER, 
	source_stage_code VARCHAR(250) NOT NULL, 
	target_stage_code VARCHAR(250) NOT NULL, 
	previous_stage_code VARCHAR(250), 
	CONSTRAINT stage_transitions_pkey PRIMARY KEY (id), 
	CONSTRAINT stage_transitions_source_department_id_fkey FOREIGN KEY(source_department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT stage_transitions_target_department_id_fkey FOREIGN KEY(target_department_id) REFERENCES departments (id) ON DELETE CASCADE
);

CREATE TABLE workspace_flags (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	type VARCHAR(100), 
	type_name VARCHAR(200), 
	description TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT workspace_flags_pkey PRIMARY KEY (id), 
	CONSTRAINT workspace_flags_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE, 
	CONSTRAINT workspace_flags_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT workspace_flags_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_workspace_flags_workspace_id ON workspace_flags (workspace_id);

CREATE TABLE tool_versions (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	version_name VARCHAR(100) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_versions_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_versions_tool_id_version_name_key UNIQUE (tool_id, version_name), 
	CONSTRAINT tool_versions_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_versions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_versions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_versions_tool_id ON tool_versions (tool_id);

CREATE TABLE tool_templates (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	template_master_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_templates_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_templates_tool_id_template_master_id_key UNIQUE (tool_id, template_master_id), 
	CONSTRAINT tool_templates_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_templates_template_master_id_fkey FOREIGN KEY(template_master_id) REFERENCES tool_template_masters (id) ON DELETE CASCADE, 
	CONSTRAINT tool_templates_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_templates_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_templates_tool_id ON tool_templates (tool_id);

CREATE TABLE tool_platforms (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	platform_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_platforms_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_platforms_tool_id_platform_id_key UNIQUE (tool_id, platform_id), 
	CONSTRAINT tool_platforms_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_platforms_platform_id_fkey FOREIGN KEY(platform_id) REFERENCES platforms (id) ON DELETE CASCADE, 
	CONSTRAINT tool_platforms_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_platforms_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_platforms_tool_id ON tool_platforms (tool_id);

CREATE TABLE tool_subscriptions (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	subscription_type_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_subscriptions_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_subscriptions_tool_id_subscription_type_id_key UNIQUE (tool_id, subscription_type_id), 
	CONSTRAINT tool_subscriptions_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_subscriptions_subscription_type_id_fkey FOREIGN KEY(subscription_type_id) REFERENCES subscription_types (id) ON DELETE CASCADE, 
	CONSTRAINT tool_subscriptions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_subscriptions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_subscriptions_tool_id ON tool_subscriptions (tool_id);

CREATE TABLE tool_countries (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	country_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_countries_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_countries_tool_id_country_id_key UNIQUE (tool_id, country_id), 
	CONSTRAINT tool_countries_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_countries_country_id_fkey FOREIGN KEY(country_id) REFERENCES countries (id) ON DELETE CASCADE, 
	CONSTRAINT tool_countries_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_countries_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_countries_tool_id ON tool_countries (tool_id);

CREATE TABLE user_tools (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	tool_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT user_tools_pkey PRIMARY KEY (id), 
	CONSTRAINT user_tools_user_id_tool_id_key UNIQUE (user_id, tool_id), 
	CONSTRAINT user_tools_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_tools_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT user_tools_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT user_tools_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_tools_user_id ON user_tools (user_id);

CREATE TABLE board_labels (
	id SERIAL NOT NULL, 
	board_id INTEGER NOT NULL, 
	code VARCHAR(250), 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	color_code VARCHAR(20), 
	position INTEGER NOT NULL, 
	wip_limit INTEGER, 
	is_expanded BOOLEAN DEFAULT 'true' NOT NULL, 
	is_default BOOLEAN DEFAULT false NOT NULL, 
	is_move_state BOOLEAN DEFAULT false NOT NULL, 
	is_final_stage BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT board_labels_pkey PRIMARY KEY (id), 
	CONSTRAINT board_labels_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE CASCADE, 
	CONSTRAINT board_labels_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT board_labels_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_board_labels_board_id ON board_labels (board_id);

CREATE TABLE user_board_permissions (
	id SERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	board_id INTEGER NOT NULL, 
	role_id INTEGER, 
	is_default BOOLEAN DEFAULT false NOT NULL, 
	granted_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT user_board_permissions_pkey PRIMARY KEY (id), 
	CONSTRAINT user_board_permissions_user_id_board_id_key UNIQUE (user_id, board_id), 
	CONSTRAINT user_board_permissions_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT user_board_permissions_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE CASCADE, 
	CONSTRAINT user_board_permissions_role_id_fkey FOREIGN KEY(role_id) REFERENCES roles (id), 
	CONSTRAINT user_board_permissions_granted_by_id_fkey FOREIGN KEY(granted_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_board_permissions_user_id ON user_board_permissions (user_id);

CREATE TABLE kb_attachments (
	id SERIAL NOT NULL, 
	ref_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	folder_id INTEGER NOT NULL, 
	document_name VARCHAR(500) NOT NULL, 
	description VARCHAR(2000), 
	file_type VARCHAR(50), 
	file_name VARCHAR(500), 
	file_url TEXT, 
	vector_processing_status VARCHAR(20) DEFAULT 'Pending' NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT kb_attachments_pkey PRIMARY KEY (id), 
	CONSTRAINT kb_attachments_ref_id_key UNIQUE (ref_id), 
	CONSTRAINT kb_attachments_folder_id_fkey FOREIGN KEY(folder_id) REFERENCES kb_folders (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_attachments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT kb_attachments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_kb_attachments_folder_id ON kb_attachments (folder_id);

CREATE TABLE kb_links (
	id SERIAL NOT NULL, 
	folder_id INTEGER NOT NULL, 
	name VARCHAR(500) NOT NULL, 
	url VARCHAR(2000) NOT NULL, 
	description VARCHAR(2000), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT kb_links_pkey PRIMARY KEY (id), 
	CONSTRAINT kb_links_folder_id_fkey FOREIGN KEY(folder_id) REFERENCES kb_folders (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_links_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT kb_links_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_kb_links_folder_id ON kb_links (folder_id);

CREATE TABLE kb_issues (
	id SERIAL NOT NULL, 
	ref_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	kb_id INTEGER NOT NULL, 
	folder_id INTEGER NOT NULL, 
	parent_folder_id INTEGER, 
	freshdesk_ticket TEXT, 
	issue_name TEXT NOT NULL, 
	issue_json JSONB NOT NULL, 
	last_synced_at TIMESTAMP WITH TIME ZONE, 
	vector_processing_status VARCHAR(20) DEFAULT 'Pending' NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT kb_issues_pkey PRIMARY KEY (id), 
	CONSTRAINT kb_issues_ref_id_key UNIQUE (ref_id), 
	CONSTRAINT kb_issues_kb_id_fkey FOREIGN KEY(kb_id) REFERENCES kb_bases (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_issues_folder_id_fkey FOREIGN KEY(folder_id) REFERENCES kb_folders (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_issues_parent_folder_id_fkey FOREIGN KEY(parent_folder_id) REFERENCES kb_folders (id) ON DELETE RESTRICT, 
	CONSTRAINT kb_issues_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT kb_issues_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_kb_issues_kb_id ON kb_issues (kb_id);

CREATE INDEX ix_kb_issues_folder_id ON kb_issues (folder_id);

CREATE TABLE agencies (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(250) NOT NULL, 
	board_id INTEGER, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT agencies_pkey PRIMARY KEY (id), 
	CONSTRAINT agencies_code_key UNIQUE (code), 
	CONSTRAINT agencies_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT agencies_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT agencies_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE department_boards (
	id SERIAL NOT NULL, 
	department_id INTEGER NOT NULL, 
	board_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT department_boards_pkey PRIMARY KEY (id), 
	CONSTRAINT department_boards_department_id_board_id_key UNIQUE (department_id, board_id), 
	CONSTRAINT department_boards_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE, 
	CONSTRAINT department_boards_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE CASCADE, 
	CONSTRAINT department_boards_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT department_boards_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_department_boards_department_id ON department_boards (department_id);

CREATE TABLE customers (
	id BIGSERIAL NOT NULL, 
	ref_id INTEGER, 
	code VARCHAR(20), 
	company_name VARCHAR(800), 
	phone_no VARCHAR(50), 
	email VARCHAR(250), 
	website VARCHAR(1000), 
	translation_approval VARCHAR(100), 
	address VARCHAR(2000), 
	note VARCHAR(4000), 
	common_data JSONB, 
	markets JSONB, 
	languages JSONB, 
	existing_subscription_type_id INTEGER, 
	existing_subscription_name VARCHAR(800), 
	subscription_type_id INTEGER, 
	existing_tool_data JSONB, 
	tool_center_link VARCHAR(5000), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT customers_pkey PRIMARY KEY (id), 
	CONSTRAINT customers_existing_subscription_type_id_fkey FOREIGN KEY(existing_subscription_type_id) REFERENCES subscription_types (id), 
	CONSTRAINT customers_subscription_type_id_fkey FOREIGN KEY(subscription_type_id) REFERENCES subscription_types (id), 
	CONSTRAINT customers_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT customers_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_customers_ref_id ON customers (ref_id);

CREATE INDEX ix_customers_code ON customers (code);

CREATE TABLE tool_workflows (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	workflow_id INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_workflows_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_workflows_tool_id_workflow_id_key UNIQUE (tool_id, workflow_id), 
	CONSTRAINT tool_workflows_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_workflows_workflow_id_fkey FOREIGN KEY(workflow_id) REFERENCES workflows (id) ON DELETE CASCADE, 
	CONSTRAINT tool_workflows_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_workflows_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_workflows_tool_id ON tool_workflows (tool_id);

CREATE TABLE agency_registrations (
	id UUID DEFAULT gen_random_uuid() NOT NULL, 
	agency_id INTEGER NOT NULL, 
	user_id UUID, 
	first_name VARCHAR(50) NOT NULL, 
	last_name VARCHAR(50) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	phone_number VARCHAR(20), 
	country_id INTEGER, 
	approval_status VARCHAR(20), 
	requested_at TIMESTAMP WITH TIME ZONE, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	approved_by_id UUID, 
	remarks VARCHAR(4000), 
	mail_sent_at TIMESTAMP WITH TIME ZONE, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT agency_registrations_pkey PRIMARY KEY (id), 
	CONSTRAINT agency_registrations_agency_id_fkey FOREIGN KEY(agency_id) REFERENCES agencies (id) ON DELETE CASCADE, 
	CONSTRAINT agency_registrations_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT agency_registrations_country_id_fkey FOREIGN KEY(country_id) REFERENCES countries (id), 
	CONSTRAINT agency_registrations_approved_by_id_fkey FOREIGN KEY(approved_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT agency_registrations_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT agency_registrations_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_agency_registrations_email ON agency_registrations (email);

CREATE INDEX ix_agency_registrations_agency_id ON agency_registrations (agency_id);

CREATE INDEX ix_agency_registrations_user_id ON agency_registrations (user_id);

CREATE TABLE tickets (
	id BIGSERIAL NOT NULL, 
	ticket_no VARCHAR(200), 
	name VARCHAR(200), 
	description TEXT, 
	ticket_type INTEGER DEFAULT '0' NOT NULL, 
	customer_id BIGINT, 
	status_id INTEGER, 
	added_by_id UUID, 
	assigned_to_id UUID, 
	position INTEGER, 
	created_title TEXT DEFAULT 'Created by', 
	order_ref VARCHAR(4000), 
	order_date TIMESTAMP WITH TIME ZONE, 
	due_date TIMESTAMP WITH TIME ZONE, 
	expected_delivery_date TIMESTAMP WITH TIME ZONE, 
	subscription_type_id INTEGER, 
	order_value INTEGER, 
	start_up_fee INTEGER, 
	is_ipo BOOLEAN, 
	is_new_customer BOOLEAN DEFAULT false NOT NULL, 
	is_proceed BOOLEAN DEFAULT false NOT NULL, 
	is_process_order BOOLEAN DEFAULT false NOT NULL, 
	process_date TIMESTAMP WITH TIME ZONE, 
	isin VARCHAR(20), 
	symbol VARCHAR(50), 
	order_category_ids INTEGER[], 
	order_type_ids INTEGER[], 
	order_value_type_ids INTEGER[], 
	start_up_fee_type_ids INTEGER[], 
	primary_market_ids INTEGER[], 
	redesign_category_ids INTEGER[], 
	upsell_category_ids INTEGER[], 
	priority_ids INTEGER[], 
	industry_ids INTEGER[], 
	order_label_ids INTEGER[], 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tickets_pkey PRIMARY KEY (id), 
	CONSTRAINT tickets_customer_id_fkey FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL, 
	CONSTRAINT tickets_status_id_fkey FOREIGN KEY(status_id) REFERENCES status_master (status_id), 
	CONSTRAINT tickets_added_by_id_fkey FOREIGN KEY(added_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tickets_assigned_to_id_fkey FOREIGN KEY(assigned_to_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tickets_subscription_type_id_fkey FOREIGN KEY(subscription_type_id) REFERENCES subscription_types (id), 
	CONSTRAINT tickets_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tickets_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tickets_status_id ON tickets (status_id);

CREATE INDEX ix_tickets_ticket_no ON tickets (ticket_no);

CREATE INDEX ix_tickets_assigned_to_id ON tickets (assigned_to_id);

CREATE INDEX ix_tickets_customer_id ON tickets (customer_id);

CREATE INDEX ix_tickets_due_date ON tickets (due_date);

CREATE TABLE tool_stage_slas (
	id SERIAL NOT NULL, 
	tool_id INTEGER NOT NULL, 
	board_id INTEGER, 
	label_id INTEGER, 
	sla_ranges JSONB, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT tool_stage_slas_pkey PRIMARY KEY (id), 
	CONSTRAINT tool_stage_slas_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id) ON DELETE CASCADE, 
	CONSTRAINT tool_stage_slas_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE CASCADE, 
	CONSTRAINT tool_stage_slas_label_id_fkey FOREIGN KEY(label_id) REFERENCES board_labels (id) ON DELETE CASCADE, 
	CONSTRAINT tool_stage_slas_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT tool_stage_slas_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_tool_stage_slas_tool_id ON tool_stage_slas (tool_id);

CREATE TABLE branding_sections (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	section_name VARCHAR(200), 
	version VARCHAR(10), 
	branding_json JSONB NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT branding_sections_pkey PRIMARY KEY (id), 
	CONSTRAINT branding_sections_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT branding_sections_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT branding_sections_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_branding_sections_ticket_id ON branding_sections (ticket_id);

CREATE TABLE branding_extractions (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	source_type VARCHAR(50) NOT NULL, 
	source_url VARCHAR(2000), 
	job_id VARCHAR(100), 
	extract_details JSONB NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT branding_extractions_pkey PRIMARY KEY (id), 
	CONSTRAINT branding_extractions_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT branding_extractions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT branding_extractions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_branding_extractions_ticket_id ON branding_extractions (ticket_id);

CREATE INDEX ix_branding_extractions_job_id ON branding_extractions (job_id);

CREATE TABLE branding_notes (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	guideline_notes VARCHAR(5000), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT branding_notes_pkey PRIMARY KEY (id), 
	CONSTRAINT branding_notes_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT branding_notes_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT branding_notes_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_branding_notes_ticket_id ON branding_notes (ticket_id);

CREATE TABLE customer_orders (
	id BIGSERIAL NOT NULL, 
	customer_id BIGINT NOT NULL, 
	ticket_id BIGINT, 
	order_no TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT customer_orders_pkey PRIMARY KEY (id), 
	CONSTRAINT customer_orders_customer_id_fkey FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE CASCADE, 
	CONSTRAINT customer_orders_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE SET NULL, 
	CONSTRAINT customer_orders_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT customer_orders_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_customer_orders_customer_id ON customer_orders (customer_id);

CREATE INDEX ix_customer_orders_ticket_id ON customer_orders (ticket_id);

CREATE TABLE ticket_companies (
	id SERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	website_link TEXT, 
	is_ipo BOOLEAN, 
	ipo_date TIMESTAMP WITH TIME ZONE, 
	headquarters_address TEXT, 
	ir_address TEXT, 
	is_same_as_address BOOLEAN, 
	industry_ids INTEGER[], 
	region_ids INTEGER[], 
	country_ids INTEGER[], 
	language_ids INTEGER[], 
	instrument_ids INTEGER[], 
	currency_ids INTEGER[], 
	other_data JSONB, 
	contact_info JSONB, 
	branding_guidelines_details JSONB, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_companies_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_companies_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_companies_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_companies_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_companies_ticket_id ON ticket_companies (ticket_id);

CREATE TABLE ticket_assignees (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	user_id UUID, 
	assignee_type VARCHAR(50), 
	assigned_at TIMESTAMP WITH TIME ZONE, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_assignees_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_assignees_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_assignees_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_assignees_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_assignees_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_assignees_ticket_id ON ticket_assignees (ticket_id);

CREATE INDEX ix_ticket_assignees_user_id ON ticket_assignees (user_id);

CREATE TABLE ticket_comments (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	type_id INTEGER, 
	content TEXT, 
	added_by_id UUID, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_comments_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_comments_type_id_fkey FOREIGN KEY(type_id) REFERENCES comment_types (id), 
	CONSTRAINT ticket_comments_added_by_id_fkey FOREIGN KEY(added_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_comments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_comments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_comments_ticket_id ON ticket_comments (ticket_id);

CREATE TABLE ticket_history (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	workspace_id INTEGER, 
	history_data JSONB, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_history_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_history_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_history_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_history_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_history_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_history_ticket_id ON ticket_history (ticket_id);

CREATE TABLE ticket_status_log (
	id SERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	status_id INTEGER, 
	created_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT ticket_status_log_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_status_log_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_status_log_status_id_fkey FOREIGN KEY(status_id) REFERENCES status_master (status_id), 
	CONSTRAINT ticket_status_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_status_log_ticket_id ON ticket_status_log (ticket_id);

CREATE TABLE ticket_stage_log (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	board_id INTEGER, 
	label_id INTEGER, 
	previous_label_id INTEGER, 
	moved_by_id UUID, 
	moved_at TIMESTAMP WITH TIME ZONE, 
	remarks VARCHAR(4000), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_stage_log_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_stage_log_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_stage_log_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_stage_log_label_id_fkey FOREIGN KEY(label_id) REFERENCES board_labels (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_stage_log_previous_label_id_fkey FOREIGN KEY(previous_label_id) REFERENCES board_labels (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_stage_log_moved_by_id_fkey FOREIGN KEY(moved_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_stage_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_stage_log_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_stage_log_ticket_id ON ticket_stage_log (ticket_id);

CREATE TABLE ticket_work_log (
	id SERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	status_id INTEGER, 
	department_id INTEGER, 
	assignee_id UUID, 
	start_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_work_log_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_work_log_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_work_log_status_id_fkey FOREIGN KEY(status_id) REFERENCES status_master (status_id), 
	CONSTRAINT ticket_work_log_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id), 
	CONSTRAINT ticket_work_log_assignee_id_fkey FOREIGN KEY(assignee_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_work_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_work_log_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_work_log_ticket_id ON ticket_work_log (ticket_id);

CREATE TABLE subtasks (
	id SERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	code VARCHAR(200), 
	name VARCHAR(200), 
	tool_id INTEGER, 
	subscription_type_id INTEGER, 
	workflow_id INTEGER, 
	board_id INTEGER, 
	label_id INTEGER, 
	status_id INTEGER, 
	department_id INTEGER, 
	order_type_id INTEGER, 
	added_by_id UUID, 
	assigned_to_id UUID, 
	due_date TIMESTAMP WITH TIME ZONE, 
	position INTEGER, 
	notes TEXT, 
	requirement JSONB, 
	data JSONB, 
	check_list JSONB DEFAULT '[]'::jsonb, 
	priority_ids INTEGER[], 
	free_flow_label_ids INTEGER[], 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtasks_pkey PRIMARY KEY (id), 
	CONSTRAINT subtasks_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT subtasks_tool_id_fkey FOREIGN KEY(tool_id) REFERENCES tools (id), 
	CONSTRAINT subtasks_subscription_type_id_fkey FOREIGN KEY(subscription_type_id) REFERENCES subscription_types (id), 
	CONSTRAINT subtasks_workflow_id_fkey FOREIGN KEY(workflow_id) REFERENCES workflows (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_label_id_fkey FOREIGN KEY(label_id) REFERENCES board_labels (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_status_id_fkey FOREIGN KEY(status_id) REFERENCES status_master (status_id), 
	CONSTRAINT subtasks_department_id_fkey FOREIGN KEY(department_id) REFERENCES departments (id), 
	CONSTRAINT subtasks_order_type_id_fkey FOREIGN KEY(order_type_id) REFERENCES status_master (status_id), 
	CONSTRAINT subtasks_added_by_id_fkey FOREIGN KEY(added_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_assigned_to_id_fkey FOREIGN KEY(assigned_to_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtasks_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtasks_code ON subtasks (code);

CREATE INDEX ix_subtasks_label_id ON subtasks (label_id);

CREATE INDEX ix_subtasks_ticket_id ON subtasks (ticket_id);

CREATE INDEX ix_subtasks_board_id ON subtasks (board_id);

CREATE INDEX ix_subtasks_due_date ON subtasks (due_date);

CREATE INDEX ix_subtasks_assigned_to_id ON subtasks (assigned_to_id);

CREATE TABLE branding_attachments (
	id BIGSERIAL NOT NULL, 
	section_id BIGINT NOT NULL, 
	file_type VARCHAR(200), 
	file_name VARCHAR(200), 
	file_path VARCHAR(2000), 
	blob_name VARCHAR(200) NOT NULL, 
	blob_uri VARCHAR(2000) NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT branding_attachments_pkey PRIMARY KEY (id), 
	CONSTRAINT branding_attachments_section_id_fkey FOREIGN KEY(section_id) REFERENCES branding_sections (id) ON DELETE CASCADE, 
	CONSTRAINT branding_attachments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT branding_attachments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_branding_attachments_section_id ON branding_attachments (section_id);

CREATE TABLE branding_feedback (
	id BIGSERIAL NOT NULL, 
	section_id BIGINT NOT NULL, 
	feedback VARCHAR(3000), 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT branding_feedback_pkey PRIMARY KEY (id), 
	CONSTRAINT branding_feedback_section_id_fkey FOREIGN KEY(section_id) REFERENCES branding_sections (id) ON DELETE CASCADE, 
	CONSTRAINT branding_feedback_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT branding_feedback_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_branding_feedback_section_id ON branding_feedback (section_id);

CREATE TABLE ticket_attachments (
	id BIGSERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	comment_id BIGINT, 
	file_type VARCHAR(200), 
	file_name VARCHAR(200), 
	file_path VARCHAR(2000), 
	blob_name TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id), 
	CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_attachments_comment_id_fkey FOREIGN KEY(comment_id) REFERENCES ticket_comments (id) ON DELETE CASCADE, 
	CONSTRAINT ticket_attachments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT ticket_attachments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_ticket_attachments_comment_id ON ticket_attachments (comment_id);

CREATE INDEX ix_ticket_attachments_ticket_id ON ticket_attachments (ticket_id);

CREATE TABLE subtask_links (
	id SERIAL NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	name TEXT NOT NULL, 
	description TEXT, 
	link TEXT, 
	file_type TEXT, 
	file_name VARCHAR(200), 
	file_path VARCHAR(2000), 
	blob_name TEXT, 
	blob_uri TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_links_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_links_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_links_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_links_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_links_subtask_id ON subtask_links (subtask_id);

CREATE TABLE subtask_stage_log (
	id SERIAL NOT NULL, 
	ticket_id BIGINT NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	board_id INTEGER, 
	label_id INTEGER, 
	moved_by_id UUID, 
	moved_at TIMESTAMP WITH TIME ZONE, 
	sequence INTEGER NOT NULL, 
	action_id UUID, 
	is_moved BOOLEAN DEFAULT false NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_stage_log_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_stage_log_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_stage_log_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_stage_log_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_stage_log_label_id_fkey FOREIGN KEY(label_id) REFERENCES board_labels (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_stage_log_moved_by_id_fkey FOREIGN KEY(moved_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_stage_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_stage_log_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_stage_log_ticket_id ON subtask_stage_log (ticket_id);

CREATE INDEX ix_subtask_stage_log_subtask_id ON subtask_stage_log (subtask_id);

CREATE TABLE subtask_comments (
	id BIGSERIAL NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	ticket_id BIGINT, 
	type_id INTEGER, 
	content TEXT, 
	added_by_id UUID, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_comments_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_comments_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_comments_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_comments_type_id_fkey FOREIGN KEY(type_id) REFERENCES comment_types (id), 
	CONSTRAINT subtask_comments_added_by_id_fkey FOREIGN KEY(added_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_comments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_comments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_comments_subtask_id ON subtask_comments (subtask_id);

CREATE INDEX ix_subtask_comments_ticket_id ON subtask_comments (ticket_id);

CREATE TABLE subtask_delete_reasons (
	id SERIAL NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	reason_id INTEGER NOT NULL, 
	description TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_delete_reasons_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_delete_reasons_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_delete_reasons_reason_id_fkey FOREIGN KEY(reason_id) REFERENCES status_master (status_id), 
	CONSTRAINT subtask_delete_reasons_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_delete_reasons_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_delete_reasons_subtask_id ON subtask_delete_reasons (subtask_id);

CREATE TABLE subtask_due_date_log (
	id SERIAL NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	due_date TIMESTAMP WITH TIME ZONE, 
	reason TEXT, 
	sequence INTEGER NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_due_date_log_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_due_date_log_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_due_date_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_due_date_log_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_due_date_log_subtask_id ON subtask_due_date_log (subtask_id);

CREATE TABLE subtask_history (
	id BIGSERIAL NOT NULL, 
	subtask_id INTEGER NOT NULL, 
	workspace_id INTEGER, 
	history_data JSONB, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_history_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_history_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_history_workspace_id_fkey FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_history_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_history_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_history_subtask_id ON subtask_history (subtask_id);

CREATE TABLE subtask_assignees (
	id SERIAL NOT NULL, 
	stage_log_id INTEGER NOT NULL, 
	board_id INTEGER, 
	label_id INTEGER, 
	user_id UUID, 
	assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	unassigned_at TIMESTAMP WITH TIME ZONE, 
	is_unassigned BOOLEAN DEFAULT false NOT NULL, 
	sequence INTEGER DEFAULT '0' NOT NULL, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_assignees_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_assignees_stage_log_id_fkey FOREIGN KEY(stage_log_id) REFERENCES subtask_stage_log (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_assignees_board_id_fkey FOREIGN KEY(board_id) REFERENCES boards (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_assignees_label_id_fkey FOREIGN KEY(label_id) REFERENCES board_labels (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_assignees_user_id_fkey FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_assignees_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_assignees_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_assignees_stage_log_id ON subtask_assignees (stage_log_id);

CREATE INDEX ix_subtask_assignees_user_id ON subtask_assignees (user_id);

CREATE TABLE subtask_attachments (
	id BIGSERIAL NOT NULL, 
	subtask_id INTEGER, 
	ticket_id BIGINT, 
	comment_id BIGINT, 
	file_type VARCHAR(200), 
	file_name VARCHAR(200), 
	file_path VARCHAR(2000), 
	blob_name TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_attachments_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_attachments_subtask_id_fkey FOREIGN KEY(subtask_id) REFERENCES subtasks (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_attachments_ticket_id_fkey FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_attachments_comment_id_fkey FOREIGN KEY(comment_id) REFERENCES subtask_comments (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_attachments_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_attachments_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_attachments_subtask_id ON subtask_attachments (subtask_id);

CREATE INDEX ix_subtask_attachments_ticket_id ON subtask_attachments (ticket_id);

CREATE TABLE subtask_work_log (
	id SERIAL NOT NULL, 
	assignee_id INTEGER NOT NULL, 
	moved_by_id UUID, 
	start_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE, 
	type INTEGER, 
	remarks TEXT, 
	created_by_id UUID, 
	updated_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	CONSTRAINT subtask_work_log_pkey PRIMARY KEY (id), 
	CONSTRAINT subtask_work_log_assignee_id_fkey FOREIGN KEY(assignee_id) REFERENCES subtask_assignees (id) ON DELETE CASCADE, 
	CONSTRAINT subtask_work_log_moved_by_id_fkey FOREIGN KEY(moved_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_work_log_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL, 
	CONSTRAINT subtask_work_log_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_subtask_work_log_assignee_id ON subtask_work_log (assignee_id);

ALTER TABLE users ADD CONSTRAINT users_user_type_id_fkey FOREIGN KEY(user_type_id) REFERENCES status_master (status_id);

ALTER TABLE regions ADD CONSTRAINT regions_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT users_team_id_fkey FOREIGN KEY(team_id) REFERENCES teams (id);

ALTER TABLE users ADD CONSTRAINT users_country_id_fkey FOREIGN KEY(country_id) REFERENCES countries (id);

ALTER TABLE countries ADD CONSTRAINT countries_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE teams ADD CONSTRAINT teams_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE countries ADD CONSTRAINT countries_region_id_fkey FOREIGN KEY(region_id) REFERENCES regions (id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT users_default_workspace_id_fkey FOREIGN KEY(default_workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL;

ALTER TABLE teams ADD CONSTRAINT teams_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE designations ADD CONSTRAINT designations_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE regions ADD CONSTRAINT regions_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE tools ADD CONSTRAINT tools_current_version_id_fkey FOREIGN KEY(current_version_id) REFERENCES tool_versions (id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT users_previous_user_type_id_fkey FOREIGN KEY(previous_user_type_id) REFERENCES status_master (status_id);

ALTER TABLE users ADD CONSTRAINT users_designation_id_fkey FOREIGN KEY(designation_id) REFERENCES designations (id);

ALTER TABLE designations ADD CONSTRAINT designations_created_by_id_fkey FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE designations ADD CONSTRAINT designations_team_id_fkey FOREIGN KEY(team_id) REFERENCES teams (id) ON DELETE SET NULL;

ALTER TABLE countries ADD CONSTRAINT countries_updated_by_id_fkey FOREIGN KEY(updated_by_id) REFERENCES users (id) ON DELETE SET NULL;

