--
-- PostgreSQL database cluster dump
--

\restrict giRuDdwr0hA94MIRoSMH1Z0LlxNQ9yfLA7VHoiPAXw3fAa36ZXlObhW4mwvHtrX

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE ccb;
ALTER ROLE ccb WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:iys3hwLAscSkjqzhpblBvg==$wEcGNHy7ojeBv3QzE39LppxVUD7MTp7TRXLgZX193gs=:kdz8CsGD8NbE1HJfbqfLNk15lbiyb/0rMNi1Nm3pdTo=';

--
-- User Configurations
--








\unrestrict giRuDdwr0hA94MIRoSMH1Z0LlxNQ9yfLA7VHoiPAXw3fAa36ZXlObhW4mwvHtrX

--
-- PostgreSQL database cluster dump complete
--

