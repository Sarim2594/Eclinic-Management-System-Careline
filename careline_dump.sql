--
-- PostgreSQL database dump
--

\restrict BLK7ZeVtQdOBV42chW2vBucMhF3AXMgZ48TTReNCgHdPLnb9Ty43F74iswqNEvt

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-04-01 22:53:26

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 244 (class 1259 OID 245922)
-- Name: admin_change_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_change_requests (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    request_type character varying(50) NOT NULL,
    requested_data text NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_change_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['password_reset'::character varying, 'contact_change'::character varying, 'general_query'::character varying])::text[]))),
    CONSTRAINT admin_change_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.admin_change_requests OWNER TO neondb_owner;

--
-- TOC entry 243 (class 1259 OID 245921)
-- Name: admin_change_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_change_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_change_requests_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5376 (class 0 OID 0)
-- Dependencies: 243
-- Name: admin_change_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_change_requests_id_seq OWNED BY public.admin_change_requests.id;


--
-- TOC entry 242 (class 1259 OID 245899)
-- Name: admin_regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_regions (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    region_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_regions OWNER TO neondb_owner;

--
-- TOC entry 241 (class 1259 OID 245898)
-- Name: admin_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_regions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5377 (class 0 OID 0)
-- Dependencies: 241
-- Name: admin_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_regions_id_seq OWNED BY public.admin_regions.id;


--
-- TOC entry 240 (class 1259 OID 245874)
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO neondb_owner;

--
-- TOC entry 239 (class 1259 OID 245873)
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5378 (class 0 OID 0)
-- Dependencies: 239
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- TOC entry 254 (class 1259 OID 246048)
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    clinic_id integer NOT NULL,
    ticket_no integer NOT NULL,
    vitals jsonb DEFAULT '{}'::jsonb,
    diagnosis text DEFAULT ''::text,
    prescription text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    status character varying(20) DEFAULT 'waiting'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO neondb_owner;

--
-- TOC entry 253 (class 1259 OID 246047)
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5379 (class 0 OID 0)
-- Dependencies: 253
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- TOC entry 250 (class 1259 OID 246006)
-- Name: availability_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.availability_schedules (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT availability_schedules_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);


ALTER TABLE public.availability_schedules OWNER TO neondb_owner;

--
-- TOC entry 249 (class 1259 OID 246005)
-- Name: availability_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.availability_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.availability_schedules_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 249
-- Name: availability_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.availability_schedules_id_seq OWNED BY public.availability_schedules.id;


--
-- TOC entry 256 (class 1259 OID 246085)
-- Name: bulletins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulletins (
    id integer NOT NULL,
    company_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bulletins OWNER TO neondb_owner;

--
-- TOC entry 255 (class 1259 OID 246084)
-- Name: bulletins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bulletins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bulletins_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 255
-- Name: bulletins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bulletins_id_seq OWNED BY public.bulletins.id;


--
-- TOC entry 232 (class 1259 OID 245779)
-- Name: cities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    region_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cities OWNER TO neondb_owner;

--
-- TOC entry 231 (class 1259 OID 245778)
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cities_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 231
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- TOC entry 234 (class 1259 OID 245797)
-- Name: clinics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinics (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    location character varying(255) NOT NULL,
    city_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clinics_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.clinics OWNER TO neondb_owner;

--
-- TOC entry 233 (class 1259 OID 245796)
-- Name: clinics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clinics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinics_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 233
-- Name: clinics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clinics_id_seq OWNED BY public.clinics.id;


--
-- TOC entry 228 (class 1259 OID 245742)
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    contact character varying(20) NOT NULL,
    registration_number character varying(100) NOT NULL,
    address text NOT NULL,
    subscription_plan character varying(50) DEFAULT 'purchase'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))),
    CONSTRAINT companies_subscription_plan_check CHECK (((subscription_plan)::text = ANY ((ARRAY['purchase'::character varying, 'rental'::character varying, 'per_consultation_with_doctor'::character varying, 'per_consultation_without_doctor'::character varying])::text[])))
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- TOC entry 227 (class 1259 OID 245741)
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 227
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- TOC entry 222 (class 1259 OID 228346)
-- Name: doctor_unavailability_admin_notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_unavailability_admin_notification (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    doctor_id integer NOT NULL,
    shift_date date NOT NULL,
    shift_start_time time without time zone CONSTRAINT doctor_unavailability_admin_notificat_shift_start_time_not_null NOT NULL,
    notification_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.doctor_unavailability_admin_notification OWNER TO neondb_owner;

--
-- TOC entry 221 (class 1259 OID 228345)
-- Name: doctor_unavailability_admin_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctor_unavailability_admin_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_unavailability_admin_notification_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 221
-- Name: doctor_unavailability_admin_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctor_unavailability_admin_notification_id_seq OWNED BY public.doctor_unavailability_admin_notification.id;


--
-- TOC entry 260 (class 1259 OID 246143)
-- Name: doctor_unavailability_notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_unavailability_notification (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    shift_date date NOT NULL,
    shift_start_time time without time zone NOT NULL,
    admin_notified boolean DEFAULT false,
    notification_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.doctor_unavailability_notification OWNER TO neondb_owner;

--
-- TOC entry 259 (class 1259 OID 246142)
-- Name: doctor_unavailability_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctor_unavailability_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_unavailability_notification_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 259
-- Name: doctor_unavailability_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctor_unavailability_notification_id_seq OWNED BY public.doctor_unavailability_notification.id;


--
-- TOC entry 252 (class 1259 OID 246025)
-- Name: doctor_unavailability_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_unavailability_requests (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    start_datetime timestamp without time zone NOT NULL,
    end_datetime timestamp without time zone NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doctor_unavailability_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.doctor_unavailability_requests OWNER TO neondb_owner;

--
-- TOC entry 251 (class 1259 OID 246024)
-- Name: doctor_unavailability_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctor_unavailability_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_unavailability_requests_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 251
-- Name: doctor_unavailability_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctor_unavailability_requests_id_seq OWNED BY public.doctor_unavailability_requests.id;


--
-- TOC entry 248 (class 1259 OID 245970)
-- Name: doctors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctors (
    id integer NOT NULL,
    user_id integer NOT NULL,
    clinic_id integer NOT NULL,
    name character varying(255) NOT NULL,
    specialization_id integer,
    license_number character varying(50) NOT NULL,
    contact character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    missed_shifts_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doctors_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.doctors OWNER TO neondb_owner;

--
-- TOC entry 247 (class 1259 OID 245969)
-- Name: doctors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.doctors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctors_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 247
-- Name: doctors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.doctors_id_seq OWNED BY public.doctors.id;


--
-- TOC entry 258 (class 1259 OID 246105)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    recipient_type character varying(20) NOT NULL,
    recipient_id integer,
    patient_id integer,
    doctor_id integer,
    receptionist_id integer,
    clinic_id integer,
    clinic_name character varying(255),
    title character varying(255) NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_recipient CHECK (((((recipient_type)::text = 'superadmin'::text) AND (recipient_id IS NULL)) OR (((recipient_type)::text = 'admin'::text) AND (recipient_id IS NOT NULL)) OR (((recipient_type)::text = 'doctor'::text) AND (recipient_id IS NOT NULL)) OR (((recipient_type)::text = 'receptionist'::text) AND (recipient_id IS NOT NULL)))),
    CONSTRAINT notifications_recipient_type_check CHECK (((recipient_type)::text = ANY ((ARRAY['superadmin'::character varying, 'admin'::character varying, 'doctor'::character varying, 'receptionist'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- TOC entry 257 (class 1259 OID 246104)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 257
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 220 (class 1259 OID 91548)
-- Name: pakistan_regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pakistan_regions (
    id integer NOT NULL,
    city character varying(100) NOT NULL,
    sub_region character varying(100) NOT NULL,
    province character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pakistan_regions OWNER TO neondb_owner;

--
-- TOC entry 219 (class 1259 OID 91547)
-- Name: pakistan_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pakistan_regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pakistan_regions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 219
-- Name: pakistan_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pakistan_regions_id_seq OWNED BY public.pakistan_regions.id;


--
-- TOC entry 236 (class 1259 OID 245824)
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    age integer NOT NULL,
    gender character varying(10) NOT NULL,
    father_name character varying(255) NOT NULL,
    marital_status character varying(10) NOT NULL,
    contact character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    address character varying(255) NOT NULL,
    cnic character varying(20) NOT NULL,
    occupation character varying(100),
    nationality character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patients_age_check CHECK (((age >= 0) AND (age <= 150))),
    CONSTRAINT patients_gender_check CHECK (((gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying])::text[]))),
    CONSTRAINT patients_marital_status_check CHECK (((marital_status)::text = ANY ((ARRAY['Married'::character varying, 'Single'::character varying])::text[])))
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- TOC entry 235 (class 1259 OID 245823)
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 235
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- TOC entry 246 (class 1259 OID 245945)
-- Name: receptionists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receptionists (
    id integer NOT NULL,
    user_id integer NOT NULL,
    clinic_id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.receptionists OWNER TO neondb_owner;

--
-- TOC entry 245 (class 1259 OID 245944)
-- Name: receptionists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receptionists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receptionists_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 245
-- Name: receptionists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receptionists_id_seq OWNED BY public.receptionists.id;


--
-- TOC entry 230 (class 1259 OID 245766)
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    province character varying(50) NOT NULL,
    sub_region character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.regions OWNER TO neondb_owner;

--
-- TOC entry 229 (class 1259 OID 245765)
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 229
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- TOC entry 224 (class 1259 OID 236712)
-- Name: specializations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.specializations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.specializations OWNER TO neondb_owner;

--
-- TOC entry 223 (class 1259 OID 236711)
-- Name: specializations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.specializations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specializations_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 223
-- Name: specializations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.specializations_id_seq OWNED BY public.specializations.id;


--
-- TOC entry 238 (class 1259 OID 245855)
-- Name: superadmins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.superadmins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.superadmins OWNER TO neondb_owner;

--
-- TOC entry 237 (class 1259 OID 245854)
-- Name: superadmins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.superadmins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.superadmins_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 237
-- Name: superadmins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.superadmins_id_seq OWNED BY public.superadmins.id;


--
-- TOC entry 226 (class 1259 OID 245722)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['superadmin'::character varying, 'admin'::character varying, 'doctor'::character varying, 'receptionist'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- TOC entry 225 (class 1259 OID 245721)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4984 (class 2604 OID 245925)
-- Name: admin_change_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_change_requests ALTER COLUMN id SET DEFAULT nextval('public.admin_change_requests_id_seq'::regclass);


--
-- TOC entry 4982 (class 2604 OID 245902)
-- Name: admin_regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_regions ALTER COLUMN id SET DEFAULT nextval('public.admin_regions_id_seq'::regclass);


--
-- TOC entry 4980 (class 2604 OID 245877)
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- TOC entry 5002 (class 2604 OID 246051)
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 246009)
-- Name: availability_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_schedules ALTER COLUMN id SET DEFAULT nextval('public.availability_schedules_id_seq'::regclass);


--
-- TOC entry 5010 (class 2604 OID 246088)
-- Name: bulletins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulletins ALTER COLUMN id SET DEFAULT nextval('public.bulletins_id_seq'::regclass);


--
-- TOC entry 4970 (class 2604 OID 245782)
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- TOC entry 4972 (class 2604 OID 245800)
-- Name: clinics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics ALTER COLUMN id SET DEFAULT nextval('public.clinics_id_seq'::regclass);


--
-- TOC entry 4964 (class 2604 OID 245745)
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- TOC entry 4958 (class 2604 OID 228349)
-- Name: doctor_unavailability_admin_notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_admin_notification ALTER COLUMN id SET DEFAULT nextval('public.doctor_unavailability_admin_notification_id_seq'::regclass);


--
-- TOC entry 5016 (class 2604 OID 246146)
-- Name: doctor_unavailability_notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_notification ALTER COLUMN id SET DEFAULT nextval('public.doctor_unavailability_notification_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 246028)
-- Name: doctor_unavailability_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_requests ALTER COLUMN id SET DEFAULT nextval('public.doctor_unavailability_requests_id_seq'::regclass);


--
-- TOC entry 4990 (class 2604 OID 245973)
-- Name: doctors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors ALTER COLUMN id SET DEFAULT nextval('public.doctors_id_seq'::regclass);


--
-- TOC entry 5013 (class 2604 OID 246108)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4956 (class 2604 OID 91551)
-- Name: pakistan_regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pakistan_regions ALTER COLUMN id SET DEFAULT nextval('public.pakistan_regions_id_seq'::regclass);


--
-- TOC entry 4975 (class 2604 OID 245827)
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- TOC entry 4988 (class 2604 OID 245948)
-- Name: receptionists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptionists ALTER COLUMN id SET DEFAULT nextval('public.receptionists_id_seq'::regclass);


--
-- TOC entry 4968 (class 2604 OID 245769)
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- TOC entry 4960 (class 2604 OID 236715)
-- Name: specializations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations ALTER COLUMN id SET DEFAULT nextval('public.specializations_id_seq'::regclass);


--
-- TOC entry 4978 (class 2604 OID 245858)
-- Name: superadmins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superadmins ALTER COLUMN id SET DEFAULT nextval('public.superadmins_id_seq'::regclass);


--
-- TOC entry 4962 (class 2604 OID 245725)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5354 (class 0 OID 245922)
-- Dependencies: 244
-- Data for Name: admin_change_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_change_requests (id, admin_id, request_type, requested_data, reason, status, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5352 (class 0 OID 245899)
-- Dependencies: 242
-- Data for Name: admin_regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_regions (id, admin_id, region_id, created_at) FROM stdin;
1	1	1	2026-01-10 17:05:10.654027
2	1	2	2026-01-10 17:05:10.654027
3	1	3	2026-01-10 17:05:10.654027
4	1	4	2026-01-10 17:05:10.654027
5	1	5	2026-01-10 17:05:10.654027
6	2	6	2026-01-10 17:05:10.654027
7	2	7	2026-01-10 17:05:10.654027
8	2	8	2026-01-10 17:05:10.654027
9	2	9	2026-01-10 17:05:10.654027
10	3	10	2026-01-10 17:05:10.654027
11	3	11	2026-01-10 17:05:10.654027
12	3	12	2026-01-10 17:05:10.654027
13	3	13	2026-01-10 17:05:10.654027
14	4	14	2026-01-10 17:05:10.654027
15	4	15	2026-01-10 17:05:10.654027
16	4	16	2026-01-10 17:05:10.654027
17	4	17	2026-01-10 17:05:10.654027
18	4	18	2026-01-10 17:05:10.654027
19	5	19	2026-01-10 17:05:10.654027
20	5	20	2026-01-10 17:05:10.654027
21	5	21	2026-01-10 17:05:10.654027
22	6	1	2026-01-10 17:05:10.654027
23	6	2	2026-01-10 17:05:10.654027
24	6	3	2026-01-10 17:05:10.654027
25	6	4	2026-01-10 17:05:10.654027
26	6	5	2026-01-10 17:05:10.654027
27	6	10	2026-01-10 17:05:10.654027
28	6	11	2026-01-10 17:05:10.654027
29	6	12	2026-01-10 17:05:10.654027
30	6	13	2026-01-10 17:05:10.654027
31	7	6	2026-01-10 17:05:10.654027
32	7	7	2026-01-10 17:05:10.654027
33	7	8	2026-01-10 17:05:10.654027
34	7	9	2026-01-10 17:05:10.654027
35	7	14	2026-01-10 17:05:10.654027
36	7	15	2026-01-10 17:05:10.654027
37	7	16	2026-01-10 17:05:10.654027
38	7	17	2026-01-10 17:05:10.654027
39	7	18	2026-01-10 17:05:10.654027
40	8	19	2026-01-10 17:05:10.654027
41	8	20	2026-01-10 17:05:10.654027
42	8	21	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5350 (class 0 OID 245874)
-- Dependencies: 240
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, user_id, company_id, name, contact, created_at) FROM stdin;
1	2	1	Sarim Khan	+923001110001	2026-01-10 17:05:10.654027
2	3	1	Zainab Ali	+923001110002	2026-01-10 17:05:10.654027
3	4	1	Omar Farooq	+923001110003	2026-01-10 17:05:10.654027
4	5	1	Fatima Zahra	+923001110004	2026-01-10 17:05:10.654027
5	6	1	Hassan Askari	+923001110005	2026-01-10 17:05:10.654027
6	7	2	Usman Tariq	+923002220001	2026-01-10 17:05:10.654027
7	8	2	Ayesha Khan	+923002220002	2026-01-10 17:05:10.654027
8	9	2	Hamza Malik	+923002220003	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5364 (class 0 OID 246048)
-- Dependencies: 254
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, patient_id, doctor_id, clinic_id, ticket_no, vitals, diagnosis, prescription, notes, status, created_at, started_at, ended_at, updated_at) FROM stdin;
1	6	6	2	338	{"pulse": 68, "bp_systolic": 113, "temperature": 99.2, "bp_diastolic": 88}	Migraine	Panadol 500mg BID	Patient complains of headache	completed	2025-12-21 05:35:10.862854	2025-12-21 05:35:10.862854	2025-12-21 05:55:10.862854	2026-01-10 17:05:10.654027
2	86	1	1	575	{"pulse": 72, "bp_systolic": 138, "temperature": 97.6, "bp_diastolic": 89}	Lower Back Pain	Risek 40mg OD	Patient complains of headache	completed	2026-01-13 10:05:10.862854	2026-01-13 10:05:10.862854	2026-01-13 10:25:10.862854	2026-01-10 17:05:10.654027
3	4	11	5	960	{"pulse": 64, "bp_systolic": 123, "temperature": 99.5, "bp_diastolic": 79}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-06 04:20:10.862854	2026-01-06 04:20:10.862854	2026-01-06 04:40:10.862854	2026-01-10 17:05:10.654027
4	1	7	3	110	{"pulse": 98, "bp_systolic": 115, "temperature": 97.5, "bp_diastolic": 79}	Migraine	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-14 09:05:10.862854	2026-01-14 09:05:10.862854	2026-01-14 09:25:10.862854	2026-01-10 17:05:10.654027
5	49	11	5	851	{"pulse": 61, "bp_systolic": 125, "temperature": 98.1, "bp_diastolic": 81}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of fever	completed	2025-12-27 05:20:10.862854	2025-12-27 05:20:10.862854	2025-12-27 05:40:10.862854	2026-01-10 17:05:10.654027
6	23	17	8	710	{"pulse": 78, "bp_systolic": 132, "temperature": 98.4, "bp_diastolic": 77}	Acute Pharyngitis	Risek 40mg OD	Patient complains of fever	completed	2026-01-16 06:35:10.862854	2026-01-16 06:35:10.862854	2026-01-16 06:55:10.862854	2026-01-10 17:05:10.654027
7	50	12	5	400	{"pulse": 73, "bp_systolic": 111, "temperature": 97.8, "bp_diastolic": 83}	Seasonal Flu	Augmentin 625mg BD	Patient complains of stomach pain	completed	2026-01-02 07:50:10.862854	2026-01-02 07:50:10.862854	2026-01-02 08:10:10.862854	2026-01-10 17:05:10.654027
8	71	16	7	989	{"pulse": 79, "bp_systolic": 117, "temperature": 99.1, "bp_diastolic": 72}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-26 02:35:10.862854	2025-12-26 02:35:10.862854	2025-12-26 02:55:10.862854	2026-01-10 17:05:10.654027
9	28	11	5	433	{"pulse": 86, "bp_systolic": 113, "temperature": 99.3, "bp_diastolic": 74}	Seasonal Flu	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-18 03:50:10.862854	2025-12-18 03:50:10.862854	2025-12-18 04:10:10.862854	2026-01-10 17:05:10.654027
10	25	9	4	839	{"pulse": 85, "bp_systolic": 127, "temperature": 98.7, "bp_diastolic": 80}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-23 03:35:10.862854	2025-12-23 03:35:10.862854	2025-12-23 03:55:10.862854	2026-01-10 17:05:10.654027
11	25	10	4	755	{"pulse": 91, "bp_systolic": 117, "temperature": 98.9, "bp_diastolic": 75}	Seasonal Flu	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-12 02:50:10.862854	2026-01-12 02:50:10.862854	2026-01-12 03:10:10.862854	2026-01-10 17:05:10.654027
12	83	6	2	441	{"pulse": 68, "bp_systolic": 139, "temperature": 98.8, "bp_diastolic": 72}	Hypertension	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-25 07:05:10.862854	2025-12-25 07:05:10.862854	2025-12-25 07:25:10.862854	2026-01-10 17:05:10.654027
13	50	7	3	438	{"pulse": 94, "bp_systolic": 110, "temperature": 98.8, "bp_diastolic": 71}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of cough	completed	2026-01-12 07:05:10.862854	2026-01-12 07:05:10.862854	2026-01-12 07:25:10.862854	2026-01-10 17:05:10.654027
14	73	3	1	343	{"pulse": 90, "bp_systolic": 114, "temperature": 98.6, "bp_diastolic": 88}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2026-01-18 05:50:10.862854	2026-01-18 05:50:10.862854	2026-01-18 06:10:10.862854	2026-01-10 17:05:10.654027
15	75	6	2	540	{"pulse": 80, "bp_systolic": 112, "temperature": 97.6, "bp_diastolic": 78}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-26 10:20:10.862854	2025-12-26 10:20:10.862854	2025-12-26 10:40:10.862854	2026-01-10 17:05:10.654027
16	73	13	6	959	{"pulse": 73, "bp_systolic": 115, "temperature": 98.2, "bp_diastolic": 77}	Migraine	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-28 06:20:10.862854	2025-12-28 06:20:10.862854	2025-12-28 06:40:10.862854	2026-01-10 17:05:10.654027
17	31	8	3	532	{"pulse": 77, "bp_systolic": 117, "temperature": 97.6, "bp_diastolic": 88}	Seasonal Flu	Panadol 500mg BID	Patient complains of fatigue	completed	2026-01-15 10:20:10.862854	2026-01-15 10:20:10.862854	2026-01-15 10:40:10.862854	2026-01-10 17:05:10.654027
18	52	15	7	534	{"pulse": 99, "bp_systolic": 112, "temperature": 99.1, "bp_diastolic": 74}	Migraine	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-01 10:50:10.862854	2026-01-01 10:50:10.862854	2026-01-01 11:10:10.862854	2026-01-10 17:05:10.654027
19	86	16	7	559	{"pulse": 78, "bp_systolic": 117, "temperature": 99.3, "bp_diastolic": 70}	Lower Back Pain	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-16 10:50:10.862854	2026-01-16 10:50:10.862854	2026-01-16 11:10:10.862854	2026-01-10 17:05:10.654027
20	13	18	8	340	{"pulse": 82, "bp_systolic": 118, "temperature": 99.5, "bp_diastolic": 78}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-07 04:50:10.862854	2026-01-07 04:50:10.862854	2026-01-07 05:10:10.862854	2026-01-10 17:05:10.654027
21	26	18	8	654	{"pulse": 92, "bp_systolic": 121, "temperature": 97.9, "bp_diastolic": 72}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-09 03:05:10.862854	2026-01-09 03:05:10.862854	2026-01-09 03:25:10.862854	2026-01-10 17:05:10.654027
22	97	16	7	552	{"pulse": 98, "bp_systolic": 115, "temperature": 98.9, "bp_diastolic": 87}	Gastritis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-17 04:05:10.862854	2025-12-17 04:05:10.862854	2025-12-17 04:25:10.862854	2026-01-10 17:05:10.654027
23	21	4	2	636	{"pulse": 74, "bp_systolic": 137, "temperature": 99.2, "bp_diastolic": 90}	Lower Back Pain	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-14 07:35:10.862854	2026-01-14 07:35:10.862854	2026-01-14 07:55:10.862854	2026-01-10 17:05:10.654027
24	83	10	4	152	{"pulse": 89, "bp_systolic": 122, "temperature": 98.7, "bp_diastolic": 83}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-22 02:05:10.862854	2025-12-22 02:05:10.862854	2025-12-22 02:25:10.862854	2026-01-10 17:05:10.654027
25	65	9	4	183	{"pulse": 61, "bp_systolic": 128, "temperature": 98.9, "bp_diastolic": 85}	Acute Pharyngitis	Risek 40mg OD	Patient complains of fever	completed	2026-01-09 10:50:10.862854	2026-01-09 10:50:10.862854	2026-01-09 11:10:10.862854	2026-01-10 17:05:10.654027
26	83	1	1	785	{"pulse": 83, "bp_systolic": 122, "temperature": 98.5, "bp_diastolic": 89}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of cough	completed	2026-01-11 02:20:10.862854	2026-01-11 02:20:10.862854	2026-01-11 02:40:10.862854	2026-01-10 17:05:10.654027
27	92	10	4	512	{"pulse": 77, "bp_systolic": 112, "temperature": 98.9, "bp_diastolic": 86}	Migraine	Panadol 500mg BID	Patient complains of headache	completed	2026-01-10 07:20:10.862854	2026-01-10 07:20:10.862854	2026-01-10 07:40:10.862854	2026-01-10 17:05:10.654027
28	89	9	4	452	{"pulse": 83, "bp_systolic": 122, "temperature": 97.6, "bp_diastolic": 82}	Seasonal Flu	Panadol 500mg BID	Patient complains of fever	completed	2026-01-07 08:20:10.862854	2026-01-07 08:20:10.862854	2026-01-07 08:40:10.862854	2026-01-10 17:05:10.654027
29	52	17	8	938	{"pulse": 79, "bp_systolic": 130, "temperature": 98.1, "bp_diastolic": 84}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-01 07:20:10.862854	2026-01-01 07:20:10.862854	2026-01-01 07:40:10.862854	2026-01-10 17:05:10.654027
30	88	18	8	402	{"pulse": 99, "bp_systolic": 115, "temperature": 98.6, "bp_diastolic": 71}	Migraine	Sunny D Capsule Weekly	Patient complains of headache	completed	2025-12-28 07:35:10.862854	2025-12-28 07:35:10.862854	2025-12-28 07:55:10.862854	2026-01-10 17:05:10.654027
31	77	2	1	197	{"pulse": 79, "bp_systolic": 114, "temperature": 97.9, "bp_diastolic": 76}	Upper Respiratory Infection	Panadol 500mg BID	Patient complains of cough	completed	2025-12-20 04:05:10.862854	2025-12-20 04:05:10.862854	2025-12-20 04:25:10.862854	2026-01-10 17:05:10.654027
32	75	14	6	383	{"pulse": 100, "bp_systolic": 113, "temperature": 97.9, "bp_diastolic": 84}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-15 09:50:10.862854	2026-01-15 09:50:10.862854	2026-01-15 10:10:10.862854	2026-01-10 17:05:10.654027
33	30	16	7	649	{"pulse": 60, "bp_systolic": 111, "temperature": 98.0, "bp_diastolic": 72}	Migraine	Sunny D Capsule Weekly	Patient complains of headache	completed	2025-12-23 02:35:10.862854	2025-12-23 02:35:10.862854	2025-12-23 02:55:10.862854	2026-01-10 17:05:10.654027
34	92	12	5	285	{"pulse": 90, "bp_systolic": 129, "temperature": 99.4, "bp_diastolic": 83}	Seasonal Flu	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-29 03:20:10.862854	2025-12-29 03:20:10.862854	2025-12-29 03:40:10.862854	2026-01-10 17:05:10.654027
35	65	2	1	120	{"pulse": 85, "bp_systolic": 114, "temperature": 97.9, "bp_diastolic": 77}	Seasonal Flu	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-16 03:35:10.862854	2026-01-16 03:35:10.862854	2026-01-16 03:55:10.862854	2026-01-10 17:05:10.654027
36	89	6	2	951	{"pulse": 67, "bp_systolic": 125, "temperature": 98.9, "bp_diastolic": 75}	Gastritis	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-08 08:50:10.862854	2026-01-08 08:50:10.862854	2026-01-08 09:10:10.862854	2026-01-10 17:05:10.654027
37	91	6	2	516	{"pulse": 89, "bp_systolic": 111, "temperature": 97.7, "bp_diastolic": 86}	Gastritis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2025-12-28 07:20:10.862854	2025-12-28 07:20:10.862854	2025-12-28 07:40:10.862854	2026-01-10 17:05:10.654027
38	100	5	2	648	{"pulse": 64, "bp_systolic": 139, "temperature": 99.0, "bp_diastolic": 77}	Hypertension	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-12 04:20:10.862854	2025-12-12 04:20:10.862854	2025-12-12 04:40:10.862854	2026-01-10 17:05:10.654027
39	76	4	2	509	{"pulse": 87, "bp_systolic": 120, "temperature": 99.2, "bp_diastolic": 74}	Hypertension	Panadol 500mg BID	Patient complains of fever	completed	2026-01-08 04:05:10.862854	2026-01-08 04:05:10.862854	2026-01-08 04:25:10.862854	2026-01-10 17:05:10.654027
40	73	10	4	210	{"pulse": 89, "bp_systolic": 133, "temperature": 98.9, "bp_diastolic": 89}	Gastritis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-12 07:20:10.862854	2026-01-12 07:20:10.862854	2026-01-12 07:40:10.862854	2026-01-10 17:05:10.654027
41	29	15	7	546	{"pulse": 69, "bp_systolic": 126, "temperature": 97.9, "bp_diastolic": 72}	Seasonal Flu	Panadol 500mg BID	Patient complains of fever	completed	2026-01-15 07:35:10.862854	2026-01-15 07:35:10.862854	2026-01-15 07:55:10.862854	2026-01-10 17:05:10.654027
42	26	15	7	116	{"pulse": 82, "bp_systolic": 126, "temperature": 97.7, "bp_diastolic": 70}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-17 04:50:10.862854	2026-01-17 04:50:10.862854	2026-01-17 05:10:10.862854	2026-01-10 17:05:10.654027
43	15	17	8	406	{"pulse": 63, "bp_systolic": 110, "temperature": 98.2, "bp_diastolic": 73}	Migraine	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-21 10:50:10.862854	2025-12-21 10:50:10.862854	2025-12-21 11:10:10.862854	2026-01-10 17:05:10.654027
44	19	8	3	775	{"pulse": 66, "bp_systolic": 116, "temperature": 99.3, "bp_diastolic": 89}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of headache	completed	2026-01-16 06:35:10.862854	2026-01-16 06:35:10.862854	2026-01-16 06:55:10.862854	2026-01-10 17:05:10.654027
45	24	3	1	628	{"pulse": 96, "bp_systolic": 114, "temperature": 99.4, "bp_diastolic": 83}	Migraine	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-16 06:35:10.862854	2026-01-16 06:35:10.862854	2026-01-16 06:55:10.862854	2026-01-10 17:05:10.654027
46	53	14	6	950	{"pulse": 88, "bp_systolic": 121, "temperature": 99.0, "bp_diastolic": 86}	Gastritis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-15 08:50:10.862854	2025-12-15 08:50:10.862854	2025-12-15 09:10:10.862854	2026-01-10 17:05:10.654027
47	62	16	7	741	{"pulse": 99, "bp_systolic": 132, "temperature": 98.4, "bp_diastolic": 74}	Gastritis	Risek 40mg OD	Patient complains of fatigue	completed	2026-01-04 07:20:10.862854	2026-01-04 07:20:10.862854	2026-01-04 07:40:10.862854	2026-01-10 17:05:10.654027
48	15	12	5	324	{"pulse": 90, "bp_systolic": 113, "temperature": 97.6, "bp_diastolic": 87}	Seasonal Flu	Panadol 500mg BID	Patient complains of fever	completed	2025-12-13 07:35:10.862854	2025-12-13 07:35:10.862854	2025-12-13 07:55:10.862854	2026-01-10 17:05:10.654027
49	82	8	3	798	{"pulse": 94, "bp_systolic": 110, "temperature": 97.7, "bp_diastolic": 81}	Gastritis	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-10 08:20:10.862854	2026-01-10 08:20:10.862854	2026-01-10 08:40:10.862854	2026-01-10 17:05:10.654027
50	67	11	5	654	{"pulse": 72, "bp_systolic": 137, "temperature": 98.9, "bp_diastolic": 85}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-18 07:05:10.862854	2025-12-18 07:05:10.862854	2025-12-18 07:25:10.862854	2026-01-10 17:05:10.654027
51	56	4	2	434	{"pulse": 96, "bp_systolic": 131, "temperature": 98.5, "bp_diastolic": 87}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-17 05:35:10.862854	2025-12-17 05:35:10.862854	2025-12-17 05:55:10.862854	2026-01-10 17:05:10.654027
52	40	8	3	205	{"pulse": 92, "bp_systolic": 125, "temperature": 99.5, "bp_diastolic": 80}	Lower Back Pain	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-14 10:20:10.862854	2026-01-14 10:20:10.862854	2026-01-14 10:40:10.862854	2026-01-10 17:05:10.654027
53	93	5	2	174	{"pulse": 69, "bp_systolic": 137, "temperature": 98.4, "bp_diastolic": 79}	Lower Back Pain	Augmentin 625mg BD	Patient complains of cough	completed	2025-12-25 04:20:10.862854	2025-12-25 04:20:10.862854	2025-12-25 04:40:10.862854	2026-01-10 17:05:10.654027
54	68	12	5	482	{"pulse": 99, "bp_systolic": 130, "temperature": 98.4, "bp_diastolic": 82}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of cough	completed	2025-12-21 06:20:10.862854	2025-12-21 06:20:10.862854	2025-12-21 06:40:10.862854	2026-01-10 17:05:10.654027
55	72	6	2	899	{"pulse": 84, "bp_systolic": 136, "temperature": 99.2, "bp_diastolic": 76}	Seasonal Flu	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-15 05:50:10.862854	2025-12-15 05:50:10.862854	2025-12-15 06:10:10.862854	2026-01-10 17:05:10.654027
56	100	11	5	662	{"pulse": 91, "bp_systolic": 124, "temperature": 99.0, "bp_diastolic": 83}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-25 02:35:10.862854	2025-12-25 02:35:10.862854	2025-12-25 02:55:10.862854	2026-01-10 17:05:10.654027
57	49	6	2	465	{"pulse": 72, "bp_systolic": 129, "temperature": 98.1, "bp_diastolic": 71}	Hypertension	Risek 40mg OD	Patient complains of fatigue	completed	2025-12-13 06:50:10.862854	2025-12-13 06:50:10.862854	2025-12-13 07:10:10.862854	2026-01-10 17:05:10.654027
58	14	13	6	663	{"pulse": 65, "bp_systolic": 114, "temperature": 97.9, "bp_diastolic": 79}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of fatigue	completed	2025-12-22 07:35:10.862854	2025-12-22 07:35:10.862854	2025-12-22 07:55:10.862854	2026-01-10 17:05:10.654027
59	55	10	4	250	{"pulse": 63, "bp_systolic": 121, "temperature": 98.5, "bp_diastolic": 88}	Lower Back Pain	Risek 40mg OD	Patient complains of fever	completed	2026-01-12 04:50:10.862854	2026-01-12 04:50:10.862854	2026-01-12 05:10:10.862854	2026-01-10 17:05:10.654027
60	12	7	3	723	{"pulse": 87, "bp_systolic": 133, "temperature": 97.6, "bp_diastolic": 77}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-15 09:20:10.862854	2026-01-15 09:20:10.862854	2026-01-15 09:40:10.862854	2026-01-10 17:05:10.654027
61	16	5	2	886	{"pulse": 87, "bp_systolic": 139, "temperature": 99.0, "bp_diastolic": 84}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-25 09:20:10.862854	2025-12-25 09:20:10.862854	2025-12-25 09:40:10.862854	2026-01-10 17:05:10.654027
62	36	17	8	933	{"pulse": 99, "bp_systolic": 124, "temperature": 97.9, "bp_diastolic": 70}	Lower Back Pain	Augmentin 625mg BD	Patient complains of cough	completed	2025-12-13 08:50:10.862854	2025-12-13 08:50:10.862854	2025-12-13 09:10:10.862854	2026-01-10 17:05:10.654027
63	86	1	1	823	{"pulse": 96, "bp_systolic": 114, "temperature": 99.4, "bp_diastolic": 85}	Seasonal Flu	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-15 07:05:10.862854	2025-12-15 07:05:10.862854	2025-12-15 07:25:10.862854	2026-01-10 17:05:10.654027
64	53	13	6	250	{"pulse": 70, "bp_systolic": 129, "temperature": 97.5, "bp_diastolic": 88}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-26 09:05:10.862854	2025-12-26 09:05:10.862854	2025-12-26 09:25:10.862854	2026-01-10 17:05:10.654027
65	71	1	1	645	{"pulse": 93, "bp_systolic": 118, "temperature": 97.8, "bp_diastolic": 85}	Lower Back Pain	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-04 09:05:10.862854	2026-01-04 09:05:10.862854	2026-01-04 09:25:10.862854	2026-01-10 17:05:10.654027
66	40	14	6	818	{"pulse": 66, "bp_systolic": 121, "temperature": 98.8, "bp_diastolic": 88}	Migraine	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-04 09:20:10.862854	2026-01-04 09:20:10.862854	2026-01-04 09:40:10.862854	2026-01-10 17:05:10.654027
67	22	9	4	190	{"pulse": 91, "bp_systolic": 128, "temperature": 98.0, "bp_diastolic": 71}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fever	completed	2025-12-27 03:20:10.862854	2025-12-27 03:20:10.862854	2025-12-27 03:40:10.862854	2026-01-10 17:05:10.654027
68	56	2	1	478	{"pulse": 63, "bp_systolic": 127, "temperature": 99.2, "bp_diastolic": 77}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-26 07:50:10.862854	2025-12-26 07:50:10.862854	2025-12-26 08:10:10.862854	2026-01-10 17:05:10.654027
69	98	12	5	950	{"pulse": 94, "bp_systolic": 134, "temperature": 99.4, "bp_diastolic": 87}	Lower Back Pain	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-02 07:35:10.862854	2026-01-02 07:35:10.862854	2026-01-02 07:55:10.862854	2026-01-10 17:05:10.654027
70	11	12	5	258	{"pulse": 83, "bp_systolic": 137, "temperature": 98.7, "bp_diastolic": 82}	Hypertension	Risek 40mg OD	Patient complains of fever	completed	2026-01-05 08:05:10.862854	2026-01-05 08:05:10.862854	2026-01-05 08:25:10.862854	2026-01-10 17:05:10.654027
71	68	2	1	175	{"pulse": 82, "bp_systolic": 111, "temperature": 98.8, "bp_diastolic": 87}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-29 07:50:10.862854	2025-12-29 07:50:10.862854	2025-12-29 08:10:10.862854	2026-01-10 17:05:10.654027
72	40	5	2	258	{"pulse": 72, "bp_systolic": 128, "temperature": 98.2, "bp_diastolic": 86}	Migraine	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-25 06:05:10.862854	2025-12-25 06:05:10.862854	2025-12-25 06:25:10.862854	2026-01-10 17:05:10.654027
73	38	14	6	570	{"pulse": 81, "bp_systolic": 126, "temperature": 98.9, "bp_diastolic": 70}	Hypertension	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-18 07:05:10.862854	2025-12-18 07:05:10.862854	2025-12-18 07:25:10.862854	2026-01-10 17:05:10.654027
74	89	3	1	441	{"pulse": 60, "bp_systolic": 126, "temperature": 99.3, "bp_diastolic": 74}	Migraine	Risek 40mg OD	Patient complains of fever	completed	2025-12-13 03:20:10.862854	2025-12-13 03:20:10.862854	2025-12-13 03:40:10.862854	2026-01-10 17:05:10.654027
75	96	4	2	651	{"pulse": 65, "bp_systolic": 119, "temperature": 98.6, "bp_diastolic": 70}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of fatigue	completed	2026-01-12 10:35:10.862854	2026-01-12 10:35:10.862854	2026-01-12 10:55:10.862854	2026-01-10 17:05:10.654027
76	32	17	8	601	{"pulse": 83, "bp_systolic": 131, "temperature": 98.4, "bp_diastolic": 90}	Lower Back Pain	Risek 40mg OD	Patient complains of fatigue	completed	2025-12-17 02:20:10.862854	2025-12-17 02:20:10.862854	2025-12-17 02:40:10.862854	2026-01-10 17:05:10.654027
77	19	7	3	555	{"pulse": 66, "bp_systolic": 120, "temperature": 98.4, "bp_diastolic": 81}	Gastritis	Brufen 400mg TDS	Patient complains of cough	completed	2025-12-19 07:50:10.862854	2025-12-19 07:50:10.862854	2025-12-19 08:10:10.862854	2026-01-10 17:05:10.654027
78	95	8	3	748	{"pulse": 98, "bp_systolic": 139, "temperature": 98.9, "bp_diastolic": 73}	Gastritis	Brufen 400mg TDS	Patient complains of fever	completed	2025-12-30 03:05:10.862854	2025-12-30 03:05:10.862854	2025-12-30 03:25:10.862854	2026-01-10 17:05:10.654027
79	39	15	7	287	{"pulse": 78, "bp_systolic": 118, "temperature": 98.2, "bp_diastolic": 84}	Hypertension	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-08 09:05:10.862854	2026-01-08 09:05:10.862854	2026-01-08 09:25:10.862854	2026-01-10 17:05:10.654027
80	94	17	8	423	{"pulse": 95, "bp_systolic": 114, "temperature": 99.4, "bp_diastolic": 79}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of cough	completed	2025-12-23 07:20:10.862854	2025-12-23 07:20:10.862854	2025-12-23 07:40:10.862854	2026-01-10 17:05:10.654027
81	29	18	8	497	{"pulse": 97, "bp_systolic": 114, "temperature": 98.8, "bp_diastolic": 73}	Seasonal Flu	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-16 08:05:10.862854	2026-01-16 08:05:10.862854	2026-01-16 08:25:10.862854	2026-01-10 17:05:10.654027
82	24	14	6	900	{"pulse": 82, "bp_systolic": 127, "temperature": 99.2, "bp_diastolic": 71}	Seasonal Flu	Panadol 500mg BID	Patient complains of cough	completed	2025-12-21 03:35:10.862854	2025-12-21 03:35:10.862854	2025-12-21 03:55:10.862854	2026-01-10 17:05:10.654027
83	89	4	2	988	{"pulse": 66, "bp_systolic": 118, "temperature": 99.1, "bp_diastolic": 83}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-27 10:20:10.862854	2025-12-27 10:20:10.862854	2025-12-27 10:40:10.862854	2026-01-10 17:05:10.654027
84	89	9	4	943	{"pulse": 64, "bp_systolic": 121, "temperature": 99.3, "bp_diastolic": 79}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-07 03:20:10.862854	2026-01-07 03:20:10.862854	2026-01-07 03:40:10.862854	2026-01-10 17:05:10.654027
85	49	14	6	314	{"pulse": 70, "bp_systolic": 119, "temperature": 97.5, "bp_diastolic": 71}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-15 05:20:10.862854	2025-12-15 05:20:10.862854	2025-12-15 05:40:10.862854	2026-01-10 17:05:10.654027
86	38	4	2	490	{"pulse": 94, "bp_systolic": 120, "temperature": 99.2, "bp_diastolic": 85}	Gastritis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-12 06:50:10.862854	2025-12-12 06:50:10.862854	2025-12-12 07:10:10.862854	2026-01-10 17:05:10.654027
87	94	15	7	836	{"pulse": 94, "bp_systolic": 112, "temperature": 98.0, "bp_diastolic": 71}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-18 07:50:10.862854	2025-12-18 07:50:10.862854	2025-12-18 08:10:10.862854	2026-01-10 17:05:10.654027
88	84	14	6	954	{"pulse": 65, "bp_systolic": 110, "temperature": 97.8, "bp_diastolic": 83}	Lower Back Pain	Risek 40mg OD	Patient complains of fever	completed	2025-12-27 10:20:10.862854	2025-12-27 10:20:10.862854	2025-12-27 10:40:10.862854	2026-01-10 17:05:10.654027
89	36	5	2	744	{"pulse": 84, "bp_systolic": 134, "temperature": 98.5, "bp_diastolic": 71}	Gastritis	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-14 05:50:10.862854	2026-01-14 05:50:10.862854	2026-01-14 06:10:10.862854	2026-01-10 17:05:10.654027
90	45	12	5	224	{"pulse": 67, "bp_systolic": 126, "temperature": 97.6, "bp_diastolic": 83}	Hypertension	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-15 08:20:10.862854	2025-12-15 08:20:10.862854	2025-12-15 08:40:10.862854	2026-01-10 17:05:10.654027
91	82	11	5	542	{"pulse": 73, "bp_systolic": 128, "temperature": 98.9, "bp_diastolic": 85}	Hypertension	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-24 09:05:10.862854	2025-12-24 09:05:10.862854	2025-12-24 09:25:10.862854	2026-01-10 17:05:10.654027
92	21	5	2	198	{"pulse": 85, "bp_systolic": 119, "temperature": 97.5, "bp_diastolic": 89}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-12 09:20:10.862854	2025-12-12 09:20:10.862854	2025-12-12 09:40:10.862854	2026-01-10 17:05:10.654027
93	49	17	8	426	{"pulse": 96, "bp_systolic": 125, "temperature": 97.8, "bp_diastolic": 87}	Gastritis	Panadol 500mg BID	Patient complains of cough	completed	2025-12-12 05:50:10.862854	2025-12-12 05:50:10.862854	2025-12-12 06:10:10.862854	2026-01-10 17:05:10.654027
94	10	8	3	976	{"pulse": 67, "bp_systolic": 136, "temperature": 98.9, "bp_diastolic": 87}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-11 07:35:10.862854	2026-01-11 07:35:10.862854	2026-01-11 07:55:10.862854	2026-01-10 17:05:10.654027
95	98	11	5	528	{"pulse": 69, "bp_systolic": 118, "temperature": 97.5, "bp_diastolic": 81}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-27 10:35:10.862854	2025-12-27 10:35:10.862854	2025-12-27 10:55:10.862854	2026-01-10 17:05:10.654027
96	15	5	2	901	{"pulse": 99, "bp_systolic": 116, "temperature": 98.2, "bp_diastolic": 89}	Hypertension	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-19 03:20:10.862854	2025-12-19 03:20:10.862854	2025-12-19 03:40:10.862854	2026-01-10 17:05:10.654027
97	75	13	6	845	{"pulse": 75, "bp_systolic": 122, "temperature": 98.0, "bp_diastolic": 71}	Acute Pharyngitis	Risek 40mg OD	Patient complains of fatigue	completed	2025-12-20 08:50:10.862854	2025-12-20 08:50:10.862854	2025-12-20 09:10:10.862854	2026-01-10 17:05:10.654027
98	37	2	1	941	{"pulse": 89, "bp_systolic": 114, "temperature": 99.2, "bp_diastolic": 80}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-14 07:20:10.862854	2025-12-14 07:20:10.862854	2025-12-14 07:40:10.862854	2026-01-10 17:05:10.654027
99	48	6	2	609	{"pulse": 94, "bp_systolic": 116, "temperature": 98.4, "bp_diastolic": 88}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of headache	completed	2025-12-23 08:50:10.862854	2025-12-23 08:50:10.862854	2025-12-23 09:10:10.862854	2026-01-10 17:05:10.654027
100	74	11	5	601	{"pulse": 80, "bp_systolic": 139, "temperature": 99.0, "bp_diastolic": 78}	Migraine	Risek 40mg OD	Patient complains of headache	completed	2025-12-18 09:35:10.862854	2025-12-18 09:35:10.862854	2025-12-18 09:55:10.862854	2026-01-10 17:05:10.654027
101	58	14	6	333	{"pulse": 93, "bp_systolic": 128, "temperature": 98.6, "bp_diastolic": 74}	Lower Back Pain	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-01 06:35:10.862854	2026-01-01 06:35:10.862854	2026-01-01 06:55:10.862854	2026-01-10 17:05:10.654027
102	12	17	8	794	{"pulse": 80, "bp_systolic": 139, "temperature": 98.4, "bp_diastolic": 74}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-10 07:50:10.862854	2026-01-10 07:50:10.862854	2026-01-10 08:10:10.862854	2026-01-10 17:05:10.654027
103	43	10	4	111	{"pulse": 99, "bp_systolic": 139, "temperature": 99.1, "bp_diastolic": 78}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-23 08:50:10.862854	2025-12-23 08:50:10.862854	2025-12-23 09:10:10.862854	2026-01-10 17:05:10.654027
104	75	4	2	747	{"pulse": 78, "bp_systolic": 133, "temperature": 98.0, "bp_diastolic": 75}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2025-12-20 06:20:10.862854	2025-12-20 06:20:10.862854	2025-12-20 06:40:10.862854	2026-01-10 17:05:10.654027
105	55	2	1	929	{"pulse": 68, "bp_systolic": 127, "temperature": 99.4, "bp_diastolic": 71}	Gastritis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2025-12-12 07:20:10.862854	2025-12-12 07:20:10.862854	2025-12-12 07:40:10.862854	2026-01-10 17:05:10.654027
106	44	11	5	579	{"pulse": 71, "bp_systolic": 120, "temperature": 99.0, "bp_diastolic": 71}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of stomach pain	completed	2026-01-09 02:05:10.862854	2026-01-09 02:05:10.862854	2026-01-09 02:25:10.862854	2026-01-10 17:05:10.654027
107	10	4	2	602	{"pulse": 78, "bp_systolic": 131, "temperature": 98.7, "bp_diastolic": 87}	Gastritis	Risek 40mg OD	Patient complains of fever	completed	2025-12-19 07:35:10.862854	2025-12-19 07:35:10.862854	2025-12-19 07:55:10.862854	2026-01-10 17:05:10.654027
108	29	11	5	678	{"pulse": 88, "bp_systolic": 113, "temperature": 98.2, "bp_diastolic": 88}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of stomach pain	completed	2025-12-23 02:35:10.862854	2025-12-23 02:35:10.862854	2025-12-23 02:55:10.862854	2026-01-10 17:05:10.654027
109	43	15	7	273	{"pulse": 61, "bp_systolic": 116, "temperature": 97.6, "bp_diastolic": 75}	Hypertension	Risek 40mg OD	Patient complains of headache	completed	2025-12-20 10:35:10.862854	2025-12-20 10:35:10.862854	2025-12-20 10:55:10.862854	2026-01-10 17:05:10.654027
110	73	12	5	928	{"pulse": 79, "bp_systolic": 114, "temperature": 99.3, "bp_diastolic": 90}	Acute Pharyngitis	Risek 40mg OD	Patient complains of headache	completed	2026-01-16 04:35:10.862854	2026-01-16 04:35:10.862854	2026-01-16 04:55:10.862854	2026-01-10 17:05:10.654027
111	15	16	7	933	{"pulse": 78, "bp_systolic": 128, "temperature": 99.0, "bp_diastolic": 73}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of headache	completed	2025-12-22 04:35:10.862854	2025-12-22 04:35:10.862854	2025-12-22 04:55:10.862854	2026-01-10 17:05:10.654027
112	97	12	5	294	{"pulse": 70, "bp_systolic": 130, "temperature": 99.1, "bp_diastolic": 70}	Hypertension	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-27 09:50:10.862854	2025-12-27 09:50:10.862854	2025-12-27 10:10:10.862854	2026-01-10 17:05:10.654027
113	83	15	7	596	{"pulse": 64, "bp_systolic": 129, "temperature": 97.8, "bp_diastolic": 73}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-03 06:05:10.862854	2026-01-03 06:05:10.862854	2026-01-03 06:25:10.862854	2026-01-10 17:05:10.654027
114	4	14	6	547	{"pulse": 95, "bp_systolic": 136, "temperature": 97.6, "bp_diastolic": 70}	Seasonal Flu	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-27 02:35:10.862854	2025-12-27 02:35:10.862854	2025-12-27 02:55:10.862854	2026-01-10 17:05:10.654027
115	44	2	1	359	{"pulse": 70, "bp_systolic": 127, "temperature": 97.5, "bp_diastolic": 76}	Gastritis	Risek 40mg OD	Patient complains of fever	completed	2026-01-13 06:05:10.862854	2026-01-13 06:05:10.862854	2026-01-13 06:25:10.862854	2026-01-10 17:05:10.654027
116	85	6	2	100	{"pulse": 64, "bp_systolic": 118, "temperature": 97.7, "bp_diastolic": 71}	Seasonal Flu	Risek 40mg OD	Patient complains of fatigue	completed	2025-12-31 04:05:10.862854	2025-12-31 04:05:10.862854	2025-12-31 04:25:10.862854	2026-01-10 17:05:10.654027
117	13	15	7	817	{"pulse": 61, "bp_systolic": 138, "temperature": 99.2, "bp_diastolic": 77}	Acute Pharyngitis	Risek 40mg OD	Patient complains of fever	completed	2026-01-04 02:35:10.862854	2026-01-04 02:35:10.862854	2026-01-04 02:55:10.862854	2026-01-10 17:05:10.654027
118	91	11	5	957	{"pulse": 96, "bp_systolic": 119, "temperature": 98.1, "bp_diastolic": 79}	Seasonal Flu	Risek 40mg OD	Patient complains of headache	completed	2025-12-17 02:50:10.862854	2025-12-17 02:50:10.862854	2025-12-17 03:10:10.862854	2026-01-10 17:05:10.654027
119	65	6	2	663	{"pulse": 97, "bp_systolic": 124, "temperature": 99.5, "bp_diastolic": 90}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2026-01-06 10:05:10.862854	2026-01-06 10:05:10.862854	2026-01-06 10:25:10.862854	2026-01-10 17:05:10.654027
120	9	10	4	963	{"pulse": 61, "bp_systolic": 133, "temperature": 97.8, "bp_diastolic": 88}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-16 02:35:10.862854	2025-12-16 02:35:10.862854	2025-12-16 02:55:10.862854	2026-01-10 17:05:10.654027
121	55	13	6	968	{"pulse": 71, "bp_systolic": 112, "temperature": 99.3, "bp_diastolic": 83}	Lower Back Pain	Risek 40mg OD	Patient complains of fatigue	completed	2025-12-29 08:20:10.862854	2025-12-29 08:20:10.862854	2025-12-29 08:40:10.862854	2026-01-10 17:05:10.654027
122	76	8	3	395	{"pulse": 91, "bp_systolic": 119, "temperature": 97.9, "bp_diastolic": 74}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of headache	completed	2025-12-17 10:20:10.862854	2025-12-17 10:20:10.862854	2025-12-17 10:40:10.862854	2026-01-10 17:05:10.654027
123	54	10	4	655	{"pulse": 84, "bp_systolic": 128, "temperature": 98.8, "bp_diastolic": 78}	Seasonal Flu	Augmentin 625mg BD	Patient complains of headache	completed	2026-01-12 04:35:10.862854	2026-01-12 04:35:10.862854	2026-01-12 04:55:10.862854	2026-01-10 17:05:10.654027
124	13	5	2	669	{"pulse": 74, "bp_systolic": 115, "temperature": 97.8, "bp_diastolic": 82}	Gastritis	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-21 06:50:10.862854	2025-12-21 06:50:10.862854	2025-12-21 07:10:10.862854	2026-01-10 17:05:10.654027
125	42	4	2	772	{"pulse": 74, "bp_systolic": 118, "temperature": 97.8, "bp_diastolic": 70}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-29 09:35:10.862854	2025-12-29 09:35:10.862854	2025-12-29 09:55:10.862854	2026-01-10 17:05:10.654027
126	99	18	8	760	{"pulse": 86, "bp_systolic": 136, "temperature": 98.1, "bp_diastolic": 88}	Hypertension	Risek 40mg OD	Patient complains of fatigue	completed	2026-01-17 04:20:10.862854	2026-01-17 04:20:10.862854	2026-01-17 04:40:10.862854	2026-01-10 17:05:10.654027
127	58	12	5	983	{"pulse": 96, "bp_systolic": 117, "temperature": 98.0, "bp_diastolic": 80}	Gastritis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-18 10:20:10.862854	2025-12-18 10:20:10.862854	2025-12-18 10:40:10.862854	2026-01-10 17:05:10.654027
128	76	5	2	500	{"pulse": 70, "bp_systolic": 134, "temperature": 98.3, "bp_diastolic": 90}	Gastritis	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-27 08:05:10.862854	2025-12-27 08:05:10.862854	2025-12-27 08:25:10.862854	2026-01-10 17:05:10.654027
129	18	14	6	780	{"pulse": 84, "bp_systolic": 110, "temperature": 98.3, "bp_diastolic": 85}	Lower Back Pain	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-04 07:20:10.862854	2026-01-04 07:20:10.862854	2026-01-04 07:40:10.862854	2026-01-10 17:05:10.654027
130	82	17	8	754	{"pulse": 76, "bp_systolic": 135, "temperature": 99.2, "bp_diastolic": 82}	Lower Back Pain	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-12 05:35:10.862854	2025-12-12 05:35:10.862854	2025-12-12 05:55:10.862854	2026-01-10 17:05:10.654027
131	9	17	8	299	{"pulse": 92, "bp_systolic": 125, "temperature": 97.7, "bp_diastolic": 84}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-16 02:20:10.862854	2025-12-16 02:20:10.862854	2025-12-16 02:40:10.862854	2026-01-10 17:05:10.654027
132	19	8	3	410	{"pulse": 84, "bp_systolic": 129, "temperature": 99.3, "bp_diastolic": 80}	Hypertension	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-14 07:20:10.862854	2026-01-14 07:20:10.862854	2026-01-14 07:40:10.862854	2026-01-10 17:05:10.654027
133	13	18	8	750	{"pulse": 98, "bp_systolic": 132, "temperature": 99.3, "bp_diastolic": 78}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-08 04:50:10.862854	2026-01-08 04:50:10.862854	2026-01-08 05:10:10.862854	2026-01-10 17:05:10.654027
134	11	7	3	536	{"pulse": 83, "bp_systolic": 113, "temperature": 99.1, "bp_diastolic": 86}	Gastritis	Panadol 500mg BID	Patient complains of cough	completed	2026-01-13 07:20:10.862854	2026-01-13 07:20:10.862854	2026-01-13 07:40:10.862854	2026-01-10 17:05:10.654027
135	2	10	4	648	{"pulse": 96, "bp_systolic": 131, "temperature": 97.6, "bp_diastolic": 75}	Migraine	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2026-01-10 04:35:10.862854	2026-01-10 04:35:10.862854	2026-01-10 04:55:10.862854	2026-01-10 17:05:10.654027
136	9	1	1	974	{"pulse": 87, "bp_systolic": 119, "temperature": 97.7, "bp_diastolic": 87}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-31 10:20:10.862854	2025-12-31 10:20:10.862854	2025-12-31 10:40:10.862854	2026-01-10 17:05:10.654027
137	93	5	2	647	{"pulse": 93, "bp_systolic": 138, "temperature": 99.4, "bp_diastolic": 75}	Lower Back Pain	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-17 05:50:10.862854	2025-12-17 05:50:10.862854	2025-12-17 06:10:10.862854	2026-01-10 17:05:10.654027
138	75	18	8	498	{"pulse": 89, "bp_systolic": 121, "temperature": 97.6, "bp_diastolic": 88}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-30 03:35:10.862854	2025-12-30 03:35:10.862854	2025-12-30 03:55:10.862854	2026-01-10 17:05:10.654027
139	72	13	6	238	{"pulse": 60, "bp_systolic": 136, "temperature": 99.5, "bp_diastolic": 77}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-04 10:20:10.862854	2026-01-04 10:20:10.862854	2026-01-04 10:40:10.862854	2026-01-10 17:05:10.654027
140	48	17	8	466	{"pulse": 93, "bp_systolic": 134, "temperature": 98.7, "bp_diastolic": 79}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of headache	completed	2026-01-15 09:50:10.862854	2026-01-15 09:50:10.862854	2026-01-15 10:10:10.862854	2026-01-10 17:05:10.654027
141	98	11	5	296	{"pulse": 99, "bp_systolic": 134, "temperature": 98.6, "bp_diastolic": 90}	Gastritis	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-15 08:50:10.862854	2025-12-15 08:50:10.862854	2025-12-15 09:10:10.862854	2026-01-10 17:05:10.654027
142	46	7	3	742	{"pulse": 80, "bp_systolic": 133, "temperature": 98.2, "bp_diastolic": 71}	Lower Back Pain	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-14 02:35:10.862854	2025-12-14 02:35:10.862854	2025-12-14 02:55:10.862854	2026-01-10 17:05:10.654027
143	38	11	5	196	{"pulse": 100, "bp_systolic": 124, "temperature": 98.4, "bp_diastolic": 80}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of fatigue	completed	2026-01-08 09:50:10.862854	2026-01-08 09:50:10.862854	2026-01-08 10:10:10.862854	2026-01-10 17:05:10.654027
144	93	5	2	512	{"pulse": 79, "bp_systolic": 118, "temperature": 99.3, "bp_diastolic": 85}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-20 06:20:10.862854	2025-12-20 06:20:10.862854	2025-12-20 06:40:10.862854	2026-01-10 17:05:10.654027
145	59	3	1	624	{"pulse": 65, "bp_systolic": 124, "temperature": 98.0, "bp_diastolic": 76}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-05 08:20:10.862854	2026-01-05 08:20:10.862854	2026-01-05 08:40:10.862854	2026-01-10 17:05:10.654027
146	96	1	1	434	{"pulse": 81, "bp_systolic": 136, "temperature": 98.0, "bp_diastolic": 73}	Migraine	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-05 09:20:10.862854	2026-01-05 09:20:10.862854	2026-01-05 09:40:10.862854	2026-01-10 17:05:10.654027
147	68	18	8	770	{"pulse": 79, "bp_systolic": 124, "temperature": 97.8, "bp_diastolic": 81}	Seasonal Flu	Panadol 500mg BID	Patient complains of fatigue	completed	2026-01-03 10:35:10.862854	2026-01-03 10:35:10.862854	2026-01-03 10:55:10.862854	2026-01-10 17:05:10.654027
148	8	8	3	531	{"pulse": 70, "bp_systolic": 139, "temperature": 98.9, "bp_diastolic": 76}	Gastritis	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-18 05:20:10.862854	2026-01-18 05:20:10.862854	2026-01-18 05:40:10.862854	2026-01-10 17:05:10.654027
149	87	6	2	761	{"pulse": 79, "bp_systolic": 137, "temperature": 98.4, "bp_diastolic": 77}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of headache	completed	2025-12-22 10:20:10.862854	2025-12-22 10:20:10.862854	2025-12-22 10:40:10.862854	2026-01-10 17:05:10.654027
150	44	13	6	262	{"pulse": 84, "bp_systolic": 134, "temperature": 98.2, "bp_diastolic": 90}	Migraine	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-31 02:20:10.862854	2025-12-31 02:20:10.862854	2025-12-31 02:40:10.862854	2026-01-10 17:05:10.654027
151	81	10	4	482	{"pulse": 93, "bp_systolic": 131, "temperature": 98.2, "bp_diastolic": 88}	Seasonal Flu	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-21 05:05:10.862854	2025-12-21 05:05:10.862854	2025-12-21 05:25:10.862854	2026-01-10 17:05:10.654027
152	39	7	3	251	{"pulse": 81, "bp_systolic": 121, "temperature": 99.0, "bp_diastolic": 73}	Acute Pharyngitis	Panadol 500mg BID	Patient complains of cough	completed	2026-01-03 02:35:10.862854	2026-01-03 02:35:10.862854	2026-01-03 02:55:10.862854	2026-01-10 17:05:10.654027
153	26	15	7	989	{"pulse": 74, "bp_systolic": 139, "temperature": 98.3, "bp_diastolic": 87}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-31 02:35:10.862854	2025-12-31 02:35:10.862854	2025-12-31 02:55:10.862854	2026-01-10 17:05:10.654027
154	97	10	4	639	{"pulse": 78, "bp_systolic": 116, "temperature": 97.7, "bp_diastolic": 87}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-15 06:50:10.862854	2026-01-15 06:50:10.862854	2026-01-15 07:10:10.862854	2026-01-10 17:05:10.654027
155	21	13	6	264	{"pulse": 92, "bp_systolic": 131, "temperature": 98.0, "bp_diastolic": 81}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-01 09:50:10.862854	2026-01-01 09:50:10.862854	2026-01-01 10:10:10.862854	2026-01-10 17:05:10.654027
156	42	8	3	763	{"pulse": 93, "bp_systolic": 120, "temperature": 98.4, "bp_diastolic": 86}	Seasonal Flu	Brufen 400mg TDS	Patient complains of cough	completed	2025-12-24 06:50:10.862854	2025-12-24 06:50:10.862854	2025-12-24 07:10:10.862854	2026-01-10 17:05:10.654027
157	79	4	2	470	{"pulse": 72, "bp_systolic": 114, "temperature": 97.9, "bp_diastolic": 82}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-15 10:50:10.862854	2026-01-15 10:50:10.862854	2026-01-15 11:10:10.862854	2026-01-10 17:05:10.654027
158	18	11	5	483	{"pulse": 76, "bp_systolic": 129, "temperature": 98.5, "bp_diastolic": 84}	Seasonal Flu	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-29 04:20:10.862854	2025-12-29 04:20:10.862854	2025-12-29 04:40:10.862854	2026-01-10 17:05:10.654027
159	59	2	1	302	{"pulse": 98, "bp_systolic": 122, "temperature": 97.7, "bp_diastolic": 88}	Upper Respiratory Infection	Panadol 500mg BID	Patient complains of fever	completed	2026-01-07 09:05:10.862854	2026-01-07 09:05:10.862854	2026-01-07 09:25:10.862854	2026-01-10 17:05:10.654027
160	73	5	2	967	{"pulse": 99, "bp_systolic": 116, "temperature": 98.7, "bp_diastolic": 80}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-09 08:05:10.862854	2026-01-09 08:05:10.862854	2026-01-09 08:25:10.862854	2026-01-10 17:05:10.654027
161	9	6	2	619	{"pulse": 84, "bp_systolic": 125, "temperature": 98.0, "bp_diastolic": 77}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-25 10:05:10.862854	2025-12-25 10:05:10.862854	2025-12-25 10:25:10.862854	2026-01-10 17:05:10.654027
162	19	6	2	534	{"pulse": 73, "bp_systolic": 115, "temperature": 98.4, "bp_diastolic": 83}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-15 03:35:10.862854	2026-01-15 03:35:10.862854	2026-01-15 03:55:10.862854	2026-01-10 17:05:10.654027
163	49	1	1	436	{"pulse": 78, "bp_systolic": 132, "temperature": 99.2, "bp_diastolic": 79}	Lower Back Pain	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-26 03:05:10.862854	2025-12-26 03:05:10.862854	2025-12-26 03:25:10.862854	2026-01-10 17:05:10.654027
164	95	11	5	613	{"pulse": 99, "bp_systolic": 132, "temperature": 98.3, "bp_diastolic": 78}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-16 08:20:10.862854	2025-12-16 08:20:10.862854	2025-12-16 08:40:10.862854	2026-01-10 17:05:10.654027
165	67	11	5	601	{"pulse": 86, "bp_systolic": 114, "temperature": 98.0, "bp_diastolic": 70}	Gastritis	Panadol 500mg BID	Patient complains of cough	completed	2025-12-30 06:50:10.862854	2025-12-30 06:50:10.862854	2025-12-30 07:10:10.862854	2026-01-10 17:05:10.654027
166	51	8	3	809	{"pulse": 74, "bp_systolic": 134, "temperature": 98.0, "bp_diastolic": 80}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-09 06:50:10.862854	2026-01-09 06:50:10.862854	2026-01-09 07:10:10.862854	2026-01-10 17:05:10.654027
167	74	12	5	874	{"pulse": 71, "bp_systolic": 132, "temperature": 97.7, "bp_diastolic": 82}	Seasonal Flu	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-04 10:35:10.862854	2026-01-04 10:35:10.862854	2026-01-04 10:55:10.862854	2026-01-10 17:05:10.654027
168	65	3	1	665	{"pulse": 100, "bp_systolic": 131, "temperature": 99.0, "bp_diastolic": 84}	Migraine	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-18 03:35:10.862854	2026-01-18 03:35:10.862854	2026-01-18 03:55:10.862854	2026-01-10 17:05:10.654027
169	50	5	2	643	{"pulse": 85, "bp_systolic": 115, "temperature": 98.0, "bp_diastolic": 83}	Migraine	Risek 40mg OD	Patient complains of headache	completed	2026-01-06 08:20:10.862854	2026-01-06 08:20:10.862854	2026-01-06 08:40:10.862854	2026-01-10 17:05:10.654027
170	93	9	4	912	{"pulse": 80, "bp_systolic": 113, "temperature": 98.0, "bp_diastolic": 82}	Migraine	Augmentin 625mg BD	Patient complains of fatigue	completed	2025-12-12 03:50:10.862854	2025-12-12 03:50:10.862854	2025-12-12 04:10:10.862854	2026-01-10 17:05:10.654027
171	88	2	1	746	{"pulse": 70, "bp_systolic": 115, "temperature": 98.3, "bp_diastolic": 87}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-30 02:20:10.862854	2025-12-30 02:20:10.862854	2025-12-30 02:40:10.862854	2026-01-10 17:05:10.654027
172	15	15	7	929	{"pulse": 80, "bp_systolic": 116, "temperature": 99.1, "bp_diastolic": 79}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of fatigue	completed	2025-12-22 03:20:10.862854	2025-12-22 03:20:10.862854	2025-12-22 03:40:10.862854	2026-01-10 17:05:10.654027
173	86	15	7	245	{"pulse": 90, "bp_systolic": 130, "temperature": 98.9, "bp_diastolic": 84}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of fever	completed	2025-12-26 06:05:10.862854	2025-12-26 06:05:10.862854	2025-12-26 06:25:10.862854	2026-01-10 17:05:10.654027
174	5	17	8	461	{"pulse": 62, "bp_systolic": 115, "temperature": 99.0, "bp_diastolic": 83}	Migraine	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-18 04:05:10.862854	2026-01-18 04:05:10.862854	2026-01-18 04:25:10.862854	2026-01-10 17:05:10.654027
175	93	17	8	589	{"pulse": 79, "bp_systolic": 128, "temperature": 98.3, "bp_diastolic": 78}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-20 09:35:10.862854	2025-12-20 09:35:10.862854	2025-12-20 09:55:10.862854	2026-01-10 17:05:10.654027
176	20	16	7	129	{"pulse": 60, "bp_systolic": 119, "temperature": 99.3, "bp_diastolic": 70}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of headache	completed	2025-12-19 03:50:10.862854	2025-12-19 03:50:10.862854	2025-12-19 04:10:10.862854	2026-01-10 17:05:10.654027
177	56	8	3	590	{"pulse": 97, "bp_systolic": 116, "temperature": 99.3, "bp_diastolic": 81}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-15 02:50:10.862854	2025-12-15 02:50:10.862854	2025-12-15 03:10:10.862854	2026-01-10 17:05:10.654027
178	65	11	5	945	{"pulse": 67, "bp_systolic": 112, "temperature": 98.5, "bp_diastolic": 73}	Lower Back Pain	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-19 04:05:10.862854	2025-12-19 04:05:10.862854	2025-12-19 04:25:10.862854	2026-01-10 17:05:10.654027
179	95	3	1	525	{"pulse": 97, "bp_systolic": 132, "temperature": 98.7, "bp_diastolic": 74}	Gastritis	Risek 40mg OD	Patient complains of fatigue	completed	2026-01-01 08:35:10.862854	2026-01-01 08:35:10.862854	2026-01-01 08:55:10.862854	2026-01-10 17:05:10.654027
180	91	11	5	135	{"pulse": 87, "bp_systolic": 120, "temperature": 98.7, "bp_diastolic": 75}	Upper Respiratory Infection	Panadol 500mg BID	Patient complains of cough	completed	2026-01-18 08:05:10.862854	2026-01-18 08:05:10.862854	2026-01-18 08:25:10.862854	2026-01-10 17:05:10.654027
181	1	4	2	836	{"pulse": 97, "bp_systolic": 134, "temperature": 98.7, "bp_diastolic": 72}	Gastritis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-22 04:35:10.862854	2025-12-22 04:35:10.862854	2025-12-22 04:55:10.862854	2026-01-10 17:05:10.654027
182	16	3	1	425	{"pulse": 73, "bp_systolic": 138, "temperature": 99.3, "bp_diastolic": 81}	Migraine	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-13 06:05:10.862854	2026-01-13 06:05:10.862854	2026-01-13 06:25:10.862854	2026-01-10 17:05:10.654027
183	85	15	7	625	{"pulse": 89, "bp_systolic": 120, "temperature": 98.7, "bp_diastolic": 74}	Gastritis	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-09 08:50:10.862854	2026-01-09 08:50:10.862854	2026-01-09 09:10:10.862854	2026-01-10 17:05:10.654027
184	78	11	5	975	{"pulse": 72, "bp_systolic": 135, "temperature": 98.3, "bp_diastolic": 78}	Lower Back Pain	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-18 07:50:10.862854	2025-12-18 07:50:10.862854	2025-12-18 08:10:10.862854	2026-01-10 17:05:10.654027
185	54	6	2	751	{"pulse": 87, "bp_systolic": 138, "temperature": 98.3, "bp_diastolic": 82}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-05 04:50:10.862854	2026-01-05 04:50:10.862854	2026-01-05 05:10:10.862854	2026-01-10 17:05:10.654027
186	47	4	2	458	{"pulse": 67, "bp_systolic": 125, "temperature": 99.4, "bp_diastolic": 70}	Seasonal Flu	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-24 03:35:10.862854	2025-12-24 03:35:10.862854	2025-12-24 03:55:10.862854	2026-01-10 17:05:10.654027
187	95	4	2	438	{"pulse": 85, "bp_systolic": 132, "temperature": 98.0, "bp_diastolic": 70}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-13 07:50:10.862854	2025-12-13 07:50:10.862854	2025-12-13 08:10:10.862854	2026-01-10 17:05:10.654027
188	79	3	1	284	{"pulse": 79, "bp_systolic": 124, "temperature": 98.9, "bp_diastolic": 81}	Migraine	Augmentin 625mg BD	Patient complains of fatigue	completed	2025-12-26 09:50:10.862854	2025-12-26 09:50:10.862854	2025-12-26 10:10:10.862854	2026-01-10 17:05:10.654027
189	29	9	4	340	{"pulse": 75, "bp_systolic": 129, "temperature": 99.2, "bp_diastolic": 83}	Migraine	Panadol 500mg BID	Patient complains of headache	completed	2026-01-13 03:35:10.862854	2026-01-13 03:35:10.862854	2026-01-13 03:55:10.862854	2026-01-10 17:05:10.654027
190	75	14	6	937	{"pulse": 100, "bp_systolic": 134, "temperature": 98.5, "bp_diastolic": 70}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2025-12-25 02:05:10.862854	2025-12-25 02:05:10.862854	2025-12-25 02:25:10.862854	2026-01-10 17:05:10.654027
191	51	6	2	734	{"pulse": 66, "bp_systolic": 118, "temperature": 99.4, "bp_diastolic": 83}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-03 07:05:10.862854	2026-01-03 07:05:10.862854	2026-01-03 07:25:10.862854	2026-01-10 17:05:10.654027
192	35	17	8	309	{"pulse": 94, "bp_systolic": 139, "temperature": 99.3, "bp_diastolic": 83}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-03 04:20:10.862854	2026-01-03 04:20:10.862854	2026-01-03 04:40:10.862854	2026-01-10 17:05:10.654027
193	30	3	1	986	{"pulse": 73, "bp_systolic": 110, "temperature": 97.9, "bp_diastolic": 76}	Gastritis	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-16 05:50:10.862854	2025-12-16 05:50:10.862854	2025-12-16 06:10:10.862854	2026-01-10 17:05:10.654027
194	80	3	1	352	{"pulse": 75, "bp_systolic": 131, "temperature": 98.6, "bp_diastolic": 84}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-15 04:20:10.862854	2026-01-15 04:20:10.862854	2026-01-15 04:40:10.862854	2026-01-10 17:05:10.654027
195	29	8	3	994	{"pulse": 91, "bp_systolic": 127, "temperature": 98.4, "bp_diastolic": 72}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-11 07:35:10.862854	2026-01-11 07:35:10.862854	2026-01-11 07:55:10.862854	2026-01-10 17:05:10.654027
196	32	11	5	717	{"pulse": 99, "bp_systolic": 127, "temperature": 99.4, "bp_diastolic": 79}	Gastritis	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-18 08:35:10.862854	2025-12-18 08:35:10.862854	2025-12-18 08:55:10.862854	2026-01-10 17:05:10.654027
197	53	4	2	399	{"pulse": 77, "bp_systolic": 128, "temperature": 98.7, "bp_diastolic": 82}	Seasonal Flu	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-06 06:50:10.862854	2026-01-06 06:50:10.862854	2026-01-06 07:10:10.862854	2026-01-10 17:05:10.654027
198	45	2	1	428	{"pulse": 73, "bp_systolic": 119, "temperature": 97.9, "bp_diastolic": 80}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of stomach pain	completed	2025-12-22 06:35:10.862854	2025-12-22 06:35:10.862854	2025-12-22 06:55:10.862854	2026-01-10 17:05:10.654027
199	40	12	5	373	{"pulse": 91, "bp_systolic": 119, "temperature": 98.1, "bp_diastolic": 77}	Gastritis	Augmentin 625mg BD	Patient complains of cough	completed	2025-12-20 03:50:10.862854	2025-12-20 03:50:10.862854	2025-12-20 04:10:10.862854	2026-01-10 17:05:10.654027
200	78	6	2	874	{"pulse": 83, "bp_systolic": 122, "temperature": 99.1, "bp_diastolic": 73}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-10 08:35:10.862854	2026-01-10 08:35:10.862854	2026-01-10 08:55:10.862854	2026-01-10 17:05:10.654027
201	74	16	7	562	{"pulse": 66, "bp_systolic": 116, "temperature": 98.0, "bp_diastolic": 87}	Hypertension	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-07 09:20:10.862854	2026-01-07 09:20:10.862854	2026-01-07 09:40:10.862854	2026-01-10 17:05:10.654027
202	5	13	6	255	{"pulse": 86, "bp_systolic": 127, "temperature": 99.4, "bp_diastolic": 81}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of fatigue	completed	2026-01-13 06:05:10.862854	2026-01-13 06:05:10.862854	2026-01-13 06:25:10.862854	2026-01-10 17:05:10.654027
203	41	16	7	227	{"pulse": 97, "bp_systolic": 129, "temperature": 98.2, "bp_diastolic": 70}	Seasonal Flu	Panadol 500mg BID	Patient complains of cough	completed	2025-12-19 09:35:10.862854	2025-12-19 09:35:10.862854	2025-12-19 09:55:10.862854	2026-01-10 17:05:10.654027
204	50	11	5	400	{"pulse": 95, "bp_systolic": 139, "temperature": 99.3, "bp_diastolic": 86}	Hypertension	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-13 09:50:10.862854	2025-12-13 09:50:10.862854	2025-12-13 10:10:10.862854	2026-01-10 17:05:10.654027
205	18	11	5	746	{"pulse": 95, "bp_systolic": 135, "temperature": 97.6, "bp_diastolic": 79}	Hypertension	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-16 08:05:10.862854	2025-12-16 08:05:10.862854	2025-12-16 08:25:10.862854	2026-01-10 17:05:10.654027
206	73	17	8	357	{"pulse": 94, "bp_systolic": 122, "temperature": 99.4, "bp_diastolic": 72}	Lower Back Pain	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-18 06:50:10.862854	2026-01-18 06:50:10.862854	2026-01-18 07:10:10.862854	2026-01-10 17:05:10.654027
207	69	17	8	248	{"pulse": 73, "bp_systolic": 125, "temperature": 99.0, "bp_diastolic": 86}	Hypertension	Panadol 500mg BID	Patient complains of fatigue	completed	2026-01-04 09:05:10.862854	2026-01-04 09:05:10.862854	2026-01-04 09:25:10.862854	2026-01-10 17:05:10.654027
208	90	15	7	574	{"pulse": 82, "bp_systolic": 128, "temperature": 98.7, "bp_diastolic": 87}	Vitamin D Deficiency	Panadol 500mg BID	Patient complains of fever	completed	2025-12-19 03:35:10.862854	2025-12-19 03:35:10.862854	2025-12-19 03:55:10.862854	2026-01-10 17:05:10.654027
209	83	18	8	233	{"pulse": 67, "bp_systolic": 136, "temperature": 98.5, "bp_diastolic": 72}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-03 04:50:10.862854	2026-01-03 04:50:10.862854	2026-01-03 05:10:10.862854	2026-01-10 17:05:10.654027
210	79	6	2	162	{"pulse": 93, "bp_systolic": 138, "temperature": 97.9, "bp_diastolic": 82}	Migraine	Brufen 400mg TDS	Patient complains of fever	completed	2025-12-26 04:05:10.862854	2025-12-26 04:05:10.862854	2025-12-26 04:25:10.862854	2026-01-10 17:05:10.654027
211	6	13	6	718	{"pulse": 62, "bp_systolic": 118, "temperature": 99.1, "bp_diastolic": 83}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-17 04:35:10.862854	2026-01-17 04:35:10.862854	2026-01-17 04:55:10.862854	2026-01-10 17:05:10.654027
212	63	2	1	875	{"pulse": 82, "bp_systolic": 126, "temperature": 98.6, "bp_diastolic": 81}	Hypertension	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-10 08:35:10.862854	2026-01-10 08:35:10.862854	2026-01-10 08:55:10.862854	2026-01-10 17:05:10.654027
213	37	11	5	965	{"pulse": 72, "bp_systolic": 118, "temperature": 97.6, "bp_diastolic": 89}	Acute Pharyngitis	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-01 10:50:10.862854	2026-01-01 10:50:10.862854	2026-01-01 11:10:10.862854	2026-01-10 17:05:10.654027
214	31	8	3	951	{"pulse": 75, "bp_systolic": 119, "temperature": 99.2, "bp_diastolic": 71}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-18 08:50:10.862854	2025-12-18 08:50:10.862854	2025-12-18 09:10:10.862854	2026-01-10 17:05:10.654027
215	47	1	1	344	{"pulse": 100, "bp_systolic": 137, "temperature": 99.5, "bp_diastolic": 80}	Seasonal Flu	Augmentin 625mg BD	Patient complains of headache	completed	2026-01-16 06:05:10.862854	2026-01-16 06:05:10.862854	2026-01-16 06:25:10.862854	2026-01-10 17:05:10.654027
216	48	13	6	600	{"pulse": 71, "bp_systolic": 135, "temperature": 99.0, "bp_diastolic": 71}	Seasonal Flu	Panadol 500mg BID	Patient complains of fever	completed	2026-01-16 03:05:10.862854	2026-01-16 03:05:10.862854	2026-01-16 03:25:10.862854	2026-01-10 17:05:10.654027
217	5	13	6	674	{"pulse": 99, "bp_systolic": 138, "temperature": 99.4, "bp_diastolic": 88}	Lower Back Pain	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-14 03:20:10.862854	2025-12-14 03:20:10.862854	2025-12-14 03:40:10.862854	2026-01-10 17:05:10.654027
218	72	16	7	759	{"pulse": 70, "bp_systolic": 125, "temperature": 98.0, "bp_diastolic": 82}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-10 05:35:10.862854	2026-01-10 05:35:10.862854	2026-01-10 05:55:10.862854	2026-01-10 17:05:10.654027
219	43	1	1	987	{"pulse": 72, "bp_systolic": 125, "temperature": 98.3, "bp_diastolic": 70}	Lower Back Pain	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-04 04:35:10.862854	2026-01-04 04:35:10.862854	2026-01-04 04:55:10.862854	2026-01-10 17:05:10.654027
220	63	4	2	558	{"pulse": 79, "bp_systolic": 127, "temperature": 99.4, "bp_diastolic": 87}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-06 09:50:10.862854	2026-01-06 09:50:10.862854	2026-01-06 10:10:10.862854	2026-01-10 17:05:10.654027
221	37	17	8	639	{"pulse": 77, "bp_systolic": 130, "temperature": 99.0, "bp_diastolic": 84}	Migraine	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-09 10:20:10.862854	2026-01-09 10:20:10.862854	2026-01-09 10:40:10.862854	2026-01-10 17:05:10.654027
222	86	15	7	251	{"pulse": 87, "bp_systolic": 135, "temperature": 99.3, "bp_diastolic": 75}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-02 03:50:10.862854	2026-01-02 03:50:10.862854	2026-01-02 04:10:10.862854	2026-01-10 17:05:10.654027
223	58	6	2	466	{"pulse": 92, "bp_systolic": 123, "temperature": 98.7, "bp_diastolic": 73}	Lower Back Pain	Panadol 500mg BID	Patient complains of headache	completed	2026-01-02 05:50:10.862854	2026-01-02 05:50:10.862854	2026-01-02 06:10:10.862854	2026-01-10 17:05:10.654027
224	55	9	4	268	{"pulse": 65, "bp_systolic": 139, "temperature": 99.1, "bp_diastolic": 80}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-23 10:20:10.862854	2025-12-23 10:20:10.862854	2025-12-23 10:40:10.862854	2026-01-10 17:05:10.654027
225	60	6	2	451	{"pulse": 93, "bp_systolic": 123, "temperature": 99.5, "bp_diastolic": 79}	Migraine	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-15 07:05:10.862854	2026-01-15 07:05:10.862854	2026-01-15 07:25:10.862854	2026-01-10 17:05:10.654027
226	81	13	6	860	{"pulse": 86, "bp_systolic": 126, "temperature": 98.8, "bp_diastolic": 86}	Migraine	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-02 04:50:10.862854	2026-01-02 04:50:10.862854	2026-01-02 05:10:10.862854	2026-01-10 17:05:10.654027
227	36	8	3	632	{"pulse": 68, "bp_systolic": 120, "temperature": 98.7, "bp_diastolic": 75}	Lower Back Pain	Risek 40mg OD	Patient complains of stomach pain	completed	2025-12-26 03:35:10.862854	2025-12-26 03:35:10.862854	2025-12-26 03:55:10.862854	2026-01-10 17:05:10.654027
228	82	7	3	643	{"pulse": 99, "bp_systolic": 130, "temperature": 99.5, "bp_diastolic": 81}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-18 03:05:10.862854	2025-12-18 03:05:10.862854	2025-12-18 03:25:10.862854	2026-01-10 17:05:10.654027
229	62	3	1	277	{"pulse": 65, "bp_systolic": 123, "temperature": 98.9, "bp_diastolic": 82}	Migraine	Risek 40mg OD	Patient complains of headache	completed	2025-12-21 10:20:10.862854	2025-12-21 10:20:10.862854	2025-12-21 10:40:10.862854	2026-01-10 17:05:10.654027
230	63	17	8	756	{"pulse": 76, "bp_systolic": 130, "temperature": 99.4, "bp_diastolic": 80}	Gastritis	Panadol 500mg BID	Patient complains of fatigue	completed	2025-12-20 03:35:10.862854	2025-12-20 03:35:10.862854	2025-12-20 03:55:10.862854	2026-01-10 17:05:10.654027
231	32	15	7	142	{"pulse": 62, "bp_systolic": 112, "temperature": 98.1, "bp_diastolic": 83}	Lower Back Pain	Panadol 500mg BID	Patient complains of headache	completed	2026-01-01 05:35:10.862854	2026-01-01 05:35:10.862854	2026-01-01 05:55:10.862854	2026-01-10 17:05:10.654027
232	100	8	3	745	{"pulse": 91, "bp_systolic": 117, "temperature": 99.1, "bp_diastolic": 71}	Lower Back Pain	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-15 04:35:10.862854	2026-01-15 04:35:10.862854	2026-01-15 04:55:10.862854	2026-01-10 17:05:10.654027
233	62	15	7	183	{"pulse": 79, "bp_systolic": 126, "temperature": 99.3, "bp_diastolic": 74}	Migraine	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-10 08:50:10.862854	2026-01-10 08:50:10.862854	2026-01-10 09:10:10.862854	2026-01-10 17:05:10.654027
234	79	5	2	911	{"pulse": 100, "bp_systolic": 112, "temperature": 98.1, "bp_diastolic": 73}	Gastritis	Brufen 400mg TDS	Patient complains of stomach pain	completed	2025-12-29 09:35:10.862854	2025-12-29 09:35:10.862854	2025-12-29 09:55:10.862854	2026-01-10 17:05:10.654027
235	13	18	8	326	{"pulse": 100, "bp_systolic": 136, "temperature": 97.6, "bp_diastolic": 73}	Acute Pharyngitis	Panadol 500mg BID	Patient complains of headache	completed	2025-12-24 10:35:10.862854	2025-12-24 10:35:10.862854	2025-12-24 10:55:10.862854	2026-01-10 17:05:10.654027
236	61	13	6	814	{"pulse": 72, "bp_systolic": 119, "temperature": 98.0, "bp_diastolic": 80}	Gastritis	Brufen 400mg TDS	Patient complains of cough	completed	2026-01-04 08:05:10.862854	2026-01-04 08:05:10.862854	2026-01-04 08:25:10.862854	2026-01-10 17:05:10.654027
237	36	7	3	352	{"pulse": 86, "bp_systolic": 138, "temperature": 98.9, "bp_diastolic": 82}	Acute Pharyngitis	Risek 40mg OD	Patient complains of stomach pain	completed	2025-12-13 06:05:10.862854	2025-12-13 06:05:10.862854	2025-12-13 06:25:10.862854	2026-01-10 17:05:10.654027
238	34	14	6	863	{"pulse": 69, "bp_systolic": 126, "temperature": 98.2, "bp_diastolic": 78}	Gastritis	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-16 06:05:10.862854	2026-01-16 06:05:10.862854	2026-01-16 06:25:10.862854	2026-01-10 17:05:10.654027
239	23	1	1	834	{"pulse": 82, "bp_systolic": 139, "temperature": 98.3, "bp_diastolic": 85}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-31 09:50:10.862854	2025-12-31 09:50:10.862854	2025-12-31 10:10:10.862854	2026-01-10 17:05:10.654027
240	80	7	3	332	{"pulse": 90, "bp_systolic": 122, "temperature": 98.7, "bp_diastolic": 83}	Seasonal Flu	Augmentin 625mg BD	Patient complains of stomach pain	completed	2026-01-07 10:35:10.862854	2026-01-07 10:35:10.862854	2026-01-07 10:55:10.862854	2026-01-10 17:05:10.654027
241	49	5	2	729	{"pulse": 66, "bp_systolic": 121, "temperature": 98.3, "bp_diastolic": 76}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-20 07:20:10.862854	2025-12-20 07:20:10.862854	2025-12-20 07:40:10.862854	2026-01-10 17:05:10.654027
242	73	18	8	475	{"pulse": 76, "bp_systolic": 139, "temperature": 98.9, "bp_diastolic": 76}	Upper Respiratory Infection	Augmentin 625mg BD	Patient complains of cough	completed	2025-12-17 04:50:10.862854	2025-12-17 04:50:10.862854	2025-12-17 05:10:10.862854	2026-01-10 17:05:10.654027
243	96	8	3	380	{"pulse": 98, "bp_systolic": 124, "temperature": 98.9, "bp_diastolic": 78}	Hypertension	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-07 06:35:10.862854	2026-01-07 06:35:10.862854	2026-01-07 06:55:10.862854	2026-01-10 17:05:10.654027
244	40	10	4	863	{"pulse": 67, "bp_systolic": 115, "temperature": 99.2, "bp_diastolic": 87}	Lower Back Pain	Brufen 400mg TDS	Patient complains of fever	completed	2026-01-15 02:20:10.862854	2026-01-15 02:20:10.862854	2026-01-15 02:40:10.862854	2026-01-10 17:05:10.654027
245	97	11	5	212	{"pulse": 76, "bp_systolic": 139, "temperature": 97.9, "bp_diastolic": 83}	Upper Respiratory Infection	Panadol 500mg BID	Patient complains of headache	completed	2026-01-08 07:20:10.862854	2026-01-08 07:20:10.862854	2026-01-08 07:40:10.862854	2026-01-10 17:05:10.654027
246	42	7	3	207	{"pulse": 64, "bp_systolic": 131, "temperature": 99.3, "bp_diastolic": 81}	Vitamin D Deficiency	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-16 03:20:10.862854	2025-12-16 03:20:10.862854	2025-12-16 03:40:10.862854	2026-01-10 17:05:10.654027
247	65	12	5	414	{"pulse": 97, "bp_systolic": 134, "temperature": 99.4, "bp_diastolic": 83}	Lower Back Pain	Panadol 500mg BID	Patient complains of fever	completed	2025-12-26 02:35:10.862854	2025-12-26 02:35:10.862854	2025-12-26 02:55:10.862854	2026-01-10 17:05:10.654027
248	7	16	7	818	{"pulse": 61, "bp_systolic": 122, "temperature": 97.9, "bp_diastolic": 75}	Migraine	Augmentin 625mg BD	Patient complains of cough	completed	2026-01-15 08:35:10.862854	2026-01-15 08:35:10.862854	2026-01-15 08:55:10.862854	2026-01-10 17:05:10.654027
249	48	11	5	673	{"pulse": 99, "bp_systolic": 133, "temperature": 98.1, "bp_diastolic": 74}	Seasonal Flu	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-28 10:35:10.862854	2025-12-28 10:35:10.862854	2025-12-28 10:55:10.862854	2026-01-10 17:05:10.654027
250	47	7	3	927	{"pulse": 95, "bp_systolic": 124, "temperature": 99.5, "bp_diastolic": 81}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of stomach pain	completed	2025-12-15 04:05:10.862854	2025-12-15 04:05:10.862854	2025-12-15 04:25:10.862854	2026-01-10 17:05:10.654027
251	19	6	2	573	{"pulse": 64, "bp_systolic": 119, "temperature": 98.2, "bp_diastolic": 82}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of stomach pain	completed	2026-01-04 04:20:10.862854	2026-01-04 04:20:10.862854	2026-01-04 04:40:10.862854	2026-01-10 17:05:10.654027
252	75	4	2	520	{"pulse": 87, "bp_systolic": 116, "temperature": 98.6, "bp_diastolic": 74}	Hypertension	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-22 07:20:10.862854	2025-12-22 07:20:10.862854	2025-12-22 07:40:10.862854	2026-01-10 17:05:10.654027
253	30	17	8	367	{"pulse": 95, "bp_systolic": 134, "temperature": 98.5, "bp_diastolic": 72}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-25 05:50:10.862854	2025-12-25 05:50:10.862854	2025-12-25 06:10:10.862854	2026-01-10 17:05:10.654027
254	13	12	5	404	{"pulse": 92, "bp_systolic": 113, "temperature": 98.6, "bp_diastolic": 84}	Seasonal Flu	Risek 40mg OD	Patient complains of headache	completed	2026-01-08 07:35:10.862854	2026-01-08 07:35:10.862854	2026-01-08 07:55:10.862854	2026-01-10 17:05:10.654027
255	61	17	8	417	{"pulse": 64, "bp_systolic": 130, "temperature": 98.3, "bp_diastolic": 87}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of fatigue	completed	2026-01-06 03:35:10.862854	2026-01-06 03:35:10.862854	2026-01-06 03:55:10.862854	2026-01-10 17:05:10.654027
256	1	17	8	292	{"pulse": 72, "bp_systolic": 133, "temperature": 97.9, "bp_diastolic": 80}	Lower Back Pain	Brufen 400mg TDS	Patient complains of fatigue	completed	2026-01-03 02:20:10.862854	2026-01-03 02:20:10.862854	2026-01-03 02:40:10.862854	2026-01-10 17:05:10.654027
257	66	13	6	586	{"pulse": 83, "bp_systolic": 112, "temperature": 98.1, "bp_diastolic": 89}	Lower Back Pain	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-26 06:35:10.862854	2025-12-26 06:35:10.862854	2025-12-26 06:55:10.862854	2026-01-10 17:05:10.654027
258	72	2	1	296	{"pulse": 100, "bp_systolic": 121, "temperature": 98.7, "bp_diastolic": 73}	Acute Pharyngitis	Augmentin 625mg BD	Patient complains of fever	completed	2025-12-21 09:05:10.862854	2025-12-21 09:05:10.862854	2025-12-21 09:25:10.862854	2026-01-10 17:05:10.654027
259	94	12	5	559	{"pulse": 95, "bp_systolic": 113, "temperature": 98.4, "bp_diastolic": 78}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fever	completed	2026-01-14 09:05:10.862854	2026-01-14 09:05:10.862854	2026-01-14 09:25:10.862854	2026-01-10 17:05:10.654027
260	12	11	5	183	{"pulse": 65, "bp_systolic": 136, "temperature": 97.8, "bp_diastolic": 81}	Gastritis	Risek 40mg OD	Patient complains of fever	completed	2026-01-03 06:35:10.862854	2026-01-03 06:35:10.862854	2026-01-03 06:55:10.862854	2026-01-10 17:05:10.654027
261	74	4	2	647	{"pulse": 62, "bp_systolic": 114, "temperature": 97.6, "bp_diastolic": 75}	Acute Pharyngitis	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-15 04:20:10.862854	2026-01-15 04:20:10.862854	2026-01-15 04:40:10.862854	2026-01-10 17:05:10.654027
262	76	8	3	696	{"pulse": 72, "bp_systolic": 120, "temperature": 99.3, "bp_diastolic": 81}	Migraine	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-12 10:35:10.862854	2025-12-12 10:35:10.862854	2025-12-12 10:55:10.862854	2026-01-10 17:05:10.654027
263	56	2	1	475	{"pulse": 96, "bp_systolic": 135, "temperature": 97.9, "bp_diastolic": 83}	Migraine	Brufen 400mg TDS	Patient complains of headache	completed	2025-12-12 06:50:10.862854	2025-12-12 06:50:10.862854	2025-12-12 07:10:10.862854	2026-01-10 17:05:10.654027
264	5	8	3	721	{"pulse": 71, "bp_systolic": 129, "temperature": 98.6, "bp_diastolic": 86}	Gastritis	Brufen 400mg TDS	Patient complains of headache	completed	2026-01-03 04:50:10.862854	2026-01-03 04:50:10.862854	2026-01-03 05:10:10.862854	2026-01-10 17:05:10.654027
265	70	7	3	881	{"pulse": 83, "bp_systolic": 112, "temperature": 98.7, "bp_diastolic": 89}	Gastritis	Risek 40mg OD	Patient complains of fatigue	completed	2026-01-03 07:20:10.862854	2026-01-03 07:20:10.862854	2026-01-03 07:40:10.862854	2026-01-10 17:05:10.654027
266	10	7	3	784	{"pulse": 86, "bp_systolic": 110, "temperature": 99.1, "bp_diastolic": 81}	Acute Pharyngitis	Brufen 400mg TDS	Patient complains of fatigue	completed	2025-12-31 04:05:10.862854	2025-12-31 04:05:10.862854	2025-12-31 04:25:10.862854	2026-01-10 17:05:10.654027
267	84	12	5	225	{"pulse": 86, "bp_systolic": 113, "temperature": 99.0, "bp_diastolic": 74}	Hypertension	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-08 08:20:10.862854	2026-01-08 08:20:10.862854	2026-01-08 08:40:10.862854	2026-01-10 17:05:10.654027
268	72	12	5	468	{"pulse": 93, "bp_systolic": 127, "temperature": 98.4, "bp_diastolic": 89}	Hypertension	Panadol 500mg BID	Patient complains of cough	completed	2025-12-19 03:05:10.862854	2025-12-19 03:05:10.862854	2025-12-19 03:25:10.862854	2026-01-10 17:05:10.654027
269	81	12	5	822	{"pulse": 70, "bp_systolic": 118, "temperature": 98.3, "bp_diastolic": 71}	Seasonal Flu	Risek 40mg OD	Patient complains of headache	completed	2025-12-23 05:50:10.862854	2025-12-23 05:50:10.862854	2025-12-23 06:10:10.862854	2026-01-10 17:05:10.654027
270	6	15	7	683	{"pulse": 87, "bp_systolic": 130, "temperature": 99.1, "bp_diastolic": 88}	Upper Respiratory Infection	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-31 03:05:10.862854	2025-12-31 03:05:10.862854	2025-12-31 03:25:10.862854	2026-01-10 17:05:10.654027
271	65	7	3	511	{"pulse": 99, "bp_systolic": 128, "temperature": 98.0, "bp_diastolic": 79}	Hypertension	Augmentin 625mg BD	Patient complains of headache	completed	2025-12-14 05:35:10.862854	2025-12-14 05:35:10.862854	2025-12-14 05:55:10.862854	2026-01-10 17:05:10.654027
272	91	1	1	237	{"pulse": 67, "bp_systolic": 135, "temperature": 97.6, "bp_diastolic": 70}	Acute Pharyngitis	Risek 40mg OD	Patient complains of headache	completed	2025-12-25 04:05:10.862854	2025-12-25 04:05:10.862854	2025-12-25 04:25:10.862854	2026-01-10 17:05:10.654027
273	42	4	2	333	{"pulse": 89, "bp_systolic": 112, "temperature": 98.7, "bp_diastolic": 74}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of cough	completed	2026-01-05 07:20:10.862854	2026-01-05 07:20:10.862854	2026-01-05 07:40:10.862854	2026-01-10 17:05:10.654027
274	58	12	5	827	{"pulse": 97, "bp_systolic": 130, "temperature": 97.8, "bp_diastolic": 80}	Lower Back Pain	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-06 02:50:10.862854	2026-01-06 02:50:10.862854	2026-01-06 03:10:10.862854	2026-01-10 17:05:10.654027
275	46	13	6	229	{"pulse": 84, "bp_systolic": 138, "temperature": 99.4, "bp_diastolic": 90}	Upper Respiratory Infection	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-15 04:20:10.862854	2026-01-15 04:20:10.862854	2026-01-15 04:40:10.862854	2026-01-10 17:05:10.654027
276	69	15	7	506	{"pulse": 84, "bp_systolic": 117, "temperature": 97.6, "bp_diastolic": 72}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-12 08:35:10.862854	2026-01-12 08:35:10.862854	2026-01-12 08:55:10.862854	2026-01-10 17:05:10.654027
277	86	13	6	770	{"pulse": 98, "bp_systolic": 121, "temperature": 98.7, "bp_diastolic": 74}	Vitamin D Deficiency	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-01 02:35:10.862854	2026-01-01 02:35:10.862854	2026-01-01 02:55:10.862854	2026-01-10 17:05:10.654027
278	63	17	8	743	{"pulse": 60, "bp_systolic": 123, "temperature": 97.6, "bp_diastolic": 72}	Gastritis	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-03 10:20:10.862854	2026-01-03 10:20:10.862854	2026-01-03 10:40:10.862854	2026-01-10 17:05:10.654027
279	41	6	2	428	{"pulse": 73, "bp_systolic": 140, "temperature": 97.7, "bp_diastolic": 85}	Migraine	Brufen 400mg TDS	Patient complains of cough	completed	2025-12-27 04:50:10.862854	2025-12-27 04:50:10.862854	2025-12-27 05:10:10.862854	2026-01-10 17:05:10.654027
280	91	13	6	738	{"pulse": 66, "bp_systolic": 113, "temperature": 99.3, "bp_diastolic": 70}	Hypertension	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-28 09:20:10.862854	2025-12-28 09:20:10.862854	2025-12-28 09:40:10.862854	2026-01-10 17:05:10.654027
281	74	16	7	140	{"pulse": 90, "bp_systolic": 115, "temperature": 98.3, "bp_diastolic": 71}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2026-01-01 05:35:10.862854	2026-01-01 05:35:10.862854	2026-01-01 05:55:10.862854	2026-01-10 17:05:10.654027
282	74	15	7	325	{"pulse": 63, "bp_systolic": 138, "temperature": 99.1, "bp_diastolic": 76}	Gastritis	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-21 10:35:10.862854	2025-12-21 10:35:10.862854	2025-12-21 10:55:10.862854	2026-01-10 17:05:10.654027
283	9	13	6	874	{"pulse": 76, "bp_systolic": 139, "temperature": 97.9, "bp_diastolic": 83}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of cough	completed	2025-12-19 06:20:10.862854	2025-12-19 06:20:10.862854	2025-12-19 06:40:10.862854	2026-01-10 17:05:10.654027
284	48	2	1	543	{"pulse": 85, "bp_systolic": 121, "temperature": 97.6, "bp_diastolic": 76}	Migraine	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-15 05:05:10.862854	2026-01-15 05:05:10.862854	2026-01-15 05:25:10.862854	2026-01-10 17:05:10.654027
285	48	9	4	908	{"pulse": 81, "bp_systolic": 110, "temperature": 99.3, "bp_diastolic": 90}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of headache	completed	2026-01-01 03:05:10.862854	2026-01-01 03:05:10.862854	2026-01-01 03:25:10.862854	2026-01-10 17:05:10.654027
286	46	1	1	199	{"pulse": 87, "bp_systolic": 112, "temperature": 98.9, "bp_diastolic": 78}	Acute Pharyngitis	Sunny D Capsule Weekly	Patient complains of headache	completed	2026-01-13 02:35:10.862854	2026-01-13 02:35:10.862854	2026-01-13 02:55:10.862854	2026-01-10 17:05:10.654027
287	11	11	5	664	{"pulse": 70, "bp_systolic": 111, "temperature": 98.6, "bp_diastolic": 84}	Seasonal Flu	Panadol 500mg BID	Patient complains of headache	completed	2025-12-26 07:05:10.862854	2025-12-26 07:05:10.862854	2025-12-26 07:25:10.862854	2026-01-10 17:05:10.654027
288	1	1	1	483	{"pulse": 84, "bp_systolic": 134, "temperature": 98.3, "bp_diastolic": 79}	Seasonal Flu	Sunny D Capsule Weekly	Patient complains of cough	completed	2026-01-12 10:20:10.862854	2026-01-12 10:20:10.862854	2026-01-12 10:40:10.862854	2026-01-10 17:05:10.654027
289	55	5	2	648	{"pulse": 71, "bp_systolic": 120, "temperature": 99.2, "bp_diastolic": 84}	Gastritis	Augmentin 625mg BD	Patient complains of fever	completed	2026-01-02 08:50:10.862854	2026-01-02 08:50:10.862854	2026-01-02 09:10:10.862854	2026-01-10 17:05:10.654027
290	4	1	1	334	{"pulse": 89, "bp_systolic": 111, "temperature": 97.5, "bp_diastolic": 81}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of cough	completed	2026-01-02 06:05:10.862854	2026-01-02 06:05:10.862854	2026-01-02 06:25:10.862854	2026-01-10 17:05:10.654027
291	37	9	4	673	{"pulse": 83, "bp_systolic": 138, "temperature": 97.5, "bp_diastolic": 78}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-18 07:50:10.862854	2025-12-18 07:50:10.862854	2025-12-18 08:10:10.862854	2026-01-10 17:05:10.654027
292	14	13	6	339	{"pulse": 75, "bp_systolic": 132, "temperature": 98.2, "bp_diastolic": 90}	Gastritis	Panadol 500mg BID	Patient complains of stomach pain	completed	2026-01-11 10:05:10.862854	2026-01-11 10:05:10.862854	2026-01-11 10:25:10.862854	2026-01-10 17:05:10.654027
293	30	9	4	206	{"pulse": 63, "bp_systolic": 118, "temperature": 98.4, "bp_diastolic": 75}	Migraine	Sunny D Capsule Weekly	Patient complains of stomach pain	completed	2025-12-24 08:35:10.862854	2025-12-24 08:35:10.862854	2025-12-24 08:55:10.862854	2026-01-10 17:05:10.654027
294	26	18	8	799	{"pulse": 62, "bp_systolic": 138, "temperature": 99.3, "bp_diastolic": 74}	Lower Back Pain	Panadol 500mg BID	Patient complains of stomach pain	completed	2025-12-16 05:35:10.862854	2025-12-16 05:35:10.862854	2025-12-16 05:55:10.862854	2026-01-10 17:05:10.654027
295	44	15	7	184	{"pulse": 76, "bp_systolic": 132, "temperature": 99.0, "bp_diastolic": 87}	Gastritis	Panadol 500mg BID	Patient complains of fever	completed	2025-12-14 10:05:10.862854	2025-12-14 10:05:10.862854	2025-12-14 10:25:10.862854	2026-01-10 17:05:10.654027
296	86	13	6	114	{"pulse": 86, "bp_systolic": 126, "temperature": 98.6, "bp_diastolic": 77}	Seasonal Flu	Brufen 400mg TDS	Patient complains of stomach pain	completed	2026-01-10 02:05:10.862854	2026-01-10 02:05:10.862854	2026-01-10 02:25:10.862854	2026-01-10 17:05:10.654027
297	98	15	7	493	{"pulse": 65, "bp_systolic": 135, "temperature": 98.7, "bp_diastolic": 87}	Migraine	Risek 40mg OD	Patient complains of cough	completed	2025-12-16 07:20:10.862854	2025-12-16 07:20:10.862854	2025-12-16 07:40:10.862854	2026-01-10 17:05:10.654027
298	15	11	5	174	{"pulse": 69, "bp_systolic": 131, "temperature": 99.2, "bp_diastolic": 72}	Vitamin D Deficiency	Risek 40mg OD	Patient complains of stomach pain	completed	2026-01-07 04:35:10.862854	2026-01-07 04:35:10.862854	2026-01-07 04:55:10.862854	2026-01-10 17:05:10.654027
299	27	15	7	121	{"pulse": 65, "bp_systolic": 135, "temperature": 98.2, "bp_diastolic": 79}	Upper Respiratory Infection	Sunny D Capsule Weekly	Patient complains of fatigue	completed	2025-12-20 03:20:10.862854	2025-12-20 03:20:10.862854	2025-12-20 03:40:10.862854	2026-01-10 17:05:10.654027
300	86	2	1	537	{"pulse": 84, "bp_systolic": 131, "temperature": 98.3, "bp_diastolic": 74}	Vitamin D Deficiency	Sunny D Capsule Weekly	Patient complains of fever	completed	2025-12-25 05:05:10.862854	2025-12-25 05:05:10.862854	2025-12-25 05:25:10.862854	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5360 (class 0 OID 246006)
-- Dependencies: 250
-- Data for Name: availability_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_schedules (id, doctor_id, day_of_week, start_time, end_time, is_active, created_at, updated_at) FROM stdin;
1	1	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
3	1	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
4	1	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
5	1	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
6	2	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
7	2	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
8	2	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
9	2	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
10	2	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
11	3	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
12	3	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
13	3	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
14	3	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
15	3	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
16	4	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
17	4	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
18	4	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
19	4	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
20	4	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
21	5	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
22	5	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
23	5	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
24	5	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
25	5	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
26	6	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
27	6	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
28	6	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
29	6	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
30	6	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
31	7	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
32	7	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
33	7	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
34	7	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
35	7	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
36	8	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
37	8	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
38	8	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
39	8	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
40	8	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
41	9	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
42	9	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
43	9	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
44	9	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
45	9	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
46	10	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
47	10	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
48	10	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
49	10	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
50	10	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
51	11	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
52	11	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
53	11	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
54	11	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
55	11	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
56	12	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
57	12	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
58	12	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
59	12	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
60	12	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
61	13	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
62	13	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
63	13	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
64	13	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
65	13	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
66	14	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
67	14	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
68	14	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
69	14	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
70	14	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
71	15	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
72	15	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
73	15	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
74	15	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
75	15	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
76	16	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
77	16	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
78	16	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
79	16	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
80	16	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
81	17	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
82	17	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
83	17	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
84	17	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
85	17	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
86	18	1	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
87	18	2	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
88	18	3	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
89	18	4	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
90	18	5	09:00:00	17:00:00	f	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
2	1	2	09:00:00	17:00:00	t	2026-01-10 17:05:10.654027	2026-03-31 14:24:25.162297
\.


--
-- TOC entry 5366 (class 0 OID 246085)
-- Dependencies: 256
-- Data for Name: bulletins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulletins (id, company_id, title, message, active, created_at) FROM stdin;
1	1	Dengue Fever Alert	⚠️ Increased dengue cases in urban areas.	t	2026-01-10 17:05:10.654027
2	2	New COVID-19 Guidelines	📋 Updated protocols for patient screening.	t	2026-01-10 17:05:10.654027
3	1	Expansion Notice	🎉 We have opened new clinics in Quetta and Peshawar!	t	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5342 (class 0 OID 245779)
-- Dependencies: 232
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cities (id, name, region_id, created_at) FROM stdin;
1	Lahore	1	2026-01-10 17:05:10.654027
2	Faisalabad	1	2026-01-10 17:05:10.654027
3	Kasur	1	2026-01-10 17:05:10.654027
4	Okara	1	2026-01-10 17:05:10.654027
5	Sheikhupura	1	2026-01-10 17:05:10.654027
6	Nankana Sahib	1	2026-01-10 17:05:10.654027
7	Chiniot	1	2026-01-10 17:05:10.654027
8	Jhang	1	2026-01-10 17:05:10.654027
9	Toba Tek Singh	1	2026-01-10 17:05:10.654027
10	Rawalpindi	2	2026-01-10 17:05:10.654027
11	Islamabad	2	2026-01-10 17:05:10.654027
12	Attock	2	2026-01-10 17:05:10.654027
13	Chakwal	2	2026-01-10 17:05:10.654027
14	Jhelum	2	2026-01-10 17:05:10.654027
15	Sargodha	3	2026-01-10 17:05:10.654027
16	Mianwali	3	2026-01-10 17:05:10.654027
17	Khushab	3	2026-01-10 17:05:10.654027
18	Bhakkar	3	2026-01-10 17:05:10.654027
19	Multan	4	2026-01-10 17:05:10.654027
20	Bahawalpur	4	2026-01-10 17:05:10.654027
21	Bahawalnagar	4	2026-01-10 17:05:10.654027
22	DG Khan	4	2026-01-10 17:05:10.654027
23	Muzaffargarh	4	2026-01-10 17:05:10.654027
24	Rahim Yar Khan	4	2026-01-10 17:05:10.654027
25	Gujranwala	5	2026-01-10 17:05:10.654027
26	Sialkot	5	2026-01-10 17:05:10.654027
27	Gujrat	5	2026-01-10 17:05:10.654027
28	Narowal	5	2026-01-10 17:05:10.654027
29	Hafizabad	5	2026-01-10 17:05:10.654027
30	Sukkur	6	2026-01-10 17:05:10.654027
31	Larkana	6	2026-01-10 17:05:10.654027
32	Khairpur	6	2026-01-10 17:05:10.654027
33	Shikarpur	6	2026-01-10 17:05:10.654027
34	Jacobabad	6	2026-01-10 17:05:10.654027
35	Karachi	7	2026-01-10 17:05:10.654027
36	Hyderabad	7	2026-01-10 17:05:10.654027
37	Thatta	7	2026-01-10 17:05:10.654027
38	Badin	7	2026-01-10 17:05:10.654027
39	Nawabshah	8	2026-01-10 17:05:10.654027
40	Sanghar	8	2026-01-10 17:05:10.654027
41	Dadu	8	2026-01-10 17:05:10.654027
42	Jamshoro	8	2026-01-10 17:05:10.654027
43	Mithi	9	2026-01-10 17:05:10.654027
44	Tharparkar	9	2026-01-10 17:05:10.654027
45	Umerkot	9	2026-01-10 17:05:10.654027
46	Mirpur Khas	9	2026-01-10 17:05:10.654027
47	Abbottabad	10	2026-01-10 17:05:10.654027
48	Mansehra	10	2026-01-10 17:05:10.654027
49	Swat	10	2026-01-10 17:05:10.654027
50	Mingora	10	2026-01-10 17:05:10.654027
51	Chitral	10	2026-01-10 17:05:10.654027
52	Peshawar	11	2026-01-10 17:05:10.654027
53	Mardan	11	2026-01-10 17:05:10.654027
54	Charsadda	11	2026-01-10 17:05:10.654027
55	Nowshera	11	2026-01-10 17:05:10.654027
56	Swabi	11	2026-01-10 17:05:10.654027
57	Kohat	12	2026-01-10 17:05:10.654027
58	Bannu	12	2026-01-10 17:05:10.654027
59	Dera Ismail Khan	12	2026-01-10 17:05:10.654027
60	Khyber	13	2026-01-10 17:05:10.654027
61	Parachinar	13	2026-01-10 17:05:10.654027
62	Miramshah	13	2026-01-10 17:05:10.654027
63	Wana	13	2026-01-10 17:05:10.654027
64	Quetta	14	2026-01-10 17:05:10.654027
65	Pishin	14	2026-01-10 17:05:10.654027
66	Ziarat	14	2026-01-10 17:05:10.654027
67	Mastung	14	2026-01-10 17:05:10.654027
68	Zhob	15	2026-01-10 17:05:10.654027
69	Loralai	15	2026-01-10 17:05:10.654027
70	Killa Saifullah	15	2026-01-10 17:05:10.654027
71	Sibi	16	2026-01-10 17:05:10.654027
72	Dera Bugti	16	2026-01-10 17:05:10.654027
73	Kohlu	16	2026-01-10 17:05:10.654027
74	Chagai	17	2026-01-10 17:05:10.654027
75	Nushki	17	2026-01-10 17:05:10.654027
76	Kharan	17	2026-01-10 17:05:10.654027
77	Gwadar	18	2026-01-10 17:05:10.654027
78	Turbat	18	2026-01-10 17:05:10.654027
79	Kech	18	2026-01-10 17:05:10.654027
80	Panjgur	18	2026-01-10 17:05:10.654027
81	Lasbela	18	2026-01-10 17:05:10.654027
82	Gilgit	19	2026-01-10 17:05:10.654027
83	Hunza	19	2026-01-10 17:05:10.654027
84	Skardu	19	2026-01-10 17:05:10.654027
85	Muzaffarabad	20	2026-01-10 17:05:10.654027
86	Mirpur	20	2026-01-10 17:05:10.654027
87	Rawalakot	20	2026-01-10 17:05:10.654027
88	Khaplu	21	2026-01-10 17:05:10.654027
89	Shigar	21	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5344 (class 0 OID 245797)
-- Dependencies: 234
-- Data for Name: clinics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinics (id, company_id, name, location, city_id, status, created_at) FROM stdin;
1	1	Shifa Medical Center	F-7, Islamabad	11	active	2026-01-10 17:05:10.654027
2	2	Aga Khan Hospital	Stadium Road, Karachi	35	active	2026-01-10 17:05:10.654027
3	1	Services Hospital	Jail Road, Lahore	1	active	2026-01-10 17:05:10.654027
4	1	Edhi Center Quetta	Airport Road, Quetta	64	active	2026-01-10 17:05:10.654027
5	1	Edhi Peshawar Clinic	University Road, Peshawar	52	active	2026-01-10 17:05:10.654027
6	1	Edhi Gilgit Hub	Main Bazaar, Gilgit	82	active	2026-01-10 17:05:10.654027
7	2	Sehat Care Multan	Bosan Road, Multan	19	active	2026-01-10 17:05:10.654027
8	2	Sehat Life Hyderabad	Auto Bahn, Hyderabad	36	active	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5338 (class 0 OID 245742)
-- Dependencies: 228
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, email, contact, registration_number, address, subscription_plan, status, created_at) FROM stdin;
1	Edhi Foundation	info@edhi.pk	+923001111000	REG-EDH-2024-001	Blue Area, Islamabad, Pakistan	purchase	active	2026-01-10 17:05:10.654027
2	Sehat Medical Group	contact@sehat.pk	+923002222000	REG-SMG-2024-002	Clifton Block 5, Karachi, Pakistan	rental	active	2026-01-10 17:05:10.654027
3	E-Shifa Wellness Services	admin@eshifa.pk	+923003333000	REG-SWS-2024-003	Model Town, Lahore, Pakistan	per_consultation_with_doctor	inactive	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5332 (class 0 OID 228346)
-- Dependencies: 222
-- Data for Name: doctor_unavailability_admin_notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_unavailability_admin_notification (id, admin_id, doctor_id, shift_date, shift_start_time, notification_id, created_at) FROM stdin;
\.


--
-- TOC entry 5370 (class 0 OID 246143)
-- Dependencies: 260
-- Data for Name: doctor_unavailability_notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_unavailability_notification (id, doctor_id, shift_date, shift_start_time, admin_notified, notification_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5362 (class 0 OID 246025)
-- Dependencies: 252
-- Data for Name: doctor_unavailability_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctor_unavailability_requests (id, doctor_id, start_datetime, end_datetime, reason, status, admin_comment, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5358 (class 0 OID 245970)
-- Dependencies: 248
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.doctors (id, user_id, clinic_id, name, specialization_id, license_number, contact, status, missed_shifts_count, created_at) FROM stdin;
1	10	1	Ahmed Ali	1	PMC-202400	+923008000000	active	0	2026-01-10 17:05:10.654027
2	11	1	Fatima Hassan	2	PMC-202401	+923008000001	active	0	2026-01-10 17:05:10.654027
3	12	1	Hassan Raza	3	PMC-202402	+923008000002	active	0	2026-01-10 17:05:10.654027
4	13	2	Sara Khan	4	PMC-202403	+923008000003	active	0	2026-01-10 17:05:10.654027
5	14	2	Zahra Mirza	5	PMC-202404	+923008000004	active	0	2026-01-10 17:05:10.654027
6	15	2	Bilal Sheikh	6	PMC-202405	+923008000005	active	0	2026-01-10 17:05:10.654027
7	16	3	Usman Ahmed	7	PMC-202406	+923008000006	active	0	2026-01-10 17:05:10.654027
8	17	3	Nadia Hussain	8	PMC-202407	+923008000007	active	0	2026-01-10 17:05:10.654027
9	18	4	Jamal Khan	1	PMC-202408	+923008000008	active	0	2026-01-10 17:05:10.654027
10	19	4	Gul Wareen	2	PMC-202409	+923008000009	active	0	2026-01-10 17:05:10.654027
11	20	5	Yar Muhammad	3	PMC-202410	+923008000010	active	0	2026-01-10 17:05:10.654027
12	21	5	Palwasha Khan	4	PMC-202411	+923008000011	active	0	2026-01-10 17:05:10.654027
13	22	6	Ali Baig	5	PMC-202412	+923008000012	active	0	2026-01-10 17:05:10.654027
14	23	6	Amina Batool	6	PMC-202413	+923008000013	active	0	2026-01-10 17:05:10.654027
15	24	7	Fareed Shah	7	PMC-202414	+923008000014	active	0	2026-01-10 17:05:10.654027
16	25	7	Zainab Bibi	8	PMC-202415	+923008000015	active	0	2026-01-10 17:05:10.654027
17	26	8	Rajesh Kumar	1	PMC-202416	+923008000016	active	0	2026-01-10 17:05:10.654027
18	27	8	Anita Mahesh	2	PMC-202417	+923008000017	active	0	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5368 (class 0 OID 246105)
-- Dependencies: 258
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, recipient_type, recipient_id, patient_id, doctor_id, receptionist_id, clinic_id, clinic_name, title, message, read, created_at) FROM stdin;
1	appointment_new	doctor	6	6	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
2	appointment_new	doctor	1	86	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
3	appointment_new	doctor	11	4	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
4	appointment_new	doctor	7	1	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
5	appointment_new	doctor	11	49	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
6	appointment_new	doctor	17	23	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
7	appointment_new	doctor	12	50	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
8	appointment_new	doctor	16	71	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
9	appointment_new	doctor	11	28	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
10	appointment_new	doctor	9	25	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
11	appointment_new	doctor	10	25	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
12	appointment_new	doctor	6	83	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
13	appointment_new	doctor	7	50	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
14	appointment_new	doctor	3	73	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
15	appointment_new	doctor	6	75	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
16	appointment_new	doctor	13	73	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
17	appointment_new	doctor	8	31	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
18	appointment_new	doctor	15	52	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
19	appointment_new	doctor	16	86	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
20	appointment_new	doctor	18	13	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
21	appointment_new	doctor	18	26	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
22	appointment_new	doctor	16	97	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
23	appointment_new	doctor	4	21	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
24	appointment_new	doctor	10	83	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
25	appointment_new	doctor	9	65	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
26	appointment_new	doctor	1	83	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
27	appointment_new	doctor	10	92	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
28	appointment_new	doctor	9	89	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
29	appointment_new	doctor	17	52	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
30	appointment_new	doctor	18	88	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
31	appointment_new	doctor	2	77	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
32	appointment_new	doctor	14	75	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
33	appointment_new	doctor	16	30	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
34	appointment_new	doctor	12	92	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
35	appointment_new	doctor	2	65	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
36	appointment_new	doctor	6	89	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
37	appointment_new	doctor	6	91	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
38	appointment_new	doctor	5	100	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
39	appointment_new	doctor	4	76	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
40	appointment_new	doctor	10	73	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
41	appointment_new	doctor	15	29	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
42	appointment_new	doctor	15	26	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
43	appointment_new	doctor	17	15	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
44	appointment_new	doctor	8	19	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
45	appointment_new	doctor	3	24	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
46	appointment_new	doctor	14	53	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
47	appointment_new	doctor	16	62	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
48	appointment_new	doctor	12	15	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
49	appointment_new	doctor	8	82	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
50	appointment_new	doctor	11	67	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
51	appointment_new	doctor	4	56	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
52	appointment_new	doctor	8	40	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
53	appointment_new	doctor	5	93	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
54	appointment_new	doctor	12	68	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
55	appointment_new	doctor	6	72	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
56	appointment_new	doctor	11	100	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
57	appointment_new	doctor	6	49	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
58	appointment_new	doctor	13	14	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
59	appointment_new	doctor	10	55	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
60	appointment_new	doctor	7	12	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
61	appointment_new	doctor	5	16	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
62	appointment_new	doctor	17	36	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
63	appointment_new	doctor	1	86	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
64	appointment_new	doctor	13	53	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
65	appointment_new	doctor	1	71	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
66	appointment_new	doctor	14	40	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
67	appointment_new	doctor	9	22	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
68	appointment_new	doctor	2	56	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
69	appointment_new	doctor	12	98	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
70	appointment_new	doctor	12	11	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
71	appointment_new	doctor	2	68	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
72	appointment_new	doctor	5	40	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
73	appointment_new	doctor	14	38	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
74	appointment_new	doctor	3	89	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
75	appointment_new	doctor	4	96	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
76	appointment_new	doctor	17	32	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
77	appointment_new	doctor	7	19	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
78	appointment_new	doctor	8	95	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
79	appointment_new	doctor	15	39	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
80	appointment_new	doctor	17	94	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
81	appointment_new	doctor	18	29	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
82	appointment_new	doctor	14	24	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
83	appointment_new	doctor	4	89	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
84	appointment_new	doctor	9	89	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
85	appointment_new	doctor	14	49	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
86	appointment_new	doctor	4	38	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
87	appointment_new	doctor	15	94	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
88	appointment_new	doctor	14	84	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
89	appointment_new	doctor	5	36	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
90	appointment_new	doctor	12	45	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
91	appointment_new	doctor	11	82	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
92	appointment_new	doctor	5	21	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
93	appointment_new	doctor	17	49	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
94	appointment_new	doctor	8	10	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
95	appointment_new	doctor	11	98	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
96	appointment_new	doctor	5	15	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
97	appointment_new	doctor	13	75	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
98	appointment_new	doctor	2	37	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
99	appointment_new	doctor	6	48	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
100	appointment_new	doctor	11	74	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
101	appointment_new	doctor	14	58	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
102	appointment_new	doctor	17	12	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
103	appointment_new	doctor	10	43	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
104	appointment_new	doctor	4	75	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
105	appointment_new	doctor	2	55	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
106	appointment_new	doctor	11	44	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
107	appointment_new	doctor	4	10	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
108	appointment_new	doctor	11	29	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
109	appointment_new	doctor	15	43	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
110	appointment_new	doctor	12	73	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
111	appointment_new	doctor	16	15	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
112	appointment_new	doctor	12	97	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
113	appointment_new	doctor	15	83	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
114	appointment_new	doctor	14	4	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
115	appointment_new	doctor	2	44	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
116	appointment_new	doctor	6	85	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
117	appointment_new	doctor	15	13	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
118	appointment_new	doctor	11	91	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
119	appointment_new	doctor	6	65	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
120	appointment_new	doctor	10	9	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
121	appointment_new	doctor	13	55	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
122	appointment_new	doctor	8	76	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
123	appointment_new	doctor	10	54	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
124	appointment_new	doctor	5	13	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
125	appointment_new	doctor	4	42	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
126	appointment_new	doctor	18	99	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
127	appointment_new	doctor	12	58	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
128	appointment_new	doctor	5	76	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
129	appointment_new	doctor	14	18	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
130	appointment_new	doctor	17	82	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
131	appointment_new	doctor	17	9	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
132	appointment_new	doctor	8	19	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
133	appointment_new	doctor	18	13	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
134	appointment_new	doctor	7	11	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
135	appointment_new	doctor	10	2	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
136	appointment_new	doctor	1	9	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
137	appointment_new	doctor	5	93	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
138	appointment_new	doctor	18	75	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
139	appointment_new	doctor	13	72	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
140	appointment_new	doctor	17	48	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
141	appointment_new	doctor	11	98	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
142	appointment_new	doctor	7	46	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
143	appointment_new	doctor	11	38	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
144	appointment_new	doctor	5	93	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
145	appointment_new	doctor	3	59	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
146	appointment_new	doctor	1	96	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
147	appointment_new	doctor	18	68	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
148	appointment_new	doctor	8	8	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
149	appointment_new	doctor	6	87	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
150	appointment_new	doctor	13	44	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
151	appointment_new	doctor	10	81	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
152	appointment_new	doctor	7	39	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
153	appointment_new	doctor	15	26	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
154	appointment_new	doctor	10	97	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
155	appointment_new	doctor	13	21	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
156	appointment_new	doctor	8	42	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
157	appointment_new	doctor	4	79	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
158	appointment_new	doctor	11	18	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
159	appointment_new	doctor	2	59	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
160	appointment_new	doctor	5	73	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
161	appointment_new	doctor	6	9	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
162	appointment_new	doctor	6	19	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
163	appointment_new	doctor	1	49	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
164	appointment_new	doctor	11	95	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
165	appointment_new	doctor	11	67	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
166	appointment_new	doctor	8	51	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
167	appointment_new	doctor	12	74	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
168	appointment_new	doctor	3	65	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
169	appointment_new	doctor	5	50	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
170	appointment_new	doctor	9	93	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
171	appointment_new	doctor	2	88	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
172	appointment_new	doctor	15	15	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
173	appointment_new	doctor	15	86	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
174	appointment_new	doctor	17	5	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
175	appointment_new	doctor	17	93	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
176	appointment_new	doctor	16	20	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
177	appointment_new	doctor	8	56	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
178	appointment_new	doctor	11	65	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
179	appointment_new	doctor	3	95	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
180	appointment_new	doctor	11	91	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
181	appointment_new	doctor	4	1	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
182	appointment_new	doctor	3	16	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
183	appointment_new	doctor	15	85	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
184	appointment_new	doctor	11	78	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
185	appointment_new	doctor	6	54	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
186	appointment_new	doctor	4	47	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
187	appointment_new	doctor	4	95	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
188	appointment_new	doctor	3	79	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
189	appointment_new	doctor	9	29	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
190	appointment_new	doctor	14	75	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
191	appointment_new	doctor	6	51	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
192	appointment_new	doctor	17	35	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
193	appointment_new	doctor	3	30	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
194	appointment_new	doctor	3	80	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
195	appointment_new	doctor	8	29	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
196	appointment_new	doctor	11	32	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
197	appointment_new	doctor	4	53	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
198	appointment_new	doctor	2	45	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
199	appointment_new	doctor	12	40	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
200	appointment_new	doctor	6	78	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
201	appointment_new	doctor	16	74	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
202	appointment_new	doctor	13	5	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
203	appointment_new	doctor	16	41	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
204	appointment_new	doctor	11	50	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
205	appointment_new	doctor	11	18	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
206	appointment_new	doctor	17	73	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
207	appointment_new	doctor	17	69	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
208	appointment_new	doctor	15	90	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
209	appointment_new	doctor	18	83	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
210	appointment_new	doctor	6	79	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
211	appointment_new	doctor	13	6	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
212	appointment_new	doctor	2	63	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
213	appointment_new	doctor	11	37	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
214	appointment_new	doctor	8	31	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
215	appointment_new	doctor	1	47	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
216	appointment_new	doctor	13	48	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
217	appointment_new	doctor	13	5	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
218	appointment_new	doctor	16	72	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
219	appointment_new	doctor	1	43	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
220	appointment_new	doctor	4	63	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
221	appointment_new	doctor	17	37	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
222	appointment_new	doctor	15	86	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
223	appointment_new	doctor	6	58	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
224	appointment_new	doctor	9	55	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
225	appointment_new	doctor	6	60	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
226	appointment_new	doctor	13	81	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
227	appointment_new	doctor	8	36	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
228	appointment_new	doctor	7	82	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
229	appointment_new	doctor	3	62	3	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
230	appointment_new	doctor	17	63	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
231	appointment_new	doctor	15	32	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
232	appointment_new	doctor	8	100	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
233	appointment_new	doctor	15	62	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
234	appointment_new	doctor	5	79	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
235	appointment_new	doctor	18	13	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
236	appointment_new	doctor	13	61	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
237	appointment_new	doctor	7	36	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
238	appointment_new	doctor	14	34	14	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
239	appointment_new	doctor	1	23	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
240	appointment_new	doctor	7	80	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
241	appointment_new	doctor	5	49	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
242	appointment_new	doctor	18	73	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
243	appointment_new	doctor	8	96	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
244	appointment_new	doctor	10	40	10	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
245	appointment_new	doctor	11	97	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
246	appointment_new	doctor	7	42	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
247	appointment_new	doctor	12	65	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
248	appointment_new	doctor	16	7	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
249	appointment_new	doctor	11	48	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
250	appointment_new	doctor	7	47	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
251	appointment_new	doctor	6	19	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
252	appointment_new	doctor	4	75	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
253	appointment_new	doctor	17	30	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
254	appointment_new	doctor	12	13	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
255	appointment_new	doctor	17	61	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
256	appointment_new	doctor	17	1	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
257	appointment_new	doctor	13	66	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
258	appointment_new	doctor	2	72	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
259	appointment_new	doctor	12	94	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
260	appointment_new	doctor	11	12	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
261	appointment_new	doctor	4	74	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
262	appointment_new	doctor	8	76	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
263	appointment_new	doctor	2	56	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
264	appointment_new	doctor	8	5	8	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
265	appointment_new	doctor	7	70	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
266	appointment_new	doctor	7	10	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
267	appointment_new	doctor	12	84	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
268	appointment_new	doctor	12	72	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
269	appointment_new	doctor	12	81	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
270	appointment_new	doctor	15	6	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
271	appointment_new	doctor	7	65	7	\N	3	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
272	appointment_new	doctor	1	91	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
273	appointment_new	doctor	4	42	4	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
274	appointment_new	doctor	12	58	12	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
275	appointment_new	doctor	13	46	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
276	appointment_new	doctor	15	69	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
277	appointment_new	doctor	13	86	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
278	appointment_new	doctor	17	63	17	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
279	appointment_new	doctor	6	41	6	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
280	appointment_new	doctor	13	91	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
281	appointment_new	doctor	16	74	16	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
282	appointment_new	doctor	15	74	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
283	appointment_new	doctor	13	9	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
284	appointment_new	doctor	2	48	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
285	appointment_new	doctor	9	48	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
286	appointment_new	doctor	1	46	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
287	appointment_new	doctor	11	11	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
288	appointment_new	doctor	1	1	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
289	appointment_new	doctor	5	55	5	\N	2	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
290	appointment_new	doctor	1	4	1	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
291	appointment_new	doctor	9	37	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
292	appointment_new	doctor	13	14	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
293	appointment_new	doctor	9	30	9	\N	4	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
294	appointment_new	doctor	18	26	18	\N	8	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
295	appointment_new	doctor	15	44	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
296	appointment_new	doctor	13	86	13	\N	6	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
297	appointment_new	doctor	15	98	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
298	appointment_new	doctor	11	15	11	\N	5	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
299	appointment_new	doctor	15	27	15	\N	7	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
300	appointment_new	doctor	2	86	2	\N	1	\N	New Appointment	New appointment scheduled.	f	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5330 (class 0 OID 91548)
-- Dependencies: 220
-- Data for Name: pakistan_regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pakistan_regions (id, city, sub_region, province, created_at) FROM stdin;
1	Lahore	Central Punjab	Punjab	2025-11-23 16:51:11.572962
2	Faisalabad	Central Punjab	Punjab	2025-11-23 16:51:11.572962
3	Kasur	Central Punjab	Punjab	2025-11-23 16:51:11.572962
4	Okara	Central Punjab	Punjab	2025-11-23 16:51:11.572962
5	Sheikhupura	Central Punjab	Punjab	2025-11-23 16:51:11.572962
6	Nankana Sahib	Central Punjab	Punjab	2025-11-23 16:51:11.572962
7	Chiniot	Central Punjab	Punjab	2025-11-23 16:51:11.572962
8	Jhang	Central Punjab	Punjab	2025-11-23 16:51:11.572962
9	Toba Tek Singh	Central Punjab	Punjab	2025-11-23 16:51:11.572962
10	Kamoke	Central Punjab	Punjab	2025-11-23 16:51:11.572962
11	Murīdke	Central Punjab	Punjab	2025-11-23 16:51:11.572962
12	Raiwind	Central Punjab	Punjab	2025-11-23 16:51:11.572962
13	Pattoki	Central Punjab	Punjab	2025-11-23 16:51:11.572962
14	Depalpur	Central Punjab	Punjab	2025-11-23 16:51:11.572962
15	Gojra	Central Punjab	Punjab	2025-11-23 16:51:11.572962
16	Samundri	Central Punjab	Punjab	2025-11-23 16:51:11.572962
17	Shorkot	Central Punjab	Punjab	2025-11-23 16:51:11.572962
18	Shahkot	Central Punjab	Punjab	2025-11-23 16:51:11.572962
19	Jaranwala	Central Punjab	Punjab	2025-11-23 16:51:11.572962
20	Rawalpindi	Potohar Region	Punjab	2025-11-23 16:51:11.572962
21	Islamabad	Potohar Region	Punjab	2025-11-23 16:51:11.572962
22	Attock	Potohar Region	Punjab	2025-11-23 16:51:11.572962
23	Taxila	Potohar Region	Punjab	2025-11-23 16:51:11.572962
24	Wah Cantonment	Potohar Region	Punjab	2025-11-23 16:51:11.572962
25	Chakwal	Potohar Region	Punjab	2025-11-23 16:51:11.572962
26	Talagang	Potohar Region	Punjab	2025-11-23 16:51:11.572962
27	Jhelum	Potohar Region	Punjab	2025-11-23 16:51:11.572962
28	Dina	Potohar Region	Punjab	2025-11-23 16:51:11.572962
29	Gujar Khan	Potohar Region	Punjab	2025-11-23 16:51:11.572962
30	Murree	Potohar Region	Punjab	2025-11-23 16:51:11.572962
31	Kotli Sattian	Potohar Region	Punjab	2025-11-23 16:51:11.572962
32	Kahuta	Potohar Region	Punjab	2025-11-23 16:51:11.572962
33	Kallar Syedan	Potohar Region	Punjab	2025-11-23 16:51:11.572962
34	Sargodha	Western Punjab	Punjab	2025-11-23 16:51:11.572962
35	Mianwali	Western Punjab	Punjab	2025-11-23 16:51:11.572962
36	Khushab	Western Punjab	Punjab	2025-11-23 16:51:11.572962
37	Bhakkar	Western Punjab	Punjab	2025-11-23 16:51:11.572962
38	Kot Adu	Western Punjab	Punjab	2025-11-23 16:51:11.572962
39	Jauharabad	Western Punjab	Punjab	2025-11-23 16:51:11.572962
40	Kundian	Western Punjab	Punjab	2025-11-23 16:51:11.572962
41	Multan	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
42	Bahawalpur	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
43	Bahawalnagar	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
44	DG Khan	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
45	Muzaffargarh	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
46	Layyah	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
47	Rajanpur	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
48	Rahim Yar Khan	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
49	Sadiqabad	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
50	Khanpur	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
51	Lodhran	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
52	Hasilpur	Southern Punjab	Punjab	2025-11-23 16:51:11.572962
53	Gujranwala	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
54	Sialkot	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
55	Gujrat	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
56	Wazirabad	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
57	Daska	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
58	Narowal	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
59	Hafizabad	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
60	Phalia	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
61	Mandi Bahauddin	Eastern Punjab	Punjab	2025-11-23 16:51:11.572962
62	Sukkur	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
63	Larkana	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
64	Khairpur	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
65	Shikarpur	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
66	Jacobabad	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
67	Ghotki	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
68	Kashmore	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
69	Kandhkot	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
70	Rohri	Upper Sindh	Sindh	2025-11-23 16:51:11.572962
71	Karachi	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
72	Hyderabad	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
73	Thatta	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
74	Mirpur Sakro	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
75	Badin	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
76	Sujawal	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
77	Kotri	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
78	Tando Muhammad Khan	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
79	Tando Allahyar	Lower Sindh	Sindh	2025-11-23 16:51:11.572962
80	Nawabshah	Central Sindh	Sindh	2025-11-23 16:51:11.572962
81	Sanghar	Central Sindh	Sindh	2025-11-23 16:51:11.572962
82	Dadu	Central Sindh	Sindh	2025-11-23 16:51:11.572962
83	Jamshoro	Central Sindh	Sindh	2025-11-23 16:51:11.572962
84	Matiari	Central Sindh	Sindh	2025-11-23 16:51:11.572962
85	Shahdadpur	Central Sindh	Sindh	2025-11-23 16:51:11.572962
86	Sehwan	Central Sindh	Sindh	2025-11-23 16:51:11.572962
87	Mithi	Thar Region	Sindh	2025-11-23 16:51:11.572962
88	Tharparkar	Thar Region	Sindh	2025-11-23 16:51:11.572962
89	Umerkot	Thar Region	Sindh	2025-11-23 16:51:11.572962
90	Mirpur Khas	Thar Region	Sindh	2025-11-23 16:51:11.572962
91	Diplo	Thar Region	Sindh	2025-11-23 16:51:11.572962
92	Chachro	Thar Region	Sindh	2025-11-23 16:51:11.572962
93	Nagarparkar	Thar Region	Sindh	2025-11-23 16:51:11.572962
94	Abbottabad	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
95	Mansehra	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
96	Balakot	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
97	Battagram	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
98	Besham	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
99	Alpuri	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
100	Swat	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
101	Mingora	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
102	Kalam	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
103	Malakand	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
104	Dir	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
105	Chitral	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
106	Drosh	Northern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
107	Peshawar	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
108	Mardan	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
109	Charsadda	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
110	Nowshera	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
111	Swabi	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
112	Takht-i-Bahi	Central KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
113	Kohat	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
114	Hangu	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
115	Karak	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
116	Bannu	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
117	Lakki Marwat	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
118	Tank	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
119	Dera Ismail Khan	Southern KP	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
120	Khyber	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
121	Bara	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
122	Parachinar	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
123	Sadda	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
124	Miramshah	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
125	Miran Shah	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
126	Wana	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
127	Ghalanai	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
128	Khar	Ex-FATA Areas	Khyber Pakhtunkhwa	2025-11-23 16:51:11.572962
129	Quetta	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
130	Pishin	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
131	Chaman	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
132	Ziarat	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
133	Mastung	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
134	Killa Abdullah	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
135	Huramzai	Central Balochistan	Balochistan	2025-11-23 16:51:11.572962
136	Zhob	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
137	Loralai	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
138	Killa Saifullah	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
139	Musakhel	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
140	Barkhan	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
141	Sherani	Northern Balochistan	Balochistan	2025-11-23 16:51:11.572962
142	Sibi	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
143	Dera Bugti	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
144	Kohlu	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
145	Dhadar	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
146	Jaffarabad	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
147	Sohbatpur	Eastern Balochistan	Balochistan	2025-11-23 16:51:11.572962
148	Chagai	Western Balochistan	Balochistan	2025-11-23 16:51:11.572962
149	Nushki	Western Balochistan	Balochistan	2025-11-23 16:51:11.572962
150	Dalbandin	Western Balochistan	Balochistan	2025-11-23 16:51:11.572962
151	Kharan	Western Balochistan	Balochistan	2025-11-23 16:51:11.572962
152	Washuk	Western Balochistan	Balochistan	2025-11-23 16:51:11.572962
153	Gwadar	Makran Region	Balochistan	2025-11-23 16:51:11.572962
154	Turbat	Makran Region	Balochistan	2025-11-23 16:51:11.572962
155	Kech	Makran Region	Balochistan	2025-11-23 16:51:11.572962
156	Panjgur	Makran Region	Balochistan	2025-11-23 16:51:11.572962
157	Awaran	Makran Region	Balochistan	2025-11-23 16:51:11.572962
158	Lasbela	Makran Region	Balochistan	2025-11-23 16:51:11.572962
159	Hub	Makran Region	Balochistan	2025-11-23 16:51:11.572962
160	Ormara	Makran Region	Balochistan	2025-11-23 16:51:11.572962
161	Pasni	Makran Region	Balochistan	2025-11-23 16:51:11.572962
\.


--
-- TOC entry 5346 (class 0 OID 245824)
-- Dependencies: 236
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, name, age, gender, father_name, marital_status, contact, email, address, cnic, occupation, nationality, created_at, updated_at) FROM stdin;
1	Zainab Hussain	35	Female	Muhammad Hussain	Married	+923324361625	zainab.hussain1804@example.com	House 983, Street 11, Rawalakot	34776-6732482-8	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
2	Bilal Siddiqui	25	Male	Khadija Siddiqui	Single	+923258018084	bilal.siddiqui9610@example.com	House 175, Street 12, Dera Bugti	35926-4133073-5	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
3	Rabia Hussain	60	Female	Nida Hussain	Single	+923328791446	rabia.hussain7228@example.com	House 498, Street 15, Lahore	31695-4724615-7	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
4	Zain Rehman	42	Male	Omar Rehman	Single	+923497141885	zain.rehman7439@example.com	House 445, Street 11, Kohat	33890-2010576-5	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
5	Usman Malik	37	Male	Hamza Malik	Married	+923118908311	usman.malik8215@example.com	House 221, Street 7, Hunza	31974-1305964-7	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
6	Hina Ansari	80	Female	Muhammad Ansari	Married	+923246678434	hina.ansari3646@example.com	House 488, Street 11, Muzaffargarh	34907-4748330-3	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
7	Maryam Ansari	31	Female	Zain Ansari	Married	+923164234318	maryam.ansari2175@example.com	House 42, Street 18, Mianwali	36929-7977437-7	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
8	Sidra Shah	55	Female	Zain Shah	Single	+923333049864	sidra.shah2128@example.com	House 811, Street 16, Ziarat	36048-6864024-8	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
9	Iqra Siddiqui	19	Female	Bilal Siddiqui	Single	+923477263520	iqra.siddiqui7261@example.com	House 992, Street 10, Sukkur	38162-4998326-5	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
10	Khadija Siddiqui	49	Female	Ayesha Siddiqui	Single	+923325539588	khadija.siddiqui4803@example.com	House 830, Street 19, Jhelum	37756-1729218-3	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
11	Ayesha Rehman	30	Female	Zainab Rehman	Single	+923412914304	ayesha.rehman1561@example.com	House 373, Street 1, Dera Bugti	32466-7887252-7	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
12	Ayesha Ansari	22	Female	Omar Ansari	Married	+923268993002	ayesha.ansari6505@example.com	House 371, Street 16, Shigar	37432-1496634-3	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
13	Maryam Siddiqui	70	Female	Sidra Siddiqui	Single	+923379255023	maryam.siddiqui9874@example.com	House 678, Street 17, Khyber	37071-4800525-3	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
14	Ali Jutt	57	Male	Omar Jutt	Married	+923217117019	ali.jutt9453@example.com	House 254, Street 8, Gilgit	34286-4700489-1	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
15	Sadia Hussain	27	Female	Omar Hussain	Married	+923363583102	sadia.hussain853@example.com	House 560, Street 6, Multan	31485-1730235-9	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
16	Usman Rehman	85	Male	Hassan Rehman	Married	+923281655210	usman.rehman5618@example.com	House 36, Street 4, Khairpur	36298-9067370-6	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
17	Usman Chaudhry	55	Male	Maryam Chaudhry	Single	+923373764837	usman.chaudhry695@example.com	House 761, Street 14, Zhob	34000-6477767-3	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
18	Maryam Jutt	38	Female	Khadija Jutt	Single	+923267445088	maryam.jutt634@example.com	House 133, Street 14, Peshawar	37682-2312553-9	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
19	Khadija Shah	30	Female	Hassan Shah	Married	+923157676444	khadija.shah3678@example.com	House 238, Street 17, Chagai	36028-4350091-8	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
20	Hamza Qureshi	82	Male	Zainab Qureshi	Single	+923486935070	hamza.qureshi8950@example.com	House 686, Street 4, Wana	33229-5847071-1	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
21	Omar Hussain	39	Male	Ayesha Hussain	Single	+923357827062	omar.hussain863@example.com	House 528, Street 7, Quetta	37431-3245388-9	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
22	Nida Sheikh	24	Female	Omar Sheikh	Married	+923294081080	nida.sheikh8505@example.com	House 866, Street 11, Gilgit	31570-5915813-4	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
23	Sidra Butt	31	Female	Hassan Butt	Married	+923313469910	sidra.butt9300@example.com	House 667, Street 20, Chiniot	37730-6638487-3	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
24	Sadia Sheikh	50	Female	Omar Sheikh	Married	+923193850047	sadia.sheikh9774@example.com	House 744, Street 13, Bhakkar	32191-4147349-4	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
25	Rabia Ahmed	69	Female	Bilal Ahmed	Single	+923132690167	rabia.ahmed9889@example.com	House 146, Street 18, Dera Ismail Khan	35378-7235457-3	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
26	Maryam Sheikh	62	Female	Fatima Sheikh	Single	+923138816602	maryam.sheikh8699@example.com	House 582, Street 9, Chakwal	32134-6502089-1	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
27	Rabia Ahmed	57	Female	Bilal Ahmed	Married	+923257263259	rabia.ahmed1701@example.com	House 350, Street 15, Bahawalnagar	32582-9056443-3	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
28	Zain Ansari	61	Male	Nida Ansari	Single	+923106074544	zain.ansari2579@example.com	House 136, Street 2, Quetta	33169-4263795-4	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
29	Maryam Ali	38	Female	Khadija Ali	Single	+923372271410	maryam.ali9460@example.com	House 402, Street 14, Mithi	36767-8136877-4	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
30	Ali Chaudhry	36	Male	Khadija Chaudhry	Single	+923315295087	ali.chaudhry6902@example.com	House 693, Street 2, Larkana	33927-3148103-7	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
31	Muhammad Jutt	26	Male	Sana Jutt	Married	+923157201775	muhammad.jutt7219@example.com	House 167, Street 16, Gilgit	31126-4814747-1	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
32	Sana Ansari	68	Female	Hassan Ansari	Married	+923234515673	sana.ansari7755@example.com	House 73, Street 14, Miramshah	34791-6907797-7	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
33	Ayesha Jutt	45	Female	Hamza Jutt	Single	+923198925021	ayesha.jutt9744@example.com	House 623, Street 19, Islamabad	38188-9879540-7	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
34	Maryam Chaudhry	75	Female	Maryam Chaudhry	Married	+923486727847	maryam.chaudhry9524@example.com	House 439, Street 5, Sibi	31733-9062880-7	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
35	Khadija Bhatti	60	Female	Nida Bhatti	Single	+923256157125	khadija.bhatti2119@example.com	House 79, Street 14, Gujranwala	33001-1787455-7	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
36	Iqra Khan	54	Female	Zain Khan	Married	+923482944982	iqra.khan7632@example.com	House 112, Street 4, Karachi	31351-6700884-5	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
37	Omar Chaudhry	69	Male	Khadija Chaudhry	Single	+923411035612	omar.chaudhry1055@example.com	House 381, Street 9, Sargodha	36054-8859408-1	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
38	Fatima Abbasi	37	Female	Sana Abbasi	Married	+923217990974	fatima.abbasi8001@example.com	House 502, Street 9, Bhakkar	33040-9803387-5	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
39	Sana Chaudhry	79	Female	Hassan Chaudhry	Married	+923447031304	sana.chaudhry9677@example.com	House 87, Street 11, Jhang	38181-2967923-9	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
80	Nida Abbasi	55	Female	Nida Abbasi	Single	+923282032810	nida.abbasi8871@example.com	House 983, Street 5, Lasbela	36393-7140818-2	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
40	Zainab Abbasi	27	Female	Bilal Abbasi	Married	+923455069376	zainab.abbasi6417@example.com	House 316, Street 19, Panjgur	37481-4370899-1	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
41	Zainab Khan	66	Female	Sidra Khan	Married	+923306573819	zainab.khan4924@example.com	House 873, Street 3, Swat	35093-2419044-9	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
42	Iqra Abbasi	69	Female	Hina Abbasi	Married	+923338983479	iqra.abbasi3465@example.com	House 553, Street 17, Multan	32119-1903586-5	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
43	Maryam Shah	83	Female	Hina Shah	Single	+923366297336	maryam.shah4441@example.com	House 744, Street 1, Abbottabad	36588-9857349-6	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
44	Hina Bhatti	40	Female	Fatima Bhatti	Single	+923126317644	hina.bhatti3702@example.com	House 792, Street 19, Abbottabad	34082-7521666-9	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
45	Zain Ali	43	Male	Fatima Ali	Married	+923339561123	zain.ali1346@example.com	House 944, Street 13, Mianwali	31682-8815166-5	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
46	Zainab Raza	23	Female	Sadia Raza	Single	+923472122912	zainab.raza4250@example.com	House 533, Street 8, Mastung	37198-5098646-6	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
47	Iqra Malik	60	Female	Sadia Malik	Married	+923388228366	iqra.malik5722@example.com	House 78, Street 3, Gilgit	34482-3123797-8	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
48	Nida Qureshi	73	Female	Zain Qureshi	Married	+923406758143	nida.qureshi1835@example.com	House 391, Street 18, Mastung	36128-8517561-5	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
49	Rabia Butt	58	Female	Sidra Butt	Single	+923179976316	rabia.butt44@example.com	House 559, Street 15, Parachinar	34379-5937925-4	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
50	Hassan Malik	28	Male	Hina Malik	Single	+923446160192	hassan.malik3696@example.com	House 838, Street 19, Khaplu	37675-1261428-6	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
51	Nida Raza	67	Female	Muhammad Raza	Married	+923489495461	nida.raza3261@example.com	House 858, Street 7, Muzaffarabad	32062-8153874-7	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
52	Fatima Hussain	44	Female	Hassan Hussain	Married	+923419356031	fatima.hussain9318@example.com	House 354, Street 8, Dadu	35784-3403569-6	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
53	Fatima Shah	61	Female	Ayesha Shah	Single	+923339062327	fatima.shah8035@example.com	House 247, Street 14, Nowshera	33421-1224635-9	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
54	Omar Khan	52	Male	Sidra Khan	Single	+923459143380	omar.khan6137@example.com	House 264, Street 8, Muzaffarabad	32894-2006287-8	Lawyer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
55	Fatima Butt	49	Female	Nida Butt	Single	+923375142940	fatima.butt3696@example.com	House 670, Street 19, Chitral	31260-3765366-4	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
56	Iqra Abbasi	85	Female	Muhammad Abbasi	Married	+923152525041	iqra.abbasi5386@example.com	House 81, Street 9, Bahawalnagar	34146-1975645-6	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
57	Omar Malik	24	Male	Bilal Malik	Married	+923262292443	omar.malik7111@example.com	House 378, Street 1, Killa Saifullah	35660-4697541-5	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
58	Omar Chaudhry	65	Male	Muhammad Chaudhry	Married	+923183769984	omar.chaudhry8950@example.com	House 782, Street 13, Swabi	35572-6735230-4	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
59	Zainab Hussain	40	Female	Ayesha Hussain	Single	+923157735346	zainab.hussain2977@example.com	House 382, Street 14, Kharan	31352-8633026-4	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
60	Muhammad Malik	73	Male	Omar Malik	Married	+923138144676	muhammad.malik5614@example.com	House 849, Street 17, Sheikhupura	34638-6642114-8	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
61	Muhammad Hussain	83	Male	Omar Hussain	Single	+923135701645	muhammad.hussain3185@example.com	House 659, Street 9, Panjgur	31329-6889744-6	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
62	Sidra Khan	30	Female	Khadija Khan	Married	+923131170275	sidra.khan7575@example.com	House 339, Street 15, Mardan	36423-4360986-6	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
63	Hassan Siddiqui	20	Male	Muhammad Siddiqui	Married	+923139614472	hassan.siddiqui7985@example.com	House 843, Street 2, Hyderabad	36820-8949749-2	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
64	Ali Qureshi	21	Male	Sadia Qureshi	Single	+923399978358	ali.qureshi7270@example.com	House 891, Street 20, Mingora	35226-1049540-2	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
65	Fatima Khan	20	Female	Usman Khan	Single	+923382828037	fatima.khan1814@example.com	House 996, Street 7, Shigar	37103-5086663-8	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
66	Ali Siddiqui	48	Male	Muhammad Siddiqui	Single	+923459040747	ali.siddiqui6781@example.com	House 217, Street 13, Charsadda	35223-2623466-4	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
67	Bilal Ahmed	56	Male	Zainab Ahmed	Single	+923176898585	bilal.ahmed2944@example.com	House 176, Street 15, Sargodha	33302-5815039-4	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
68	Iqra Jutt	79	Female	Nida Jutt	Married	+923178145741	iqra.jutt6128@example.com	House 337, Street 17, Bahawalnagar	36295-5280138-7	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
69	Rabia Bhatti	59	Female	Khadija Bhatti	Single	+923319429750	rabia.bhatti6533@example.com	House 234, Street 17, Rawalpindi	36849-9818269-5	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
70	Sana Sheikh	84	Female	Bilal Sheikh	Married	+923297355604	sana.sheikh8373@example.com	House 407, Street 6, Nushki	34521-2020043-6	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
71	Ayesha Malik	83	Female	Bilal Malik	Married	+923149193942	ayesha.malik7308@example.com	House 450, Street 19, Swat	37762-8931220-9	Engineer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
72	Bilal Raza	76	Male	Khadija Raza	Single	+923258069581	bilal.raza8101@example.com	House 516, Street 19, Skardu	32068-1416891-4	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
73	Ayesha Shah	23	Female	Ali Shah	Single	+923165823954	ayesha.shah2400@example.com	House 671, Street 12, Loralai	32994-5052643-9	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
74	Fatima Sheikh	53	Female	Sana Sheikh	Single	+923418760290	fatima.sheikh7055@example.com	House 415, Street 10, Pishin	38385-1939514-3	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
75	Omar Siddiqui	32	Male	Sana Siddiqui	Single	+923391453327	omar.siddiqui242@example.com	House 887, Street 20, Mirpur	35791-1122229-5	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
76	Bilal Butt	40	Male	Bilal Butt	Single	+923166255952	bilal.butt2448@example.com	House 151, Street 8, Chiniot	31244-4391451-9	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
77	Hassan Mirza	72	Male	Fatima Mirza	Single	+923119740667	hassan.mirza4523@example.com	House 897, Street 10, Chiniot	31203-3002620-4	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
78	Sadia Hussain	61	Female	Bilal Hussain	Married	+923427438768	sadia.hussain3815@example.com	House 75, Street 5, Mansehra	34022-2543419-2	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
79	Iqra Raza	74	Female	Zain Raza	Married	+923384612114	iqra.raza4806@example.com	House 343, Street 4, Rawalakot	35472-9499854-8	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
81	Khadija Ali	64	Female	Ayesha Ali	Single	+923447371656	khadija.ali9310@example.com	House 473, Street 19, Skardu	34257-5498788-2	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
82	Zain Ahmed	69	Male	Ali Ahmed	Single	+923239114585	zain.ahmed4383@example.com	House 786, Street 18, Tharparkar	31470-9601387-8	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
83	Fatima Siddiqui	70	Female	Zainab Siddiqui	Married	+923279359547	fatima.siddiqui3654@example.com	House 319, Street 11, Wana	35487-7599184-8	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
84	Nida Ali	36	Female	Ali Ali	Single	+923357173422	nida.ali3402@example.com	House 989, Street 15, Swabi	32514-6781992-1	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
85	Fatima Jutt	46	Female	Ali Jutt	Married	+923462670865	fatima.jutt7340@example.com	House 977, Street 11, Khyber	34562-1662898-1	Student	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
86	Maryam Mirza	73	Female	Sidra Mirza	Married	+923401908837	maryam.mirza9164@example.com	House 514, Street 17, Islamabad	32437-4841001-5	Doctor	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
87	Sana Ahmed	38	Female	Omar Ahmed	Married	+923455269684	sana.ahmed8335@example.com	House 401, Street 13, Khushab	37397-8432736-3	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
88	Zain Chaudhry	27	Male	Khadija Chaudhry	Single	+923146382166	zain.chaudhry8945@example.com	House 48, Street 5, Kharan	36394-4704873-8	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
89	Khadija Jutt	79	Female	Hassan Jutt	Married	+923108826850	khadija.jutt687@example.com	House 563, Street 14, Dera Bugti	37729-3863885-8	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
90	Iqra Rehman	34	Female	Sana Rehman	Married	+923496459786	iqra.rehman2956@example.com	House 892, Street 6, Hyderabad	33500-7165170-6	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
91	Hassan Qureshi	66	Male	Rabia Qureshi	Single	+923323223120	hassan.qureshi2442@example.com	House 561, Street 14, Nawabshah	34370-5205094-8	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
92	Sidra Malik	65	Female	Ayesha Malik	Single	+923212270722	sidra.malik3060@example.com	House 855, Street 19, Rawalakot	37252-7681576-3	Housewife	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
93	Muhammad Ansari	33	Male	Muhammad Ansari	Single	+923463236501	muhammad.ansari1944@example.com	House 258, Street 7, Sialkot	32342-5588897-8	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
94	Omar Qureshi	28	Male	Sidra Qureshi	Married	+923437069063	omar.qureshi2665@example.com	House 212, Street 12, Panjgur	37875-5558546-5	Shopkeeper	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
95	Zain Hussain	78	Male	Rabia Hussain	Married	+923255066180	zain.hussain76@example.com	House 637, Street 14, Rawalpindi	36975-6724923-3	Banker	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
96	Bilal Qureshi	81	Male	Zainab Qureshi	Single	+923373362624	bilal.qureshi4243@example.com	House 289, Street 11, Toba Tek Singh	36480-3523129-7	Civil Servant	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
97	Zain Mirza	81	Male	Sidra Mirza	Married	+923206539312	zain.mirza955@example.com	House 177, Street 10, Hyderabad	32862-3800301-8	Teacher	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
98	Hamza Rehman	60	Male	Iqra Rehman	Single	+923491974603	hamza.rehman7056@example.com	House 394, Street 8, Muzaffarabad	33117-3598089-2	Artist	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
99	Zain Butt	69	Male	Maryam Butt	Single	+923399915339	zain.butt4138@example.com	House 156, Street 18, Muzaffargarh	31413-9178368-2	Farmer	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
100	Sana Hussain	66	Female	Zainab Hussain	Married	+923496237934	sana.hussain2587@example.com	House 328, Street 1, Lahore	34293-6968089-4	Driver	Pakistani	2026-01-10 17:05:10.654027	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5356 (class 0 OID 245945)
-- Dependencies: 246
-- Data for Name: receptionists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receptionists (id, user_id, clinic_id, name, contact, created_at) FROM stdin;
1	28	1	Kamran Akmal	+923009000001	2026-01-10 17:05:10.654027
2	29	2	Sania Mirza	+923009000002	2026-01-10 17:05:10.654027
3	30	3	Shoaib Malik	+923009000003	2026-01-10 17:05:10.654027
4	31	4	Javed Miandad	+923009000004	2026-01-10 17:05:10.654027
5	32	5	Shahid Afridi	+923009000005	2026-01-10 17:05:10.654027
6	33	6	Wasim Akram	+923009000006	2026-01-10 17:05:10.654027
7	34	7	Inzamam Ul Haq	+923009000007	2026-01-10 17:05:10.654027
8	35	8	Younis Khan	+923009000008	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5340 (class 0 OID 245766)
-- Dependencies: 230
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regions (id, province, sub_region, created_at) FROM stdin;
1	Punjab	Central Punjab	2026-01-10 17:05:10.654027
2	Punjab	Potohar Region	2026-01-10 17:05:10.654027
3	Punjab	Western Punjab	2026-01-10 17:05:10.654027
4	Punjab	Southern Punjab	2026-01-10 17:05:10.654027
5	Punjab	Eastern Punjab	2026-01-10 17:05:10.654027
6	Sindh	Upper Sindh	2026-01-10 17:05:10.654027
7	Sindh	Lower Sindh	2026-01-10 17:05:10.654027
8	Sindh	Central Sindh	2026-01-10 17:05:10.654027
9	Sindh	Thar Region	2026-01-10 17:05:10.654027
10	Khyber Pakhtunkhwa	Northern KP	2026-01-10 17:05:10.654027
11	Khyber Pakhtunkhwa	Central KP	2026-01-10 17:05:10.654027
12	Khyber Pakhtunkhwa	Southern KP	2026-01-10 17:05:10.654027
13	Khyber Pakhtunkhwa	Ex-FATA Areas	2026-01-10 17:05:10.654027
14	Balochistan	Central Balochistan	2026-01-10 17:05:10.654027
15	Balochistan	Northern Balochistan	2026-01-10 17:05:10.654027
16	Balochistan	Eastern Balochistan	2026-01-10 17:05:10.654027
17	Balochistan	Western Balochistan	2026-01-10 17:05:10.654027
18	Balochistan	Makran Region	2026-01-10 17:05:10.654027
19	Gilgit-Baltistan & AJK	Gilgit Division	2026-01-10 17:05:10.654027
20	Gilgit-Baltistan & AJK	AJK Central	2026-01-10 17:05:10.654027
21	Gilgit-Baltistan & AJK	Baltistan Region	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5334 (class 0 OID 236712)
-- Dependencies: 224
-- Data for Name: specializations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.specializations (id, name, created_at) FROM stdin;
1	General Practitioner	2026-01-07 12:43:07.286119
2	Pediatrics	2026-01-07 12:43:07.286119
3	Cardiology	2026-01-07 12:43:07.286119
4	Dermatology	2026-01-07 12:43:07.286119
5	Gynecology	2026-01-07 12:43:07.286119
6	Orthopedics	2026-01-07 12:43:07.286119
7	ENT	2026-01-07 12:43:07.286119
8	Neurology	2026-01-07 12:43:07.286119
\.


--
-- TOC entry 5348 (class 0 OID 245855)
-- Dependencies: 238
-- Data for Name: superadmins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.superadmins (id, user_id, name, contact, created_at) FROM stdin;
1	1	Muhammad Yasir	+923009999999	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5336 (class 0 OID 245722)
-- Dependencies: 226
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, created_at) FROM stdin;
1	muhammad.yasir	muhammad.yasir@edhi.pk	4e4c56e4a15f89f05c2f4c72613da2a18c9665d4f0d6acce16415eb06f9be776	superadmin	2026-01-10 17:05:10.654027
2	sarim.khan	sarim.khan@edhi.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
3	zainab.ali	zainab.ali@edhi.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
4	omar.farooq	omar.farooq@edhi.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
5	fatima.zahra	fatima.zahra@edhi.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
6	hassan.askari	hassan.askari@edhi.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
7	usman.tariq	usman.tariq@sehat.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
8	ayesha.khan	ayesha.khan@sehat.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
9	hamza.malik	hamza.malik@sehat.pk	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	admin	2026-01-10 17:05:10.654027
10	ahmed.ali	ahmed.ali@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
11	fatima.hassan	fatima.hassan@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
12	hassan.raza	hassan.raza@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
13	sara.khan	sara.khan@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
14	zahra.mirza	zahra.mirza@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
15	bilal.sheikh	bilal.sheikh@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
16	usman.ahmed	usman.ahmed@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
17	nadia.hussain	nadia.hussain@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
18	jamal.khan	jamal.khan@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
19	gul.wareen	gul.wareen@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
20	yar.muhammad	yar.muhammad@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
21	palwasha.khan	palwasha.khan@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
22	ali.baig	ali.baig@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
23	amina.batool	amina.batool@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
24	fareed.shah	fareed.shah@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
25	zainab.bibi	zainab.bibi@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
26	rajesh.kumar	rajesh.kumar@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
27	anita.mahesh	anita.mahesh@doc.pk	c3362e4da49c24d379b72152ae6c99f1fa035f52829dceed715a7bf8bb464b98	doctor	2026-01-10 17:05:10.654027
28	kamran.akmal	kamran.akmal@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
29	sania.mirza	sania.mirza@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
30	shoaib.malik	shoaib.malik@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
31	javed.miandad	javed.miandad@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
32	shahid.afridi	shahid.afridi@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
33	wasim.akram	wasim.akram@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
34	inzamam.ulhaq	inzamam.ulhaq@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
35	younis.khan	younis.khan@recep.pk	5d37ed314cf2b5c8462b52b12cd512e2ac4a180e75598da4f12bfb0dea6d0a67	receptionist	2026-01-10 17:05:10.654027
\.


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 243
-- Name: admin_change_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_change_requests_id_seq', 1, false);


--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 241
-- Name: admin_regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_regions_id_seq', 42, true);


--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 239
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admins_id_seq', 8, true);


--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 253
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointments_id_seq', 300, true);


--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 249
-- Name: availability_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.availability_schedules_id_seq', 90, true);


--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 255
-- Name: bulletins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bulletins_id_seq', 3, true);


--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 231
-- Name: cities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cities_id_seq', 89, true);


--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 233
-- Name: clinics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clinics_id_seq', 8, true);


--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 227
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 3, true);


--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 221
-- Name: doctor_unavailability_admin_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctor_unavailability_admin_notification_id_seq', 1, false);


--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 259
-- Name: doctor_unavailability_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctor_unavailability_notification_id_seq', 1, false);


--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 251
-- Name: doctor_unavailability_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctor_unavailability_requests_id_seq', 1, false);


--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 247
-- Name: doctors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.doctors_id_seq', 18, true);


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 257
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 300, true);


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 219
-- Name: pakistan_regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pakistan_regions_id_seq', 161, true);


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 235
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_seq', 100, true);


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 245
-- Name: receptionists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receptionists_id_seq', 8, true);


--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 229
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 21, true);


--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 223
-- Name: specializations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.specializations_id_seq', 76, true);


--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 237
-- Name: superadmins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.superadmins_id_seq', 1, true);


--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 35, true);


--
-- TOC entry 5111 (class 2606 OID 245938)
-- Name: admin_change_requests admin_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_change_requests
    ADD CONSTRAINT admin_change_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5105 (class 2606 OID 245910)
-- Name: admin_regions admin_regions_admin_id_region_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_regions
    ADD CONSTRAINT admin_regions_admin_id_region_id_key UNIQUE (admin_id, region_id);


--
-- TOC entry 5107 (class 2606 OID 245908)
-- Name: admin_regions admin_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_regions
    ADD CONSTRAINT admin_regions_pkey PRIMARY KEY (id);


--
-- TOC entry 5099 (class 2606 OID 245885)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- TOC entry 5101 (class 2606 OID 245887)
-- Name: admins admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_key UNIQUE (user_id);


--
-- TOC entry 5135 (class 2606 OID 246068)
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- TOC entry 5129 (class 2606 OID 246018)
-- Name: availability_schedules availability_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_schedules
    ADD CONSTRAINT availability_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 5142 (class 2606 OID 246098)
-- Name: bulletins bulletins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulletins
    ADD CONSTRAINT bulletins_pkey PRIMARY KEY (id);


--
-- TOC entry 5074 (class 2606 OID 245790)
-- Name: cities cities_name_region_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_region_id_key UNIQUE (name, region_id);


--
-- TOC entry 5076 (class 2606 OID 245788)
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- TOC entry 5080 (class 2606 OID 245812)
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- TOC entry 5061 (class 2606 OID 245762)
-- Name: companies companies_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_email_key UNIQUE (email);


--
-- TOC entry 5063 (class 2606 OID 245760)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 245764)
-- Name: companies companies_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_registration_number_key UNIQUE (registration_number);


--
-- TOC entry 5042 (class 2606 OID 228359)
-- Name: doctor_unavailability_admin_notification doctor_unavailability_admin_n_admin_id_doctor_id_shift_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_admin_notification
    ADD CONSTRAINT doctor_unavailability_admin_n_admin_id_doctor_id_shift_date_key UNIQUE (admin_id, doctor_id, shift_date, shift_start_time);


--
-- TOC entry 5044 (class 2606 OID 228357)
-- Name: doctor_unavailability_admin_notification doctor_unavailability_admin_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_admin_notification
    ADD CONSTRAINT doctor_unavailability_admin_notification_pkey PRIMARY KEY (id);


--
-- TOC entry 5151 (class 2606 OID 246157)
-- Name: doctor_unavailability_notification doctor_unavailability_notific_doctor_id_shift_date_shift_st_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_notification
    ADD CONSTRAINT doctor_unavailability_notific_doctor_id_shift_date_shift_st_key UNIQUE (doctor_id, shift_date, shift_start_time);


--
-- TOC entry 5153 (class 2606 OID 246155)
-- Name: doctor_unavailability_notification doctor_unavailability_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_notification
    ADD CONSTRAINT doctor_unavailability_notification_pkey PRIMARY KEY (id);


--
-- TOC entry 5133 (class 2606 OID 246041)
-- Name: doctor_unavailability_requests doctor_unavailability_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_requests
    ADD CONSTRAINT doctor_unavailability_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5119 (class 2606 OID 245989)
-- Name: doctors doctors_license_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_license_number_key UNIQUE (license_number);


--
-- TOC entry 5121 (class 2606 OID 245985)
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- TOC entry 5123 (class 2606 OID 245987)
-- Name: doctors doctors_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_key UNIQUE (user_id);


--
-- TOC entry 5149 (class 2606 OID 246121)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5038 (class 2606 OID 91560)
-- Name: pakistan_regions pakistan_regions_city_province_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pakistan_regions
    ADD CONSTRAINT pakistan_regions_city_province_key UNIQUE (city, province);


--
-- TOC entry 5040 (class 2606 OID 91558)
-- Name: pakistan_regions pakistan_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pakistan_regions
    ADD CONSTRAINT pakistan_regions_pkey PRIMARY KEY (id);


--
-- TOC entry 5086 (class 2606 OID 245853)
-- Name: patients patients_cnic_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_cnic_key UNIQUE (cnic);


--
-- TOC entry 5088 (class 2606 OID 245849)
-- Name: patients patients_contact_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_contact_key UNIQUE (contact);


--
-- TOC entry 5090 (class 2606 OID 245851)
-- Name: patients patients_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_email_key UNIQUE (email);


--
-- TOC entry 5092 (class 2606 OID 245847)
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- TOC entry 5115 (class 2606 OID 245956)
-- Name: receptionists receptionists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptionists
    ADD CONSTRAINT receptionists_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 245958)
-- Name: receptionists receptionists_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptionists
    ADD CONSTRAINT receptionists_user_id_key UNIQUE (user_id);


--
-- TOC entry 5070 (class 2606 OID 245775)
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 245777)
-- Name: regions regions_province_sub_region_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_province_sub_region_key UNIQUE (province, sub_region);


