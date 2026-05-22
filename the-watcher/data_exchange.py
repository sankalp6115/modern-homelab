import numpy as np
from pathlib import Path
 
def data_reader(file):
    data = np.load(file)
    return data

def image_iterator(path): 
    return [p for p in Path(path).rglob("*.png")]
