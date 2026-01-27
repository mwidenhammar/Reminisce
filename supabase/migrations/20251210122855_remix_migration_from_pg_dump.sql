CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    photo_id uuid,
    title text NOT NULL,
    transcript text NOT NULL,
    audio_url text,
    ai_enhancement text,
    generated_image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    storage_path text NOT NULL,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: memories memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memories
    ADD CONSTRAINT memories_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: memories update_memories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON public.memories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: memories memories_photo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memories
    ADD CONSTRAINT memories_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;


--
-- Name: memories Users can delete their own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own memories" ON public.memories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: photos Users can delete their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own photos" ON public.photos FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: memories Users can insert their own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own memories" ON public.memories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: photos Users can insert their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own photos" ON public.photos FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: memories Users can update their own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own memories" ON public.memories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: memories Users can view their own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memories" ON public.memories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: photos Users can view their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own photos" ON public.photos FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: memories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

--
-- Name: photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


