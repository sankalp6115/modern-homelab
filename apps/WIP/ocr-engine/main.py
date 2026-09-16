import easyocr
reader = easyocr.Reader(['en'])
result = reader.readtext('image.png')
print(result)
