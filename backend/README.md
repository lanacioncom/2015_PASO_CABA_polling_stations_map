Backend usage
=============

## Requirements
* Have postgreSQL installed locally
* Python 2.7.\* && virtualenv && pip installed 

## Process
1. Create a virtualenv

        $ virtualenv .venv

2. Activate the created virtualenv

        $ source .venv/bin/activate

3. Install dependencies

        $ pip install -r requirements.txt

4. Create an empty postgres DB for results storage

        $ createdb db_name

5. Duplicate the example settings file and update with your DB configuration

6. Run the script to process and load the DB tables

        $ python scripts/process_data_psql.py  

## Implementation notes

* We have used postgres as the DB because our final destination was the cartodb postgis DB and also because of the magic behind [postgres window functions](http://www.postgresql.org/docs/9.4/static/functions-window.html) that we have used to create the margin of victory of a candidate over the next one in a given polling station directly on SQL.

* After our first publication we have detected that there were some polling stations with the "same" name and location but different ids so we ended up generating a common id for those as an auxiliary CSV _'data/maestras/relaciones.csv'_
