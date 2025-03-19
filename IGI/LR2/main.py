from geometric_lib import square
from geometric_lib import circle

print("No validation")
print("Enter number from 1 to 4.\n1. To calculate perimeter of square.\n2. To calculate area of square.\n3. To calculate perimeter of circle\n4. To calculate area of circle")
ind = int(input())
if ind == 1:
    print("Ok. Calculating perimeter of square.\nEnter a.")
    a = float(input())
    print(square.perimeter(a))
elif ind == 2:
    print("Ok. Calculating area of square.\nEnter a.")
    a = float(input())
    print(square.area(a))
elif ind == 3:
    print("Ok. Calculating perimeter of circle.\nEnter R.")
    r = float(input())
    print(circle.perimeter(r))
elif ind == 4:
    print("Ok. Calculating area of circle.\nEnter R.")
    r = float(input())
    print(circle.area(r))
else:
    print("Lol, it is not a number from 1 to 4 :)")