--
-- TOC entry 5048 (class 2606 OID 236722)
-- Name: specializations specializations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_name_key UNIQUE (name);


--
-- TOC entry 5050 (class 2606 OID 236720)
-- Name: specializations specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.specializations
    ADD CONSTRAINT specializations_pkey PRIMARY KEY (id);


--
-- TOC entry 5095 (class 2606 OID 245865)
-- Name: superadmins superadmins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superadmins
    ADD CONSTRAINT superadmins_pkey PRIMARY KEY (id);


--
-- TOC entry 5097 (class 2606 OID 245867)
-- Name: superadmins superadmins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superadmins
    ADD CONSTRAINT superadmins_user_id_key UNIQUE (user_id);


--
-- TOC entry 5055 (class 2606 OID 245740)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5057 (class 2606 OID 245736)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5059 (class 2606 OID 245738)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5108 (class 1259 OID 246181)
-- Name: idx_admin_regions_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_regions_admin_id ON public.admin_regions USING btree (admin_id);


--
-- TOC entry 5109 (class 1259 OID 246182)
-- Name: idx_admin_regions_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_regions_region_id ON public.admin_regions USING btree (region_id);


--
-- TOC entry 5102 (class 1259 OID 246180)
-- Name: idx_admins_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_company_id ON public.admins USING btree (company_id);


