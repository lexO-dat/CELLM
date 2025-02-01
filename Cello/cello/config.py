import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LIBRARY_DIR = os.path.abspath(os.path.join(BASE_DIR, 'library'))
VERILOGS_DIR = os.path.join(LIBRARY_DIR, 'verilogs')
CONSTRAINTS_DIR = os.path.join(LIBRARY_DIR, 'constraints')
TEMP_OUTPUTS_DIR = os.path.abspath(os.path.join(BASE_DIR, 'temp_outputs'))

os.makedirs(VERILOGS_DIR, exist_ok=True)
os.makedirs(CONSTRAINTS_DIR, exist_ok=True)
os.makedirs(TEMP_OUTPUTS_DIR, exist_ok=True)
