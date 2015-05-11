import os

DEBUG = os.environ.get('DEBUG', False)
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://username@localhost:5432/dbname')