--
-- TOC entry 5103 (class 1259 OID 246179)
-- Name: idx_admins_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_user_id ON public.admins USING btree (user_id);


--
-- TOC entry 5136 (class 1259 OID 246193)
-- Name: idx_appointments_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_clinic_id ON public.appointments USING btree (clinic_id);


--
-- TOC entry 5137 (class 1259 OID 246195)
-- Name: idx_appointments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_created_at ON public.appointments USING btree (created_at);


--
-- TOC entry 5138 (class 1259 OID 246192)
-- Name: idx_appointments_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_doctor_id ON public.appointments USING btree (doctor_id);


--
-- TOC entry 5139 (class 1259 OID 246191)
-- Name: idx_appointments_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_patient_id ON public.appointments USING btree (patient_id);


--
-- TOC entry 5140 (class 1259 OID 246194)
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- TOC entry 5130 (class 1259 OID 246197)
-- Name: idx_availability_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_availability_day ON public.availability_schedules USING btree (day_of_week);


--
-- TOC entry 5131 (class 1259 OID 246196)
-- Name: idx_availability_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_availability_doctor_id ON public.availability_schedules USING btree (doctor_id);


--
-- TOC entry 5143 (class 1259 OID 246199)
-- Name: idx_bulletins_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bulletins_active ON public.bulletins USING btree (active);


