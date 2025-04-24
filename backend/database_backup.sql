--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_locations_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_locations_status AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public.enum_locations_status OWNER TO postgres;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'user'
);


ALTER TYPE public.enum_users_role OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin',
    'manager'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: work_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.work_category AS ENUM (
    '前置整理',
    '基肥翻土',
    '灌溉',
    '防蟲',
    '施肥',
    '除草',
    '整枝',
    '種植',
    '食農教育',
    '環境整潔',
    '擦雞蛋',
    '撿雞蛋',
    '出貨準備',
    '伙食準備',
    '採收',
    '加工領料',
    '加工入庫',
    '屠宰',
    '屠宰前置作業'
);


ALTER TYPE public.work_category OWNER TO postgres;

--
-- Name: work_log_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.work_log_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.work_log_status OWNER TO postgres;

--
-- Name: filter_expired_notices(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_expired_notices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 刪除已過期且非置頂的公告
    DELETE FROM notices 
    WHERE expires_at < CURRENT_TIMESTAMP 
      AND is_pinned = FALSE;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.filter_expired_notices() OWNER TO postgres;

--
-- Name: update_inventory_quantity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_inventory_quantity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.transaction_type = 'in' THEN
        -- 進貨，增加庫存
        UPDATE inventory_items 
        SET current_quantity = current_quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'out' THEN
        -- 領用，減少庫存
        UPDATE inventory_items 
        SET current_quantity = current_quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'adjust' THEN
        -- 直接調整為指定數量
        UPDATE inventory_items 
        SET current_quantity = NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_inventory_quantity() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


ALTER TABLE public."SequelizeMeta" OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    unit character varying(50) DEFAULT 'piece'::character varying NOT NULL,
    location character varying(255) DEFAULT 'default_warehouse'::character varying NOT NULL,
    category character varying(100) DEFAULT 'other'::character varying NOT NULL,
    minimum_stock numeric(10,2) DEFAULT 0 NOT NULL,
    description text,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: emergency_restock; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.emergency_restock AS
 SELECT name,
    category,
    quantity AS current_stock,
    minimum_stock,
    (minimum_stock - quantity) AS reorder_quantity,
    unit,
    'High'::text AS priority
   FROM public.inventory_items
  WHERE ((quantity = (0)::numeric) AND (minimum_stock > (0)::numeric))
  ORDER BY minimum_stock DESC;


ALTER VIEW public.emergency_restock OWNER TO postgres;

--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    inventory_item_id uuid NOT NULL,
    transaction_type character varying(20) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    user_id uuid,
    requester_name character varying(100),
    purpose character varying(200),
    work_log_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    area character varying(50) NOT NULL,
    description text,
    status public.enum_locations_status DEFAULT 'active'::public.enum_locations_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: notice_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notice_reads (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    notice_id uuid NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notice_reads OWNER TO postgres;

--
-- Name: notice_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notice_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notice_reads_id_seq OWNER TO postgres;

--
-- Name: notice_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notice_reads_id_seq OWNED BY public.notice_reads.id;


--
-- Name: notices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    author_id uuid NOT NULL,
    priority integer DEFAULT 1,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    attachment_url text,
    is_read boolean DEFAULT false
);


ALTER TABLE public.notices OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(10) NOT NULL,
    description text,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: COLUMN products.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.code IS '產品代碼';


--
-- Name: COLUMN products.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.name IS '產品名稱';


--
-- Name: COLUMN products.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.category IS '產品類別';


--
-- Name: COLUMN products.unit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.unit IS '單位';


--
-- Name: COLUMN products.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.description IS '產品描述';


--
-- Name: COLUMN products.price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.products.price IS '價格';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: restock_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.restock_report AS
 SELECT name,
    category,
    quantity AS current_stock,
    minimum_stock,
    (minimum_stock - quantity) AS reorder_quantity,
    unit,
        CASE
            WHEN (quantity = (0)::numeric) THEN 'High'::text
            WHEN (quantity <= (minimum_stock * 0.5)) THEN 'Medium'::text
            WHEN (quantity <= minimum_stock) THEN 'Low'::text
            ELSE 'Normal'::text
        END AS priority
   FROM public.inventory_items
  WHERE (quantity <= minimum_stock)
  ORDER BY
        CASE
            WHEN (quantity = (0)::numeric) THEN 1
            WHEN (quantity <= (minimum_stock * 0.5)) THEN 2
            WHEN (quantity <= minimum_stock) THEN 3
            ELSE 4
        END, category, name;


ALTER VIEW public.restock_report OWNER TO postgres;

--
-- Name: urgent_restock; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.urgent_restock AS
 SELECT name,
    category,
    quantity AS current_stock,
    minimum_stock,
    (minimum_stock - quantity) AS reorder_quantity,
    unit,
    'Medium'::text AS priority
   FROM public.inventory_items
  WHERE ((quantity > (0)::numeric) AND (quantity <= (minimum_stock * 0.5)))
  ORDER BY (quantity / minimum_stock);


ALTER VIEW public.urgent_restock OWNER TO postgres;

--
-- Name: user_feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_feedbacks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subject character varying(100) NOT NULL,
    content text NOT NULL,
    category character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone,
    resolver_id uuid
);


