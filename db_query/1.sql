-- Step 1: Create the database
-- CREATE DATABASE peoplepay360;

-- Step 2: Create a dedicated user
CREATE USER pp360_user WITH ENCRYPTED PASSWORD 'PeoplePay360@2026';

-- Step 3: Grant privileges
GRANT ALL PRIVILEGES ON DATABASE peoplepay360 TO pp360_user;

-- Step 4: Connect to the new database (in pgAdmin, switch to peoplepay360 db, then run):
GRANT ALL ON SCHEMA public TO pp360_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pp360_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pp360_user;