--
-- TOC entry 5144 (class 1259 OID 246198)
-- Name: idx_bulletins_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bulletins_company_id ON public.bulletins USING btree (company_id);


--
-- TOC entry 5077 (class 1259 OID 246174)
-- Name: idx_cities_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cities_name ON public.cities USING btree (name);


--
-- TOC entry 5078 (class 1259 OID 246175)
-- Name: idx_cities_region_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cities_region_id ON public.cities USING btree (region_id);


--
-- TOC entry 5081 (class 1259 OID 246177)
-- Name: idx_clinics_city_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinics_city_id ON public.clinics USING btree (city_id);


--
-- TOC entry 5082 (class 1259 OID 246176)
-- Name: idx_clinics_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinics_company_id ON public.clinics USING btree (company_id);


--
-- TOC entry 5066 (class 1259 OID 246172)
-- Name: idx_companies_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_email ON public.companies USING btree (email);


--
-- TOC entry 5067 (class 1259 OID 246171)
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- TOC entry 5045 (class 1259 OID 228375)
-- Name: idx_doctor_unavail_admin_adminid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_unavail_admin_adminid ON public.doctor_unavailability_admin_notification USING btree (admin_id);


--
-- TOC entry 5046 (class 1259 OID 228376)
-- Name: idx_doctor_unavail_admin_doctorid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_unavail_admin_doctorid ON public.doctor_unavailability_admin_notification USING btree (doctor_id);