ALTER TABLE public.user_feedbacks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100),
    password_hash character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'user'::public.enum_users_role NOT NULL,
    google_id character varying(255),
    profile_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_backup (
    id integer,
    username character varying(255),
    email character varying(255),
    password_hash character varying(255),
    google_id character varying(255),
    name character varying(255),
    role character varying(255),
    profile_image_url character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.users_backup OWNER TO postgres;

--
-- Name: work_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_categories (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    cost_category integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.work_categories OWNER TO postgres;

--
-- Name: COLUMN work_categories.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.work_categories.code IS '工作內容代號';


--
-- Name: COLUMN work_categories.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.work_categories.name IS '工作內容名稱';


--
-- Name: COLUMN work_categories.cost_category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.work_categories.cost_category IS '成本類別';


--
-- Name: work_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_categories_id_seq OWNER TO postgres;

--
-- Name: work_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_categories_id_seq OWNED BY public.work_categories.id;


--
-- Name: work_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    location_code character varying(255) NOT NULL,
    position_name character varying(255) NOT NULL,
    work_category_name character varying(255) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    details text,
    harvest_quantity numeric(10,2),
    product_name character varying(255),
    product_quantity numeric(10,2),
    status character varying(255) DEFAULT 'pending'::character varying,
    reviewer_id uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.work_logs OWNER TO postgres;

--
-- Name: work_logs_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_logs_backup (
    id character varying(255),
    user_id integer,
    location_code character varying(255),
    position_name character varying(255),
    work_category_name character varying(255),
    start_time time without time zone,
    end_time time without time zone,
    details text,
    harvest_quantity numeric(10,2),
    product_name character varying(255),
    product_quantity numeric(10,2),
    status character varying(255),
    reviewer_id integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    work_hours numeric(5,2)
);


ALTER TABLE public.work_logs_backup OWNER TO postgres;

--
-- Name: work_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_types (
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    cost_type character varying(50) NOT NULL
);


ALTER TABLE public.work_types OWNER TO postgres;

--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: notice_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notice_reads ALTER COLUMN id SET DEFAULT nextval('public.notice_reads_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: work_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_categories ALTER COLUMN id SET DEFAULT nextval('public.work_categories_id_seq'::regclass);


--
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SequelizeMeta" (name) FROM stdin;
20240423_create_locations_table.js
20240423_create_products_table.js
20240423_create_work_categories_table.js
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, name, code, quantity, unit, location, category, minimum_stock, description, last_updated, created_at, updated_at) FROM stdin;
17cbba26-37fa-4fe4-b4d9-7226060cdae8	半雞切塊900g	28041010	48.00	盒	預設倉庫	其他	0.00		2025-04-21 08:11:44.224145+08	2025-04-21 08:11:44.224145+08	2025-04-21 10:31:55.355921+08
411934c0-c22b-4e19-9eef-b60144302f30	翅腿-300g	28041035	2.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.226876+08	2025-04-21 08:11:44.226876+08	2025-04-21 10:31:55.358931+08
5c1ab0b2-9578-48f9-aa54-682459ca1ebf	清胸-3kg/包	28041042	570.80	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.227268+08	2025-04-21 08:11:44.227268+08	2025-04-21 10:31:55.359272+08
7b7ce8d3-34ec-4cc5-aab6-d413a70844a9	雞清胸-（皮）-3kg/包	28041044	234.20	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.227657+08	2025-04-21 08:11:44.227657+08	2025-04-21 10:31:55.359572+08
630faa44-c1d7-4f13-8707-828b725d92ea	清胸肉（去皮）280g	28041045	53.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.228078+08	2025-04-21 08:11:44.228078+08	2025-04-21 10:31:55.359843+08
2f9eeca3-847f-4b56-9013-bf8dabb9d8af	雞清胸絞肉	28041046	6.50	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.228411+08	2025-04-21 08:11:44.228411+08	2025-04-21 10:31:55.360199+08
39903819-1078-4761-9299-1b226f6c171e	雞腳	28041130	95.70	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.232886+08	2025-04-21 08:11:44.232886+08	2025-04-21 10:31:55.365403+08
5a1bf243-2a4f-4eec-98b3-174afc3b84a3	翅腿-3kg/包	28041210	-2.70	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.234956+08	2025-04-21 08:11:44.234956+08	2025-04-21 10:31:55.368447+08
94804b39-1ae4-45dc-914b-1442e80d9205	馬告檸檬椒鹽舒肥雞胸(100g)/片	28042150	251.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.237484+08	2025-04-21 08:11:44.237484+08	2025-04-21 10:31:55.371009+08
245c3219-f3df-49bd-881e-08726b2c71c5	里肌200g	28041050	3.00	盒	預設倉庫	其他	0.00		2025-04-21 08:11:44.228753+08	2025-04-21 08:11:44.228753+08	2025-04-21 10:31:55.360551+08
f7c7c1f0-bd04-446a-a5c6-b6dd1f90b403	雞佛	28041060	6.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.22991+08	2025-04-21 08:11:44.22991+08	2025-04-21 10:31:55.361741+08
e1d258f0-98ec-498c-901a-81806ab3687c	雞心	28041070	60.70	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.230261+08	2025-04-21 08:11:44.230261+08	2025-04-21 10:31:55.362081+08
42f01758-33c8-41f7-906b-b7023c86852b	雞肫	28041080	4.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.23064+08	2025-04-21 08:11:44.23064+08	2025-04-21 10:31:55.362437+08
1920adf8-7ff9-42b9-bb4c-4e64dab142f6	雞頭脖	28041090	577.60	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.230951+08	2025-04-21 08:11:44.230951+08	2025-04-21 10:31:55.36274+08
a1bc279c-4b89-43dc-b39b-9cce12b15bd7	雞頭脖去皮-3kg/包	28041091	273.10	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.231255+08	2025-04-21 08:11:44.231255+08	2025-04-21 10:31:55.363062+08
b51db292-7ebf-4a7f-8708-c72a545df267	雞脖皮-3kg/包	28041092	133.30	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.231499+08	2025-04-21 08:11:44.231499+08	2025-04-21 10:31:55.363373+08
599bea77-7db0-4bab-98b3-86a60fda5dbd	雞骨(架）	28041100	1652.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.232078+08	2025-04-21 08:11:44.232078+08	2025-04-21 10:31:55.364042+08
51350248-7cf3-4e77-8e17-c4a98a6b8b2e	鴨胗	28041140	180.20	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.233192+08	2025-04-21 08:11:44.233192+08	2025-04-21 10:31:55.366019+08
83d3c805-d046-4ba9-8cf9-53945aa2e9d9	里肌-3kg/包	28041170	245.90	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.233839+08	2025-04-21 08:11:44.233839+08	2025-04-21 10:31:55.36685+08
8f9a4c55-0617-48b5-aef5-b35dcd1c7099	腿肉(帶皮帶踝-去骨)-3kg/包	28041191	1912.90	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.234404+08	2025-04-21 08:11:44.234404+08	2025-04-21 10:31:55.367673+08
a59c30db-b724-44d6-9e78-1d37dadee7c7	二節翅-3kg/包	28041200	54.40	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.234641+08	2025-04-21 08:11:44.234641+08	2025-04-21 10:31:55.368087+08
ab7c2ef6-059f-4da2-a711-838cab5cbd8f	腿肉-(高麗菜)水餃-100顆/包	28041231	49.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.235262+08	2025-04-21 08:11:44.235262+08	2025-04-21 10:31:55.368751+08
58aef29a-c07d-48e5-a9cf-ce95181bcfcc	鴨心	28041240	42.40	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.235523+08	2025-04-21 08:11:44.235523+08	2025-04-21 10:31:55.369089+08
6c4ce93a-3e64-45a4-aaea-e1f3e8ec6e55	雞肝	28041260	193.30	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.235754+08	2025-04-21 08:11:44.235754+08	2025-04-21 10:31:55.369436+08
ab7e43a9-1e06-4524-a744-329dbed5a8ed	鴨肝	28042050	74.20	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.236011+08	2025-04-21 08:11:44.236011+08	2025-04-21 10:31:55.369721+08
924af620-af8f-497b-82e1-1e37c037d0e5	三節翅（4支）600g	28041033	5.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.225996+08	2025-04-21 08:11:44.225996+08	2025-04-21 10:31:55.358147+08
18748f5a-bc88-4ccc-9bb7-a86de3bba8aa	2節翅-300g	28041034	-9.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.226425+08	2025-04-21 08:11:44.226425+08	2025-04-21 10:31:55.358563+08
a7d3a84e-262d-4e91-96d2-2613a6d11082	里肌220-230g	28041053	28.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.229353+08	2025-04-21 08:11:44.229353+08	2025-04-21 10:31:55.361428+08
abddf685-e9bc-438f-a72c-f2890d1f6383	雞尾椎	28041120	35.50	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.232471+08	2025-04-21 08:11:44.232471+08	2025-04-21 10:31:55.364709+08
255b905b-55ab-44c9-b5aa-c8aec898472c	清胸肉(帶皮)-3kg/包	28041160	-5.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.233501+08	2025-04-21 08:11:44.233501+08	2025-04-21 10:31:55.366489+08
cd1ac0b8-d607-4d9c-a263-084f2e4cb00b	腿肉(帶皮去骨)-3kg/包	28041190	-441.70	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.234136+08	2025-04-21 08:11:44.234136+08	2025-04-21 10:31:55.367335+08
859b2d7b-8bc1-4570-a94c-e97108c4df75	鵝肝	28042110	13.20	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.236306+08	2025-04-21 08:11:44.236306+08	2025-04-21 10:31:55.370036+08
50d2b69b-80e8-402c-8015-c09a9ace397e	雞肉切塊3kg/包	28042120	31.40	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.236549+08	2025-04-21 08:11:44.236549+08	2025-04-21 10:31:55.370406+08
1ba40c58-6ff8-4507-a67e-bb4e46c1f18d	雞腿(骨)	28042130	88.90	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.236832+08	2025-04-21 08:11:44.236832+08	2025-04-21 10:31:55.370701+08
9c255c1a-ad3e-4ccd-b7fc-3c8d828fb996	馬告檸檬椒鹽舒肥雞腿(100g)	28042160	41.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.237845+08	2025-04-21 08:11:44.237845+08	2025-04-21 10:31:55.371496+08
4142a15d-0c3c-4bc7-ad30-50c3a778f82b	伊莎雞蛋	28040010	18212.00	顆	預設倉庫	其他	0.00		2025-04-21 08:11:44.213042+08	2025-04-21 08:11:44.213042+08	2025-04-21 10:31:55.350142+08
53f6788a-28b7-49ae-bf90-a793af41029e	伊莎雞蛋10入	28040011	-2851.00	盒	預設倉庫	其他	0.00		2025-04-21 08:11:44.222951+08	2025-04-21 08:11:44.222951+08	2025-04-21 10:31:55.354441+08
3fa5fa80-a7c6-4833-bb9a-ba4d6c552e23	黃金雞	28040040	1174.80	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.223414+08	2025-04-21 08:11:44.223414+08	2025-04-21 10:31:55.355056+08
d0791d07-5dfe-4c3d-b7e0-b14e28c0ef3e	鵝胗	28040062	21.80	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.223771+08	2025-04-21 08:11:44.223771+08	2025-04-21 10:31:55.355495+08
6bd9eff6-48f2-4326-b84d-a2a042f7e1a3	腿肉切塊600g	28041020	-42.00	盒	預設倉庫	其他	0.00		2025-04-21 08:11:44.224462+08	2025-04-21 08:11:44.224462+08	2025-04-21 10:31:55.35632+08
d823dfe3-532f-4d1f-8d01-3235f4b68d72	腿肉切塊600g	28041021	85.00	包	預設倉庫	其他	0.00		2025-04-21 08:11:44.224756+08	2025-04-21 08:11:44.224756+08	2025-04-21 10:31:55.356703+08
177ffb93-e4ee-4744-8666-f73b0d5df84b	三節翅500g	28041030	27.00	盒	預設倉庫	其他	0.00		2025-04-21 08:11:44.225147+08	2025-04-21 08:11:44.225147+08	2025-04-21 10:31:55.357072+08
71c51c9c-774d-4ba7-b526-7484938540e3	三節翅-3kg/包	28041032	797.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.225596+08	2025-04-21 08:11:44.225596+08	2025-04-21 10:31:55.357618+08
3fcd91bb-81ed-41f0-89fc-81aaaa59c4b5	鴨內臟	28042170	15.00	斤	預設倉庫	其他	0.00		2025-04-21 08:11:44.238173+08	2025-04-21 08:11:44.238173+08	2025-04-21 10:31:55.371815+08
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, inventory_item_id, transaction_type, quantity, user_id, requester_name, purpose, work_log_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locations (id, code, name, area, description, status, created_at, updated_at) FROM stdin;
2	DC001	小空地01	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
3	DC002	小空地02	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
4	DC003	小空地03	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
5	DC004	小空地04	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
6	DC005	小空地05	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
7	DC006	小空地06	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
8	DC007	小空地07	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
9	DC008	小空地08	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
10	DC009	小空地09	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
11	DC010	小空地10-圍籬	未分類		active	2025-04-23 10:48:54.598+08	2025-04-23 10:48:54.598+08
12	DC011	小空地11	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
13	DC012	小空地-奇異果區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
14	DC013	小空地-樹葡萄果區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
15	DD001	大空地A1	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
16	DD002	大空地A2	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
17	DD003	大空地A3	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
18	DD004	大空地A4	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
19	DD005	大空地A5	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
20	DD006	大空地A6	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
21	DD007	大空地A7	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
22	DD008	大空地A8	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
23	DD009	大空地A9	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
24	DD010	大空地A10	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
25	DD011	大空地A11	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
26	DD012	大空地A12	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
27	DD013	大空地A13	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
28	DD014	大空地A14	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
29	DD015	大空地A15	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
30	DD016	大空地A16	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
31	DD017	大空地A17	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
32	DD018	大空地A18	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
33	DD019	大空地A19	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
34	DD020	大空地A20	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
35	DD021	大空地A21	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
36	DD022	大空地A22	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
37	DD023	大空地A23	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
38	DD024	大空地A24	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
39	DD025	大空地A25	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
40	DD026	大空地A26	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
41	DD027	大空地A27	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
42	DD028	大空地A28	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
43	DD029	大空地A29	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
44	DD030	堆肥區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
45	DD031	出貨區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
46	DD032	廚房	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
47	DD033	乾燥室	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
48	DD034	大空地-圍牆	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
49	DE001	河床邊	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
50	DF001	魚池	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
51	DF002	肉雞舍	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
52	DF003	蛋雞舍	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
53	DG001	黃金果區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
54	DH101	溫室一	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
55	DH201	溫室二	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
56	DH301	溫室三之一	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
57	DH302	溫室三之二	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
58	DH303	溫室三之三	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
59	DH304	溫室三之四	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
60	DH305	溫室三之五	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
61	DH306	溫室三之六	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
62	DH307	溫室三之七	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
63	DL001	蘭花園	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
64	DN001	南林	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
65	DS001	育苗室	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
66	DS002	育苗室埔里農莊寄放	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
67	PL001	水果區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
68	PL002	蔬菜區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
69	PL003	樸門區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
70	PL004	茶品區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
71	A01	溫室1號	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
72	A02	溫室2號	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
73	A03	溫室3號	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
74	A04	溫室4號	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
75	A05	溫室5號	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
76	B01	露天田區1	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
77	B02	露天田區2	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
78	B03	露天田區3	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
79	B04	露天田區4	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
80	B05	露天田區5	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
81	C01	育苗室1	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
82	C02	育苗室2	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
83	C03	育苗室3	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
84	D01	包裝區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
85	D02	倉儲區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
86	D03	加工區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
87	E01	堆肥區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
88	E02	資材區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
89	E03	工具區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
90	F01	辦公室	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
91	F02	會議室	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
92	F03	休息區	未分類		active	2025-04-23 10:48:54.599+08	2025-04-23 10:48:54.599+08
\.


--
-- Data for Name: notice_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notice_reads (id, user_id, notice_id, read_at) FROM stdin;
1	47c52968-9dca-4951-82f5-ca34aa6c686b	b01050d1-9f17-40b6-9c6c-e15bd0881dcb	2025-03-19 09:44:06.961093
3	356ba676-db76-45a6-8a47-20a9686e0aab	b01050d1-9f17-40b6-9c6c-e15bd0881dcb	2025-03-19 11:24:57.266671
9	66d9c648-3504-4f40-9a43-ab6984208041	1edd1167-b3db-4722-8752-5f57a47cccab	2025-04-22 15:48:04.682214
10	11f4cad1-42cd-4fd7-9267-a8cdbdf88246	1edd1167-b3db-4722-8752-5f57a47cccab	2025-04-22 18:38:51.873582
\.


--
-- Data for Name: notices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notices (id, title, content, author_id, priority, is_pinned, created_at, expires_at, attachment_url, is_read) FROM stdin;
b01050d1-9f17-40b6-9c6c-e15bd0881dcb	中餐	吃便當	356ba676-db76-45a6-8a47-20a9686e0aab	1	f	2025-03-19 09:31:34.964654+08	\N	\N	t
1edd1167-b3db-4722-8752-5f57a47cccab	123	321	11f4cad1-42cd-4fd7-9267-a8cdbdf88246	1	f	2025-04-22 10:05:29.033672+08	\N	\N	f
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, category, unit, description, price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_feedbacks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_feedbacks (id, user_id, subject, content, category, status, priority, created_at, resolved_at, resolver_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, google_id, profile_image_url, is_active, last_login, created_at, updated_at) FROM stdin;
86e2c3a5-ddd5-4255-a7e0-36821fcc3961	test	test@example.com	/f3SI9HU.4WxGq4jdVJmK1t4UrGYVQhEUEY.0zMi	user	\N	\N	t	\N	2025-04-24 13:29:28.792436+08	2025-04-24 13:29:28.792436+08
f8b7727e-62e8-4b7f-91d7-fb567c2b88a2	1224	test1224@example.com	$2b$10$/XW86zg/NkPnO93keGSEre2c0Bg6L.Ra2AMIB61d7MfSlwcaSA/Si	admin	\N	\N	t	2025-04-24 13:56:35.961038+08	2025-04-24 13:53:18.892159+08	2025-04-24 13:53:18.892159+08
\.


--
-- Data for Name: users_backup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users_backup (id, username, email, password_hash, google_id, name, role, profile_image_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_categories (id, code, name, cost_category, created_at, updated_at) FROM stdin;
1	WA	(1)-前製整理	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
2	WB	(2)-基肥翻土	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
3	WC	(3)-種植	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
4	WD	(4)-灌溉	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
5	WE	(5)-病蟲害防治	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
6	WF	(6)-施肥	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
7	WG	(7)-除草	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
8	WH	(8)-採收	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
9	WI	(9)-整枝(蔓)修剪	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
10	WJ	出貨準備	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
11	WK	伙食準備	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
12	WL	活動(食農教育)	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
13	WM	加工-領料	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
14	WN	加工-入庫	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
15	WO	育苗-領料	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
16	WP	育苗-入庫	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
17	WQ	加工品-領料	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
18	WR	加工品-入庫	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
19	WS	(10)-育苗	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
20	WT	(11)-疏苗(間拔)	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
21	WU	(12)-定植(移植)	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
22	WV	(13)-套袋	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
23	WW	溫室採光罩塑膠清苔清洗	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
24	WZ	其它-請註明工作內容	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
25	YA	餵食	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
26	YB	環境整潔	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
27	YC	撿雞蛋	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
28	YD	洗(擦)雞蛋	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
29	YE	包裝入庫	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
30	YF	屠宰前置作業	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
31	YG	屠宰	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
32	YH	屠宰/分切(外包)	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
33	YI	化製	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
34	YJ	領料	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
35	YK	入庫	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
36	YS	屠宰費	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
37	YZ	雜項-請註明工作內容	0	2025-04-23 10:50:00.602+08	2025-04-23 10:50:00.602+08
\.


--
-- Data for Name: work_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_logs (id, user_id, location_code, position_name, work_category_name, start_time, end_time, details, harvest_quantity, product_name, product_quantity, status, reviewer_id, reviewed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_logs_backup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_logs_backup (id, user_id, location_code, position_name, work_category_name, start_time, end_time, details, harvest_quantity, product_name, product_quantity, status, reviewer_id, reviewed_at, created_at, updated_at, work_hours) FROM stdin;
\.


--
-- Data for Name: work_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_types (code, name, cost_type) FROM stdin;
\.


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.locations_id_seq', 274, true);


--
-- Name: notice_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notice_reads_id_seq', 10, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 1, false);


--
-- Name: work_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.work_categories_id_seq', 37, true);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: inventory_items inventory_items_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_code_key UNIQUE (code);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: locations locations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_code_key UNIQUE (code);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: notice_reads notice_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notice_reads
    ADD CONSTRAINT notice_reads_pkey PRIMARY KEY (id);


--
-- Name: notice_reads notice_reads_user_id_notice_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notice_reads
    ADD CONSTRAINT notice_reads_user_id_notice_id_key UNIQUE (user_id, notice_id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: user_feedbacks user_feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_feedbacks
    ADD CONSTRAINT user_feedbacks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- Name: users users_email_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key6 UNIQUE (email);


--
-- Name: users users_email_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key7 UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_google_id_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key1 UNIQUE (google_id);


--
-- Name: users users_google_id_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key2 UNIQUE (google_id);


--
-- Name: users users_google_id_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key3 UNIQUE (google_id);


--
-- Name: users users_google_id_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key4 UNIQUE (google_id);


--
-- Name: users users_google_id_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key5 UNIQUE (google_id);


--
-- Name: users users_google_id_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key6 UNIQUE (google_id);


--
-- Name: users users_google_id_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key7 UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users users_username_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key1 UNIQUE (username);


--
-- Name: users users_username_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key2 UNIQUE (username);


--
-- Name: users users_username_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key3 UNIQUE (username);


--
-- Name: users users_username_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key4 UNIQUE (username);


--
-- Name: users users_username_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key5 UNIQUE (username);


--
-- Name: users users_username_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key6 UNIQUE (username);


--
-- Name: users users_username_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key7 UNIQUE (username);


--
-- Name: work_categories work_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_categories
    ADD CONSTRAINT work_categories_code_key UNIQUE (code);


--
-- Name: work_categories work_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_categories
    ADD CONSTRAINT work_categories_pkey PRIMARY KEY (id);


--
-- Name: work_logs work_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_pkey PRIMARY KEY (id);


--
-- Name: work_types work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_types
    ADD CONSTRAINT work_types_pkey PRIMARY KEY (code);


--
-- Name: idx_feedbacks_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedbacks_priority ON public.user_feedbacks USING btree (priority);


--
-- Name: idx_feedbacks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedbacks_status ON public.user_feedbacks USING btree (status);


--
-- Name: idx_feedbacks_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedbacks_user ON public.user_feedbacks USING btree (user_id);


--
-- Name: idx_inventory_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_category ON public.inventory_items USING btree (category);


--
-- Name: idx_inventory_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_code ON public.inventory_items USING btree (code);


--
-- Name: idx_notice_reads_user_notice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_notice_reads_user_notice ON public.notice_reads USING btree (user_id, notice_id);


--
-- Name: idx_notices_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notices_author ON public.notices USING btree (author_id);


--
-- Name: idx_notices_expiration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notices_expiration ON public.notices USING btree (expires_at);


--
-- Name: idx_notices_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notices_priority ON public.notices USING btree (priority);


--
-- Name: idx_transaction_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_date ON public.inventory_transactions USING btree (created_at);


--
-- Name: idx_transaction_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_item_id ON public.inventory_transactions USING btree (inventory_item_id);


--
-- Name: idx_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_type ON public.inventory_transactions USING btree (transaction_type);


--
-- Name: idx_transaction_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_user_id ON public.inventory_transactions USING btree (user_id);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.inventory_transactions USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_google_id ON public.users USING btree (google_id) WHERE (google_id IS NOT NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: locations_area; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX locations_area ON public.locations USING btree (area);


--
-- Name: locations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX locations_status ON public.locations USING btree (status);


--
-- Name: products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_category ON public.products USING btree (category);


--
-- Name: products_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_code ON public.products USING btree (code);


--
-- Name: work_categories_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_categories_code ON public.work_categories USING btree (code);


--
-- Name: work_categories_cost_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_categories_cost_category ON public.work_categories USING btree (cost_category);


--
-- Name: notices remove_expired_notices; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER remove_expired_notices AFTER INSERT OR UPDATE ON public.notices FOR EACH STATEMENT EXECUTE FUNCTION public.filter_expired_notices();


--
-- Name: inventory_transactions trigger_update_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_inventory AFTER INSERT ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.update_inventory_quantity();


--
-- Name: notice_reads notice_reads_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notice_reads
    ADD CONSTRAINT notice_reads_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.notices(id);


--
-- Name: work_logs work_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

