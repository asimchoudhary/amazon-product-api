import requests
from bs4 import BeautifulSoup as bs

link = "https://www.flipkart.com/search?q=iphone15"
url = requests.get(link)
soup = bs(url.content)
print(soup.prettify())