--
-- TOC entry 5154 (class 1259 OID 246204)
-- Name: idx_doctor_unavail_notify_admin_notified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_unavail_notify_admin_notified ON public.doctor_unavailability_notification USING btree (admin_notified);


--
-- TOC entry 5155 (class 1259 OID 246203)
-- Name: idx_doctor_unavail_notify_doctor_date_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_unavail_notify_doctor_date_time ON public.doctor_unavailability_notification USING btree (doctor_id, shift_date, shift_start_time);


--
-- TOC entry 5124 (class 1259 OID 246184)
-- Name: idx_doctors_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctors_clinic_id ON public.doctors USING btree (clinic_id);


--
-- TOC entry 5125 (class 1259 OID 246185)
-- Name: idx_doctors_license; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctors_license ON public.doctors USING btree (license_number);


--
-- TOC entry 5126 (class 1259 OID 246186)
-- Name: idx_doctors_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctors_status ON public.doctors USING btree (status);


--
-- TOC entry 5127 (class 1259 OID 246183)
-- Name: idx_doctors_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctors_user_id ON public.doctors USING btree (user_id);


--
-- TOC entry 5145 (class 1259 OID 246202)
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- TOC entry 5146 (class 1259 OID 246201)
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- TOC entry 5147 (class 1259 OID 246200)
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_type, recipient_id);


