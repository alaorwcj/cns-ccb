--
-- PostgreSQL database cluster dump
--

\restrict 9H54KMyVcohVGfeqUrk0iDgThmlrzLqIhX5RWrqiJt8tpVqb3G7FxDjYwGbFu37

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE ccb;
ALTER ROLE ccb WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:7uTAgWZqabNvyIJBJQh7LQ==$+LFtFSI5tjibX5oTlTH8oj96jMXOJmHTMdEep1z1+w4=:cKrPKE1C/F1nM1OHhAtayaA6I3Ln4NPNFhXR0FT/9CY=';

--
-- User Configurations
--








\unrestrict 9H54KMyVcohVGfeqUrk0iDgThmlrzLqIhX5RWrqiJt8tpVqb3G7FxDjYwGbFu37

--
-- PostgreSQL database cluster dump complete
--

