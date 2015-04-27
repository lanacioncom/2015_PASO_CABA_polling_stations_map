##Requirements
_We need to install mdbtools on our mac

##Process
1. Create an empty postgres DB
    $ createdb Argentina2013

2. First generate Postgres schema
    $ mdb-schema mdb/ARGENTINA2013.mdb postgres > schema/schema.sql

3. Alter some tables that have booleans but generate data as integers
    $ psql Argentina2013 -q -f schema/alter.sql

3. Generate each data table as SQL
    $ scripts/generate_table_data.sh

4. Import de tables to the postgres DB
    $ psql Argentina2013 -q -f output/data/Partidos.sql
    $ psql Argentina2013 -q -f output/data/MesasDNacionales.sql
    $ psql Argentina2013 -q -f output/data/MesasSNacionales.sql
    $ psql Argentina2013 -q -f output/data/VotosCandidaturaMesasDNacionales.sql
    $ psql Argentina2013 -q -f output/data/VotosCandidaturaMesasSNacionales.sql  