--
-- TOC entry 5035 (class 1259 OID 91850)
-- Name: idx_pakistan_regions_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pakistan_regions_city ON public.pakistan_regions USING btree (city);


--
-- TOC entry 5036 (class 1259 OID 91851)
-- Name: idx_pakistan_regions_province_subregion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pakistan_regions_province_subregion ON public.pakistan_regions USING btree (province, sub_region);


--
-- TOC entry 5083 (class 1259 OID 246190)
-- Name: idx_patients_cnic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_cnic ON public.patients USING btree (cnic);


--
-- TOC entry 5084 (class 1259 OID 246189)
-- Name: idx_patients_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_contact ON public.patients USING btree (contact);


--
-- TOC entry 5112 (class 1259 OID 246188)
-- Name: idx_receptionists_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receptionists_clinic_id ON public.receptionists USING btree (clinic_id);


--
-- TOC entry 5113 (class 1259 OID 246187)
-- Name: idx_receptionists_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receptionists_user_id ON public.receptionists USING btree (user_id);


--
-- TOC entry 5068 (class 1259 OID 246173)
-- Name: idx_regions_province_subregion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regions_province_subregion ON public.regions USING btree (province, sub_region);


--
-- TOC entry 5093 (class 1259 OID 246178)
-- Name: idx_superadmins_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_superadmins_user_id ON public.superadmins USING btree (user_id);


--
-- TOC entry 5051 (class 1259 OID 246169)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5052 (class 1259 OID 246170)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5053 (class 1259 OID 246168)
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- TOC entry 5164 (class 2606 OID 245939)
-- Name: admin_change_requests admin_change_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_change_requests
    ADD CONSTRAINT admin_change_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- TOC entry 5162 (class 2606 OID 245911)
-- Name: admin_regions admin_regions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_regions
    ADD CONSTRAINT admin_regions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- TOC entry 5163 (class 2606 OID 245916)
-- Name: admin_regions admin_regions_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_regions
    ADD CONSTRAINT admin_regions_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- TOC entry 5160 (class 2606 OID 245893)
-- Name: admins admins_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5161 (class 2606 OID 245888)
-- Name: admins admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 246079)
-- Name: appointments appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 246074)
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 246069)
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 5170 (class 2606 OID 246019)
-- Name: availability_schedules availability_schedules_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_schedules
    ADD CONSTRAINT availability_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- TOC entry 5175 (class 2606 OID 246099)
-- Name: bulletins bulletins_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulletins
    ADD CONSTRAINT bulletins_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5156 (class 2606 OID 245791)
-- Name: cities cities_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 245818)
-- Name: clinics clinics_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- TOC entry 5158 (class 2606 OID 245813)
-- Name: clinics clinics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5180 (class 2606 OID 246158)
-- Name: doctor_unavailability_notification doctor_unavailability_notification_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_notification
    ADD CONSTRAINT doctor_unavailability_notification_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- TOC entry 5181 (class 2606 OID 246163)
-- Name: doctor_unavailability_notification doctor_unavailability_notification_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_notification
    ADD CONSTRAINT doctor_unavailability_notification_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE SET NULL;


--
-- TOC entry 5171 (class 2606 OID 246042)
-- Name: doctor_unavailability_requests doctor_unavailability_requests_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_unavailability_requests
    ADD CONSTRAINT doctor_unavailability_requests_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- TOC entry 5167 (class 2606 OID 245995)
-- Name: doctors doctors_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- TOC entry 5168 (class 2606 OID 246000)
-- Name: doctors doctors_specialization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specializations(id) ON DELETE SET NULL;


--
-- TOC entry 5169 (class 2606 OID 245990)
-- Name: doctors doctors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 246137)
-- Name: notifications notifications_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- TOC entry 5177 (class 2606 OID 246127)
-- Name: notifications notifications_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- TOC entry 5178 (class 2606 OID 246122)
-- Name: notifications notifications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- TOC entry 5179 (class 2606 OID 246132)
-- Name: notifications notifications_receptionist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_receptionist_id_fkey FOREIGN KEY (receptionist_id) REFERENCES public.receptionists(id) ON DELETE CASCADE;


--
-- TOC entry 5165 (class 2606 OID 245964)
-- Name: receptionists receptionists_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptionists
    ADD CONSTRAINT receptionists_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- TOC entry 5166 (class 2606 OID 245959)
-- Name: receptionists receptionists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptionists
    ADD CONSTRAINT receptionists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5159 (class 2606 OID 245868)
-- Name: superadmins superadmins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superadmins
    ADD CONSTRAINT superadmins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-01 22:53:27

--
-- PostgreSQL database dump complete
--

\unrestrict BLK7ZeVtQdOBV42chW2vBucMhF3AXMgZ48TTReNCgHdPLnb9Ty43F74iswqNEvt

